/* Zahan Baileys maintained distribution. Upstream notices and license are preserved in LICENSE and NOTICE.md. */
import { isMacErrorCode, isSessionRecoveryErrorCode, parseRetryErrorCode, RetryReason } from './message-retry-manager.js';
import { jidDecode, jidEncode } from '../WABinary/index.js';

export const SESSION_RECOVERY_DEFAULTS = Object.freeze({
    enabled: true,
    autoRecoverMacErrors: true,
    purgeRelatedSessions: true,
    refreshSessions: true,
    purgeSenderKeys: true,
    purgeIdentityKeys: false,
    emitEvents: true,
    cooldownMs: 1500,
    maxRefreshJids: 32
});

const MAC_ERROR_TEXT = /bad[\s_-]*mac|invalid[\s_-]*mac|mac[\s_-]*verification|message[\s_-]*mac|invalid[\s_-]*message|bad[\s_-]*message/i;

const quietLogger = {
    debug() { },
    info() { },
    warn() { },
    error() { },
    trace() { }
};

const USER_SERVERS = new Set(['s.whatsapp.net', 'c.us', 'lid', 'hosted', 'hosted.lid']);

const userOf = (jid) => String(jid ?? '').split('@')[0].split(':')[0];

const asPositiveNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

export const normalizeSessionRecovery = (value) => {
    if (value === false) {
        return { ...SESSION_RECOVERY_DEFAULTS, enabled: false, autoRecoverMacErrors: false };
    }
    const source = value && typeof value === 'object' ? value : {};
    const normalized = { ...SESSION_RECOVERY_DEFAULTS };
    for (const [key, defaultValue] of Object.entries(SESSION_RECOVERY_DEFAULTS)) {
        if (source[key] === undefined) {
            continue;
        }
        normalized[key] = typeof defaultValue === 'boolean' ? Boolean(source[key]) : asPositiveNumber(source[key], defaultValue);
    }
    normalized.maxRefreshJids = Math.max(1, Math.round(normalized.maxRefreshJids));
    if (!normalized.enabled) {
        normalized.autoRecoverMacErrors = false;
    }
    return normalized;
};

export const isMacErrorText = (value) => typeof value === 'string' && MAC_ERROR_TEXT.test(value);

const collectErrorValues = (input, depth = 0) => {
    if (input === undefined || input === null || depth > 3) {
        return [];
    }
    if (typeof input === 'string' || typeof input === 'number') {
        return [input];
    }
    if (Array.isArray(input)) {
        return input.slice(0, 12).flatMap(item => collectErrorValues(item, depth + 1));
    }
    if (input instanceof Error) {
        return [input.message, input.name].filter(Boolean);
    }
    if (typeof input !== 'object') {
        return [];
    }
    const values = [];
    for (const key of ['error', 'errorCode', 'code', 'reason', 'message', 'messageStubParameters', 'stubParameters', 'description']) {
        if (input[key] !== undefined && input[key] !== null) {
            values.push(...collectErrorValues(input[key], depth + 1));
        }
    }
    if (input.attrs && typeof input.attrs === 'object') {
        values.push(...collectErrorValues(input.attrs.error, depth + 1));
    }
    return values.slice(0, 32);
};

export const classifyRetryError = (input) => {
    const values = collectErrorValues(input);
    let code;
    for (const value of values) {
        const parsed = parseRetryErrorCode(value);
        if (parsed !== undefined) {
            code = parsed;
            break;
        }
    }
    const textMatch = values.some(value => isMacErrorText(value));
    const isMac = textMatch || isMacErrorCode(code);
    const recoverable = isMac || isSessionRecoveryErrorCode(code);
    const reason = code !== undefined
        ? RetryReason[code]
        : textMatch ? 'BadMacText' : undefined;
    return { code, isMac, recoverable, reason };
};

const readCounterpart = async (keys, decoded, signalRepository) => {
    const isLid = decoded.server === 'lid' || decoded.server === 'hosted.lid';
    const isHosted = decoded.server === 'hosted' || decoded.server === 'hosted.lid';
    let mapped;
    if (keys && typeof keys.get === 'function') {
        const ids = [decoded.user, `${decoded.user}_reverse`];
        const stored = await Promise.resolve(keys.get('lid-mapping', ids)).catch(() => ({}));
        mapped = stored?.[decoded.user] ?? stored?.[`${decoded.user}_reverse`];
    }
    if (!mapped) {
        const cache = signalRepository?.lidMapping?.mappingCache;
        if (typeof cache?.get === 'function') {
            mapped = cache.get(`${isLid ? 'lid' : 'pn'}:${decoded.user}`);
        }
    }
    if (typeof mapped !== 'string' && typeof mapped !== 'number') {
        return undefined;
    }
    const user = String(mapped).split('@')[0].split(':')[0];
    if (!user || user === decoded.user) {
        return undefined;
    }
    const server = isLid
        ? (isHosted ? 'hosted' : 's.whatsapp.net')
        : (isHosted ? 'hosted.lid' : 'lid');
    return { user, server };
};

