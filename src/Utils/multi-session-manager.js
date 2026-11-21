/* Zahan Baileys maintained distribution. Upstream notices and license are preserved in LICENSE and NOTICE.md. */
import { DisconnectReason } from '../Types/index.js';
import { createSharedGroupMetadataCache, isUsableGroupMetadata } from './group-metadata-cache.js';

export const MULTI_SESSION_DEFAULTS = Object.freeze({
    concurrency: 4,
    autoSaveCreds: true,
    reconnect: true,
    maxReconnectAttempts: 10,
    reconnectBaseDelayMs: 1000,
    reconnectMaxDelayMs: 60000,
    jitter: 0.2
});

const quietLogger = {
    debug() { },
    info() { },
    warn() { },
    error() { },
    trace() { }
};

const positive = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const defaultScheduler = {
    setTimeout: (work, ms) => setTimeout(work, ms),
    clearTimeout: (handle) => clearTimeout(handle)
};

const defaultMakeSocket = async (config) => {
    const { default: makeWASocket } = await import('../Socket/index.js');
    return makeWASocket(config);
};

export const normalizeReconnectOptions = (value) => {
    const source = value === false
        ? { enabled: false }
        : (value && typeof value === 'object' ? value : { enabled: true });
    return {
        enabled: source.enabled !== false,
        maxAttempts: Math.max(0, Math.round(positive(source.maxAttempts ?? source.maxReconnectAttempts, MULTI_SESSION_DEFAULTS.maxReconnectAttempts))),
        baseDelayMs: positive(source.baseDelayMs ?? source.reconnectBaseDelayMs, MULTI_SESSION_DEFAULTS.reconnectBaseDelayMs),
        maxDelayMs: Math.max(1, positive(source.maxDelayMs ?? source.reconnectMaxDelayMs, MULTI_SESSION_DEFAULTS.reconnectMaxDelayMs)),
        jitter: Math.min(1, Math.max(0, positive(source.jitter, MULTI_SESSION_DEFAULTS.jitter)))
    };
};

export const reconnectDelay = (attempt, options = MULTI_SESSION_DEFAULTS, random = Math.random) => {
    const settings = normalizeReconnectOptions(options.enabled === undefined
        ? {
            maxAttempts: options.maxReconnectAttempts,
            baseDelayMs: options.reconnectBaseDelayMs,
            maxDelayMs: options.reconnectMaxDelayMs,
            jitter: options.jitter
        }
        : options);
    const exponential = Math.min(settings.maxDelayMs, settings.baseDelayMs * (2 ** Math.max(0, attempt)));
    const factor = 1 + ((Number(random()) || 0) * 2 - 1) * settings.jitter;
    return Math.max(0, Math.round(exponential * factor));
};

export const createConcurrencyLimiter = (limit = 1) => {
    const max = Math.max(1, Math.round(positive(limit, 1)));
    let active = 0;
    const queue = [];
    const pump = () => {
        while (active < max && queue.length) {
            const task = queue.shift();
            active++;
            Promise.resolve()
                .then(task.work)
                .then(task.resolve, task.reject)
                .finally(() => {
                    active--;
                    pump();
                });
        }
    };
    return {
        schedule: (work) => new Promise((resolve, reject) => {
            queue.push({ work, resolve, reject });
            pump();
        }),
        get active() {
            return active;
        },
        get pending() {
            return queue.length;
        },
        get limit() {
            return max;
        }
    };
};

const statusCodeOf = (update) => {
    const error = update?.lastDisconnect?.error;
    return error?.output?.statusCode
        ?? error?.statusCode
        ?? error?.data?.statusCode
        ?? update?.statusCode
        ?? undefined;
};

const resolveSaveCreds = (config) => {
    const candidates = [
        config?.saveCreds,
        config?.auth?.saveCreds,
        config?.auth?.state?.saveCreds,
        config?.authState?.saveCreds,
        config?.state?.saveCreds
    ];
    return candidates.find(candidate => typeof candidate === 'function');
};

const removeListener = (ev, event, handler) => {
    if (!ev) {
        return;
    }
    if (typeof ev.off === 'function') {
        ev.off(event, handler);
    }
    else if (typeof ev.removeListener === 'function') {
        ev.removeListener(event, handler);
    }
};

