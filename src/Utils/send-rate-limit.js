/* Zahan Baileys maintained distribution. Upstream notices and license are preserved in LICENSE and NOTICE.md. */
import { Boom } from '@hapi/boom';

export const SEND_RATE_LIMIT_DEFAULTS = Object.freeze({
    perChatMs: 1500,
    burst: 3,
    jitter: 250,
    maxQueue: 200,
    simulateTyping: false,
    typingMs: 700,
    typingJitter: 500
});

export const normalizeSendRateLimit = (value) => {
    if (value === undefined || value === null || value === false) {
        return null;
    }
    const options = value === true ? {} : value;
    if (typeof options !== 'object' || options.enabled === false) {
        return null;
    }
    const number = (key, { min = 0, integer = false } = {}) => {
        const raw = options[key] ?? SEND_RATE_LIMIT_DEFAULTS[key];
        const parsed = Number(raw);
        if (!Number.isFinite(parsed) || parsed < min) {
            return SEND_RATE_LIMIT_DEFAULTS[key];
        }
        return integer ? Math.floor(parsed) : parsed;
    };
    return {
        perChatMs: number('perChatMs', { min: 1 }),
        burst: Math.max(1, number('burst', { min: 1, integer: true })),
        jitter: number('jitter'),
        maxQueue: Math.max(1, number('maxQueue', { min: 1, integer: true })),
        simulateTyping: options.simulateTyping === true,
        typingMs: number('typingMs'),
        typingJitter: number('typingJitter')
    };
};

export const createSendRateLimiter = (options = {}) => {
    const settings = { ...SEND_RATE_LIMIT_DEFAULTS, ...(options.enabled === false ? {} : options) };
    const perChatMs = Math.max(1, Number(settings.perChatMs) || SEND_RATE_LIMIT_DEFAULTS.perChatMs);
    const burst = Math.max(1, Math.floor(Number(settings.burst) || SEND_RATE_LIMIT_DEFAULTS.burst));
    const jitter = Math.max(0, Number(settings.jitter) || 0);
    const maxQueue = Math.max(1, Math.floor(Number(settings.maxQueue) || SEND_RATE_LIMIT_DEFAULTS.maxQueue));
    const random = typeof settings.random === 'function' ? settings.random : Math.random;
    const now = typeof settings.now === 'function' ? settings.now : Date.now;
    const states = new Map();
    const counters = { sent: 0, delayed: 0, rejected: 0 };

    const stateFor = (chat) => {
        let state = states.get(chat);
        if (!state) {
            state = { tokens: burst, refilledAt: now(), queue: [], timer: null };
            states.set(chat, state);
        }
        return state;
    };

    const refill = (state) => {
        const timestamp = now();
        const elapsed = timestamp - state.refilledAt;
        if (elapsed > 0) {
            state.tokens = Math.min(burst, state.tokens + elapsed / perChatMs);
            state.refilledAt = timestamp;
        }
    };

    const pump = (chat) => {
        const state = states.get(chat);
        if (!state || state.timer) {
            return;
        }
        while (state.queue.length > 0) {
            refill(state);
            if (state.tokens < 1) {
                const wait = Math.max(1, Math.ceil((1 - state.tokens) * perChatMs + (jitter ? random() * jitter : 0)));
                state.timer = setTimeout(() => {
                    state.timer = null;
                    pump(chat);
                }, wait);
                return;
            }
            state.tokens -= 1;
            const entry = state.queue.shift();
            counters.sent += 1;
            entry.run();
        }
        if (state.tokens >= burst) {
            states.delete(chat);
            return;
        }
        const idle = Math.max(1, Math.ceil((burst - state.tokens) * perChatMs));
        state.timer = setTimeout(() => {
            state.timer = null;
            states.delete(chat);
        }, idle);
    };

    const schedule = (chat, task) => {
        if (typeof task !== 'function') {
            return Promise.reject(new TypeError('send rate limit needs a task function'));
        }
        return new Promise((resolve, reject) => {
            const state = stateFor(chat);
            if (state.queue.length >= maxQueue) {
                counters.rejected += 1;
                reject(new Boom('the send queue for this chat is full', {
                    statusCode: 429,
                    data: { chat, queued: state.queue.length, maxQueue }
                }));
                return;
            }
            if (state.queue.length > 0) {
                counters.delayed += 1;
            }
            if (state.timer) {
                clearTimeout(state.timer);
                state.timer = null;
            }
            state.queue.push({
                run: () => {
                    Promise.resolve()
                        .then(task)
                        .then(resolve, reject);
                }
            });
            pump(chat);
        });
    };

    const drain = async () => {
        const pending = [];
        for (const [chat, state] of states) {
            if (state.timer) {
                clearTimeout(state.timer);
                state.timer = null;
            }
            while (state.queue.length > 0) {
                const entry = state.queue.shift();
                counters.sent += 1;
                pending.push(Promise.resolve().then(entry.run));
            }
            states.delete(chat);
        }
        await Promise.allSettled(pending);
    };

    const stats = () => {
        let queued = 0;
        for (const state of states.values()) {
            queued += state.queue.length;
        }
        return { chats: states.size, queued, ...counters, perChatMs, burst, jitter, maxQueue };
    };

    return {
        settings: { perChatMs, burst, jitter, maxQueue, simulateTyping: settings.simulateTyping === true, typingMs: Number(settings.typingMs) || 0, typingJitter: Number(settings.typingJitter) || 0 },
        schedule,
        drain,
        stats,
        pending: (chat) => states.get(chat)?.queue.length ?? 0,
        reset: () => {
            for (const state of states.values()) {
                if (state.timer) {
                    clearTimeout(state.timer);
                }
            }
            states.clear();
            counters.sent = 0;
            counters.delayed = 0;
            counters.rejected = 0;
        }
    };
};

export const typingDelayMs = (limiterSettings, random = Math.random) => {
    const base = Math.max(0, Number(limiterSettings?.typingMs) || 0);
    const spread = Math.max(0, Number(limiterSettings?.typingJitter) || 0);
    return base + Math.floor(random() * spread);
};