const readDeviceIds = async (keys, users) => {
    const devices = new Set(['0']);
    if (!keys || typeof keys.get !== 'function') {
        return [...devices];
    }
    const stored = await Promise.resolve(keys.get('device-list', users)).catch(() => ({}));
    for (const value of Object.values(stored ?? {})) {
        if (Array.isArray(value)) {
            for (const device of value) {
                devices.add(String(device ?? 0));
            }
        }
        else if (value !== undefined && value !== null) {
            devices.add(String(value));
        }
    }
    return [...devices].slice(0, 64);
};

const storedAddressMatches = (address, users) => {
    const signalUser = String(address).split('.')[0];
    const separator = signalUser.lastIndexOf('_');
    const user = separator === -1 ? signalUser : signalUser.slice(0, separator);
    return users.includes(user);
};

export const collectRecoveryTargets = async ({ jid, keys, listingKeys, signalRepository, groupJid, purgeRelatedSessions = true, maxRefreshJids = 32 }) => {
    const decoded = jidDecode(jid);
    const result = { jid, user: decoded?.user, users: [], jids: [], addresses: [], senderKeyIds: [], refreshJids: [], groupJid };
    if (!decoded?.user || !USER_SERVERS.has(decoded.server)) {
        return result;
    }
    const identities = [{ user: decoded.user, server: decoded.server }];
    result.users.push(decoded.user);
    if (purgeRelatedSessions) {
        const counterpart = await readCounterpart(keys, decoded, signalRepository);
        if (counterpart) {
            identities.push(counterpart);
            result.users.push(counterpart.user);
        }
    }
    const devices = await readDeviceIds(keys, result.users);
    const jids = new Set([jid]);
    for (const identity of identities) {
        jids.add(jidEncode(identity.user, identity.server));
        for (const device of devices) {
            const deviceId = Number(device) || 0;
            const server = deviceId === 99 && identity.server === 's.whatsapp.net' ? 'hosted' : identity.server;
            jids.add(jidEncode(identity.user, server, deviceId));
        }
    }
    result.jids = [...jids];
    const addresses = new Set();
    const toAddress = typeof signalRepository?.jidToSignalProtocolAddress === 'function'
        ? signalRepository.jidToSignalProtocolAddress.bind(signalRepository)
        : undefined;
    if (toAddress) {
        for (const candidate of jids) {
            try {
                addresses.add(String(toAddress(candidate)));
            }
            catch {
            }
        }
    }
    const listing = listingKeys ?? keys;
    if (typeof listing?.list === 'function') {
        const stored = await Promise.resolve(listing.list('session')).catch(() => []);
        for (const address of stored ?? []) {
            if (storedAddressMatches(address, result.users)) {
                addresses.add(String(address));
            }
        }
    }
    result.addresses = [...addresses];
    if (groupJid && typeof listing?.list === 'function') {
        const stored = await Promise.resolve(listing.list('sender-key')).catch(() => []);
        const prefix = `${groupJid}::`;
        result.senderKeyIds = (stored ?? []).map(String).filter(id => id.startsWith(prefix));
    }
    const lidJids = result.jids.filter(candidate => candidate.endsWith('@lid') || candidate.endsWith('@hosted.lid'));
    result.refreshJids = (lidJids.length ? lidJids : result.jids)
        .filter(candidate => !candidate.endsWith('@g.us'))
        .slice(0, Math.max(1, maxRefreshJids));
    return result;
};