export const makeMultiSessionManager = (options = {}) => {
    const {
        makeSocket = defaultMakeSocket,
        defaults = {},
        logger = quietLogger,
        scheduler = defaultScheduler,
        random = Math.random,
        now = Date.now,
        hooks = {}
    } = options;
    if (typeof makeSocket !== 'function') {
        throw new TypeError('makeMultiSessionManager needs a makeSocket function');
    }
    const log = logger ?? quietLogger;
    const concurrency = Math.max(1, Math.round(positive(options.concurrency ?? MULTI_SESSION_DEFAULTS.concurrency, MULTI_SESSION_DEFAULTS.concurrency)));
    const reconnectSettings = normalizeReconnectOptions(options.reconnect ?? MULTI_SESSION_DEFAULTS.reconnect);
    const autoSaveCreds = options.autoSaveCreds !== false;
    const limiter = createConcurrencyLimiter(concurrency);
    const recoveryLimiter = createConcurrencyLimiter(concurrency);
    const groupCacheOptions = options.groupMetadataCache === false
        ? null
        : (options.groupMetadataCache && typeof options.groupMetadataCache === 'object'
            ? options.groupMetadataCache
            : {});
    const groupMetadataCache = groupCacheOptions
        ? createSharedGroupMetadataCache({ ...groupCacheOptions, now })
        : null;
    const sessions = new Map();
    const subscriptions = new Set();
    const counters = {
        added: 0,
        removed: 0,
        started: 0,
        stopped: 0,
        reconnects: 0,
        failures: 0,
        loggedOut: 0,
        credsSaves: 0,
        recoveries: 0
    };
    let shuttingDown = false;

    const reportError = (id, error, phase) => {
        counters.failures++;
        log.warn({ id, phase, error: error?.message ?? String(error) }, 'multi-session error');
        try {
            hooks.onError?.(id, error, phase);
        }
        catch {
        }
    };

    const invalidateGroupJid = (jid) => {
        if (!groupMetadataCache || typeof jid !== 'string' || !jid) {
            return false;
        }
        return groupMetadataCache.invalidate(jid);
    };

    const applyGroupCacheUpdate = (payload) => {
        if (!groupMetadataCache) {
            return;
        }
        const updates = Array.isArray(payload) ? payload : [payload];
        for (const update of updates) {
            const jid = update?.id;
            if (typeof jid !== 'string' || !jid) {
                continue;
            }
            if (isUsableGroupMetadata(update)) {
                groupMetadataCache.set(jid, update);
            }
            else {
                groupMetadataCache.invalidate(jid);
            }
        }
    };

    const descriptor = (entry) => ({
        id: entry.id,
        state: entry.state,
        connected: !!entry.sock && entry.state === 'open',
        attempts: entry.attempts,
        user: entry.sock?.user?.id ?? entry.sock?.authState?.creds?.me?.id,
        startedAt: entry.startedAt,
        openedAt: entry.openedAt,
        lastCloseAt: entry.lastCloseAt,
        lastStatusCode: entry.lastStatusCode,
        queued: limiter.pending,
        socket: entry.sock
    });

    const detach = (entry) => {
        const sock = entry.sock;
        for (const [event, handler] of entry.listeners) {
            removeListener(sock?.ev, event, handler);
        }
        entry.listeners = [];
    };

    const clearTimer = (entry) => {
        if (entry.timer !== undefined && entry.timer !== null) {
            scheduler.clearTimeout(entry.timer);
            entry.timer = undefined;
        }
    };

    const scheduleReconnect = (entry) => {
        if (!reconnectSettings.enabled || shuttingDown || !entry.active) {
            return;
        }
        entry.attempts++;
        if (entry.attempts > reconnectSettings.maxAttempts) {
            entry.state = 'failed';
            reportError(entry.id, new Error(`gave up reconnecting after ${entry.attempts - 1} attempts`), 'reconnect');
            return;
        }
        const delay = reconnectDelay(entry.attempts - 1, reconnectSettings, random);
        entry.state = 'reconnecting';
        counters.reconnects++;
        clearTimer(entry);
        entry.timer = scheduler.setTimeout(() => {
            entry.timer = undefined;
            if (shuttingDown || !entry.active) {
                return;
            }
            start(entry.id).catch(error => {
                reportError(entry.id, error, 'reconnect-start');
                if (!shuttingDown && entry.active && entry.state === 'failed') {
                    scheduleReconnect(entry);
                }
            });
        }, delay);
    };

    const attach = (entry, sock, config, generation) => {
        const listen = (event, handler) => {
            if (typeof sock.ev?.on !== 'function') {
                return;
            }
            sock.ev.on(event, handler);
            entry.listeners.push([event, handler]);
        };
        const isCurrent = () => entry.generation === generation && entry.sock === sock && !shuttingDown;
        const saveCreds = autoSaveCreds ? resolveSaveCreds(config) : undefined;
        if (saveCreds) {
            listen('creds.update', () => {
                if (!isCurrent()) {
                    return;
                }
                counters.credsSaves++;
                entry.saveChain = entry.saveChain
                    .then(() => saveCreds())
                    .catch(error => reportError(entry.id, error, 'creds.update'));
            });
        }
        listen('connection.update', (update) => {
            if (!isCurrent()) {
                return;
            }
            const connection = update?.connection;
            if (connection === 'open') {
                entry.state = 'open';
                entry.attempts = 0;
                entry.openedAt = now();
                try {
                    hooks.onOpen?.(entry.id, update);
                }
                catch {
                }
            }
            else if (connection === 'close') {
                const statusCode = statusCodeOf(update);
                entry.lastCloseAt = now();
                entry.lastStatusCode = statusCode;
                const loggedOut = statusCode === DisconnectReason.loggedOut
                    || statusCode === 401
                    || statusCode === 403
                    || statusCode === 419;
                detach(entry);
                entry.sock = null;
                entry.state = loggedOut ? 'loggedOut' : 'closed';
                if (loggedOut) {
                    counters.loggedOut++;
                }
                try {
                    hooks.onClose?.(entry.id, { ...update, statusCode, loggedOut });
                }
                catch {
                }
                if (!loggedOut) {
                    scheduleReconnect(entry);
                }
            }
            try {
                hooks.onConnectionUpdate?.(entry.id, update);
            }
            catch {
            }
        });
        listen('session.recovery', (payload) => {
            if (!isCurrent()) {
                return;
            }
            counters.recoveries += Array.isArray(payload?.results) ? payload.results.length : 1;
            try {
                hooks.onRecovery?.(entry.id, payload);
            }
            catch {
            }
        });
        if (groupMetadataCache) {
            listen('groups.upsert', applyGroupCacheUpdate);
            listen('groups.update', applyGroupCacheUpdate);
            listen('group-participants.update', (payload) => invalidateGroupJid(payload?.id));
            listen('group.join-request', (payload) => invalidateGroupJid(payload?.id));
        }
        for (const subscription of subscriptions) {
            listen(subscription.event, subscriptionListener(entry, subscription, generation));
        }
    };

    const subscriptionListener = (entry, subscription, generation) => {
        const listener = (payload) => {
            if (entry.generation !== generation || !entry.sock || shuttingDown) {
                return;
            }
            try {
                subscription.handler(entry.id, payload);
            }
            catch (error) {
                reportError(entry.id, error, `event:${subscription.event}`);
            }
        };
        listener.__subscription = subscription;
        return listener;
    };

    const start = async (id) => {
        const entry = sessions.get(id);
        if (!entry) {
            throw new Error(`session "${id}" is not registered`);
        }
        if (shuttingDown) {
            throw new Error('session manager is shutting down');
        }
        if (entry.startPromise) {
            return entry.startPromise;
        }
        if (entry.sock) {
            return entry.sock;
        }
        entry.active = true;
        entry.state = 'starting';
        const generation = ++entry.generation;
        const pendingStart = limiter.schedule(async () => {
            if (shuttingDown || entry.generation !== generation || !entry.active) {
                throw new Error(`session "${id}" was stopped before it started`);
            }
            const sessionLogger = entry.config.logger
                ?? defaults.logger
                ?? (typeof log.child === 'function' ? log.child({ session: id }) : log);
            const sessionConfig = { ...defaults, ...entry.config, logger: sessionLogger };
            if (sessionConfig.sessionRecovery === undefined) {
                sessionConfig.sessionRecovery = { autoRecoverMacErrors: true };
            }
            const userCachedGroupMetadata = typeof sessionConfig.cachedGroupMetadata === 'function'
                ? sessionConfig.cachedGroupMetadata
                : undefined;
            const rawGroupMetadata = { current: undefined };
            if (groupMetadataCache) {
                sessionConfig.cachedGroupMetadata = async (jid) => {
                    if (userCachedGroupMetadata) {
                        try {
                            const userCached = await userCachedGroupMetadata(jid);
                            if (isUsableGroupMetadata(userCached)) {
                                groupMetadataCache.set(jid, userCached);
                                return userCached;
                            }
                        }
                        catch (error) {
                            reportError(id, error, 'cachedGroupMetadata');
                        }
                    }
                    if (!rawGroupMetadata.current) {
                        return undefined;
                    }
                    const fetchMetadata = () => rawGroupMetadata.current(jid);
                    const cached = await groupMetadataCache.get(jid, fetchMetadata);
                    if (isUsableGroupMetadata(cached)) {
                        return cached;
                    }
                    return fetchMetadata();
                };
            }
            const sock = await makeSocket(sessionConfig);
            if (!sock || typeof sock.ev?.on !== 'function') {
                throw new TypeError(`makeSocket did not return a socket for session "${id}"`);
            }
            rawGroupMetadata.current = typeof sock.groupMetadata === 'function'
                ? sock.groupMetadata.bind(sock)
                : undefined;
            if (groupMetadataCache && rawGroupMetadata.current) {
                const raw = rawGroupMetadata.current;
                try {
                    Object.defineProperty(sock, 'groupMetadata', {
                        value: async (jid) => {
                            const cached = await groupMetadataCache.get(jid, () => raw(jid));
                            return isUsableGroupMetadata(cached) ? cached : raw(jid);
                        },
                        configurable: true,
                        writable: true
                    });
                }
                catch (error) {
                    reportError(id, error, 'groupMetadataCache');
                }
            }
            if (shuttingDown || entry.generation !== generation || !entry.active) {
                await sock.end?.(new Error('session stopped before connection')).catch(() => undefined);
                return sock;
            }
            entry.sock = sock;
            entry.state = 'connecting';
            entry.startedAt = now();
            counters.started++;
            attach(entry, sock, sessionConfig, generation);
            return sock;
        });
        entry.startPromise = pendingStart;
        try {
            return await pendingStart;
        }
        catch (error) {
            if (entry.generation === generation) {
                entry.state = 'failed';
                reportError(id, error, 'start');
            }
            throw error;
        }
        finally {
            if (entry.startPromise === pendingStart) {
                entry.startPromise = undefined;
            }
        }
    };

    const stop = async (id) => {
        const entry = sessions.get(id);
        if (!entry) {
            return false;
        }
        clearTimer(entry);
        entry.generation++;
        entry.active = false;
        const sock = entry.sock;
        detach(entry);
        entry.sock = null;
        entry.state = 'stopped';
        entry.startPromise = undefined;
        counters.stopped++;
        if (sock && typeof sock.end === 'function') {
            try {
                await sock.end(new Error('session stopped'));
            }
            catch (error) {
                reportError(id, error, 'stop');
            }
        }
        return true;
    };

    const add = async (id, config = {}, options = {}) => {
        if (typeof id !== 'string' || !id.trim()) {
            throw new TypeError('a session id must be a non-empty string');
        }
        if (sessions.has(id)) {
            throw new Error(`session "${id}" is already registered`);
        }
        if (shuttingDown) {
            throw new Error('session manager is shutting down');
        }
        const entry = {
            id,
            config,
            sock: null,
            state: 'idle',
            active: true,
            generation: 0,
            attempts: 0,
            listeners: [],
            timer: undefined,
            startPromise: undefined,
            saveChain: Promise.resolve(),
            startedAt: undefined,
            openedAt: undefined,
            lastCloseAt: undefined,
            lastStatusCode: undefined
        };
        sessions.set(id, entry);
        counters.added++;
        if (options.start === false) {
            return descriptor(entry);
        }
        return start(id);
    };

    const remove = async (id) => {
        const existed = await stop(id);
        if (sessions.delete(id)) {
            counters.removed++;
        }
        return existed;
    };

    const restart = async (id) => {
        await stop(id);
        const entry = sessions.get(id);
        if (entry) {
            entry.attempts = 0;
        }
        return start(id);
    };

    const recover = async (id, jid, request = {}) => {
        const sock = sessions.get(id)?.sock;
        if (!sock) {
            return null;
        }
        if (typeof sock.recoverSession !== 'function') {
            throw new Error(`socket for session "${id}" does not expose recoverSession`);
        }
        return sock.recoverSession(jid, request);
    };

    const recoverAll = async (jids = [], request = {}) => {
        const targets = Array.isArray(jids) ? jids.filter(Boolean) : [];
        const active = [...sessions.values()].filter(entry => entry.sock);
        return Promise.all(active.map(entry => recoveryLimiter.schedule(async () => {
            const sock = entry.sock;
            try {
                if (!targets.length) {
                    return { id: entry.id, results: [] };
                }
                if (targets.length > 1 && typeof sock.recoverSessions === 'function') {
                    const batch = await sock.recoverSessions(targets, request);
                    counters.recoveries += batch?.results?.length ?? 0;
                    return { id: entry.id, results: batch?.results ?? [] };
                }
                const results = await Promise.all(targets.map(jid => sock.recoverSession(jid, request)));
                counters.recoveries += results.length;
                return { id: entry.id, results };
            }
            catch (error) {
                reportError(entry.id, error, 'recoverAll');
                return { id: entry.id, error: error?.message ?? String(error), results: [] };
            }
        })));
    };

    const on = (event, handler) => {
        if (typeof event !== 'string' || typeof handler !== 'function') {
            throw new TypeError('on needs an event name and a handler');
        }
        const subscription = { event, handler };
        subscriptions.add(subscription);
        for (const entry of sessions.values()) {
            if (entry.sock && typeof entry.sock.ev?.on === 'function') {
                const listener = subscriptionListener(entry, subscription, entry.generation);
                entry.sock.ev.on(event, listener);
                entry.listeners.push([event, listener]);
            }
        }
        return () => {
            subscriptions.delete(subscription);
            for (const entry of sessions.values()) {
                if (!entry.sock) {
                    continue;
                }
                for (let index = entry.listeners.length - 1; index >= 0; index--) {
                    const [name, listener] = entry.listeners[index];
                    if (name === event && listener.__subscription === subscription) {
                        removeListener(entry.sock.ev, event, listener);
                        entry.listeners.splice(index, 1);
                    }
                }
            }
        };
    };

    const shutdown = async () => {
        shuttingDown = true;
        await Promise.all([...sessions.keys()].map(id => stop(id)));
        groupMetadataCache?.clear();
    };

    const stats = () => {
        const byState = {};
        let connected = 0;
        for (const entry of sessions.values()) {
            byState[entry.state] = (byState[entry.state] || 0) + 1;
            if (entry.state === 'open') {
                connected++;
            }
        }
        return {
            ...counters,
            sessions: sessions.size,
            connected,
            byState,
            shuttingDown,
            limiter: { active: limiter.active, pending: limiter.pending, limit: limiter.limit },
            reconnect: { ...reconnectSettings },
            groupMetadataCache: groupMetadataCache?.stats() ?? null
        };
    };

    return {
        add,
        start,
        stop,
        restart,
        remove,
        get: (id) => {
            const entry = sessions.get(id);
            return entry ? descriptor(entry) : undefined;
        },
        socket: (id) => sessions.get(id)?.sock ?? undefined,
        list: () => [...sessions.values()].map(descriptor),
        on,
        recover,
        recoverAll,
        invalidateGroupMetadata: (jid) => invalidateGroupJid(jid),
        stats,
        shutdown
    };
};