export const makeSessionRecovery = ({ keys, listingKeys, signalRepository, assertSessions, messageRetryManager, userDevicesCache, ev, logger, options }) => {
    const settings = normalizeSessionRecovery(options);
    const log = logger ?? quietLogger;
    const inFlight = new Map();
    const counters = {
        requests: 0,
        recoveries: 0,
        coalesced: 0,
        skipped: 0,
        failures: 0,
        purgedSessions: 0,
        purgedSenderKeys: 0,
        purgedIdentityKeys: 0,
        refreshed: 0,
        retryStateResets: 0,
        lastAt: undefined,
        lastReason: undefined,
        byCode: {}
    };
    const keyOf = (jid) => userOf(jid) || String(jid);

    const snapshot = () => ({ ...counters, byCode: { ...counters.byCode } });

    const runBatch = async (jids, request) => {
        const startedAt = Date.now();
        const merged = { ...settings, ...(request.effective ?? {}) };
        const targets = await Promise.all(jids.map(jid => collectRecoveryTargets({
            jid,
            keys,
            listingKeys,
            signalRepository,
            groupJid: request.groupJid,
            purgeRelatedSessions: merged.purgeRelatedSessions,
            maxRefreshJids: merged.maxRefreshJids
        })));
        const writes = {};
        const sessionWrites = {};
        const senderKeyWrites = {};
        const identityWrites = {};
        const memoryWrites = {};
        for (const target of targets) {
            for (const address of target.addresses) {
                sessionWrites[address] = null;
                if (merged.purgeIdentityKeys) {
                    identityWrites[address] = null;
                }
            }
            if (merged.purgeSenderKeys) {
                for (const id of target.senderKeyIds) {
                    senderKeyWrites[id] = null;
                }
                if (target.groupJid) {
                    memoryWrites[target.groupJid] = null;
                }
            }
        }
        if (Object.keys(sessionWrites).length) {
            writes.session = sessionWrites;
        }
        if (Object.keys(senderKeyWrites).length) {
            writes['sender-key'] = senderKeyWrites;
        }
        if (Object.keys(identityWrites).length) {
            writes['identity-key'] = identityWrites;
        }
        if (Object.keys(memoryWrites).length) {
            writes['sender-key-memory'] = memoryWrites;
        }
        if (Object.keys(writes).length) {
            await keys.set(writes);
        }
        const resets = new Map();
        let totalResets = 0;
        for (const target of targets) {
            let removed = 0;
            if (messageRetryManager && typeof messageRetryManager.resetJid === 'function') {
                removed = messageRetryManager.resetJid(target.jid, {
                    users: target.users,
                    addresses: target.addresses
                });
            }
            resets.set(target.jid, removed);
            totalResets += removed;
            if (typeof userDevicesCache?.del === 'function' && target.users.length) {
                userDevicesCache.del(target.users);
            }
        }
        let refreshed = false;
        const refreshJids = [...new Set(targets.flatMap(target => target.refreshJids))]
            .slice(0, merged.maxRefreshJids);
        if (merged.refreshSessions && typeof assertSessions === 'function' && refreshJids.length) {
            try {
                await assertSessions(refreshJids, true);
                refreshed = true;
            }
            catch (error) {
                log.warn({ error: error?.message, jids: jids.length }, 'session recovery purged keys but could not fetch fresh bundles');
            }
        }
        const results = new Map();
        for (const target of targets) {
            results.set(target.jid, {
                jid: target.jid,
                user: target.user,
                code: request.code,
                reason: request.reason,
                recovered: target.addresses.length > 0,
                purged: {
                    sessions: target.addresses,
                    senderKeys: merged.purgeSenderKeys ? target.senderKeyIds : [],
                    senderKeyMemory: merged.purgeSenderKeys && target.groupJid ? [target.groupJid] : [],
                    identityKeys: merged.purgeIdentityKeys ? target.addresses : []
                },
                users: target.users,
                resetMessages: resets.get(target.jid) ?? 0,
                refreshed,
                durationMs: Date.now() - startedAt,
                coalesced: false
            });
        }
        const purgedSessions = Object.keys(sessionWrites).length;
        const purgedSenderKeys = Object.keys(senderKeyWrites).length + Object.keys(memoryWrites).length;
        const purgedIdentityKeys = Object.keys(identityWrites).length;
        counters.recoveries += targets.length;
        counters.purgedSessions += purgedSessions;
        counters.purgedSenderKeys += purgedSenderKeys;
        counters.purgedIdentityKeys += purgedIdentityKeys;
        counters.retryStateResets += totalResets;
        counters.refreshed += refreshed ? 1 : 0;
        counters.lastAt = Date.now();
        counters.lastReason = request.reason;
        if (request.code !== undefined) {
            const label = RetryReason[request.code] ?? String(request.code);
            counters.byCode[label] = (counters.byCode[label] || 0) + 1;
        }
        if (merged.emitEvents && typeof ev?.emit === 'function') {
            try {
                ev.emit('session.recovery', {
                    jids,
                    code: request.code,
                    reason: request.reason,
                    results: [...results.values()],
                    purgedSessions,
                    purgedSenderKeys,
                    refreshed
                });
            }
            catch {
            }
        }
        return results;
    };

    const lastRecovery = new Map();

    const effectiveSettings = (request) => {
        const merged = { ...settings };
        const overrides = [request, request.settings];
        for (const source of overrides) {
            if (!source || typeof source !== 'object') {
                continue;
            }
            for (const key of Object.keys(SESSION_RECOVERY_DEFAULTS)) {
                const value = source[key];
                if (value === undefined) {
                    continue;
                }
                merged[key] = typeof settings[key] === 'boolean'
                    ? Boolean(value)
                    : asPositiveNumber(value, settings[key]);
            }
        }
        merged.maxRefreshJids = Math.max(1, Math.round(merged.maxRefreshJids));
        return merged;
    };

    const recoverMany = async (jids, request = {}) => {
        const unique = [...new Set((Array.isArray(jids) ? jids : [jids]).filter(Boolean).map(String))];
        counters.requests += unique.length;
        if (!unique.length) {
            return { results: [], summary: snapshot() };
        }
        const merged = effectiveSettings(request);
        if (!merged.enabled && !request.force) {
            counters.skipped += unique.length;
            return {
                results: unique.map(jid => ({ jid, recovered: false, skipped: 'disabled', refreshed: false, reason: request.reason })),
                summary: snapshot()
            };
        }
        const now = Date.now();
        const results = new Map();
        const candidates = [];
        for (const jid of unique) {
            const key = keyOf(jid);
            const previous = lastRecovery.get(key);
            if (!request.force && request.auto && merged.cooldownMs > 0 && previous !== undefined && now - previous < merged.cooldownMs) {
                counters.skipped++;
                results.set(jid, { jid, recovered: false, skipped: 'cooldown', refreshed: false, reason: request.reason });
                continue;
            }
            candidates.push({ jid, key });
        }
        const pending = [];
        const waiting = [];
        for (const entry of candidates) {
            const existing = inFlight.get(entry.key);
            if (existing) {
                waiting.push({ ...entry, promise: existing });
            }
            else {
                pending.push(entry);
            }
        }
        let batchPromise;
        if (pending.length) {
            batchPromise = runBatch(pending.map(entry => entry.jid), {
                code: request.code,
                reason: request.reason ?? 'manual',
                groupJid: request.groupJid,
                effective: merged
            });
            for (const entry of pending) {
                inFlight.set(entry.key, batchPromise);
            }
            batchPromise.catch(() => { }).finally(() => {
                for (const entry of pending) {
                    if (inFlight.get(entry.key) === batchPromise) {
                        inFlight.delete(entry.key);
                    }
                }
            });
        }
        if (batchPromise) {
            try {
                const batch = await batchPromise;
                for (const [jid, result] of batch) {
                    results.set(jid, result);
                }
                const completedAt = Date.now();
                for (const entry of pending) {
                    lastRecovery.set(entry.key, completedAt);
                }
                if (lastRecovery.size > 4096) {
                    lastRecovery.clear();
                }
            }
            catch (error) {
                counters.failures += pending.length;
                log.warn({ error: error?.message, jids: pending.length }, 'session recovery failed');
                for (const entry of pending) {
                    results.set(entry.jid, {
                        jid: entry.jid,
                        recovered: false,
                        skipped: 'error',
                        error: error?.message,
                        refreshed: false
                    });
                }
            }
        }
        for (const entry of waiting) {
            try {
                const batch = await entry.promise;
                const found = batch.get(entry.jid) ?? [...batch.values()][0];
                counters.coalesced++;
                results.set(entry.jid, found
                    ? { ...found, jid: entry.jid, coalesced: true }
                    : { jid: entry.jid, recovered: false, skipped: 'coalesced', refreshed: false });
            }
            catch (error) {
                results.set(entry.jid, {
                    jid: entry.jid,
                    recovered: false,
                    skipped: 'error',
                    error: error?.message,
                    refreshed: false
                });
            }
        }
        return { results: unique.map(jid => results.get(jid)), summary: snapshot() };
    };

    const recover = async (jid, request = {}) => (await recoverMany([jid], request)).results[0];

    return {
        settings,
        recover,
        recoverMany,
        stats: snapshot,
        clear() {
            inFlight.clear();
            lastRecovery.clear();
            for (const key of Object.keys(counters)) {
                if (typeof counters[key] === 'number') {
                    counters[key] = 0;
                }
            }
            counters.lastAt = undefined;
            counters.lastReason = undefined;
            counters.byCode = {};
        },
        close() {
            inFlight.clear();
            lastRecovery.clear();
        }
    };
};
