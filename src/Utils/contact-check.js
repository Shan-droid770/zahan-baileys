/* Zahan Baileys maintained distribution. Upstream notices and license are preserved in LICENSE and NOTICE.md. */
import { TTLCache } from './ttl-cache.js';

export const CONTACT_CHECK_DEFAULTS = Object.freeze({
    ttlMs: 5 * 60 * 1000,
    max: 5000,
    chunkSize: 100,
    concurrency: 3,
    delayMs: 250
});

export const normalizePhoneDigits = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        value = String(value);
    }
    if (typeof value !== 'string') {
        return undefined;
    }
    const digits = value.trim().split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    return digits || undefined;
};

export const phoneToJid = (value) => {
    const digits = normalizePhoneDigits(value);
    return digits ? `${digits}@s.whatsapp.net` : undefined;
};

export const normalizeContactCheckCache = (value) => {
    if (value === false || value === null) {
        return null;
    }
    const options = value === true || value === undefined ? {} : value;
    if (typeof options !== 'object') {
        return null;
    }
    const ttlMs = Number(options.ttlMs ?? CONTACT_CHECK_DEFAULTS.ttlMs);
    const max = Number(options.max ?? CONTACT_CHECK_DEFAULTS.max);
    if (options.enabled === false) {
        return null;
    }
    return {
        ttlMs: Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : CONTACT_CHECK_DEFAULTS.ttlMs,
        max: Number.isFinite(max) && max > 0 ? max : CONTACT_CHECK_DEFAULTS.max
    };
};

export const makeContactCheckCache = (value) => {
    const settings = normalizeContactCheckCache(value);
    if (!settings) {
        return null;
    }
    const store = new TTLCache({ ttl: settings.ttlMs, max: settings.max });
    return {
        settings,
        get: (jid) => store.get(jid),
        set: (jid, exists) => store.set(jid, !!exists),
        clear: () => store.flushAll(),
        stats: () => ({ ...store.getStats(), ...settings })
    };
};

const chunk = (list, size) => {
    const chunks = [];
    for (let index = 0; index < list.length; index += size) {
        chunks.push(list.slice(index, index + size));
    }
    return chunks;
};

export const resolveContactChecks = async ({
    inputs,
    cache,
    query,
    chunkSize = CONTACT_CHECK_DEFAULTS.chunkSize,
    concurrency = CONTACT_CHECK_DEFAULTS.concurrency,
    delayMs = CONTACT_CHECK_DEFAULTS.delayMs,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    onInvalid = () => {}
}) => {
    if (typeof query !== 'function') {
        throw new TypeError('resolveContactChecks needs a query function');
    }
    const ordered = [];
    const seen = new Set();
    for (const input of inputs ?? []) {
        const jid = phoneToJid(input);
        if (!jid) {
            onInvalid(input);
            continue;
        }
        if (seen.has(jid)) {
            continue;
        }
        seen.add(jid);
        ordered.push(jid);
    }

    const results = new Map();
    const missing = [];
    for (const jid of ordered) {
        const cached = cache?.get(jid);
        if (cached === undefined) {
            missing.push(jid);
        }
        else {
            results.set(jid, { jid, exists: !!cached, cached: true });
        }
    }

    if (missing.length) {
        const batches = chunk(missing, Math.max(1, Math.floor(chunkSize)));
        const notFound = new Set(missing);
        let next = 0;
        const worker = async () => {
            while (next < batches.length) {
                const batch = batches[next++];
                if (delayMs > 0 && next > 1) {
                    await sleep(delayMs);
                }
                const answer = await query(batch);
                for (const item of answer ?? []) {
                    if (!item?.jid || !notFound.has(item.jid)) {
                        continue;
                    }
                    notFound.delete(item.jid);
                    results.set(item.jid, { jid: item.jid, exists: !!item.exists, cached: false });
                    cache?.set(item.jid, !!item.exists);
                }
            }
        };
        const workers = Math.max(1, Math.min(Math.floor(concurrency) || 1, batches.length));
        await Promise.all(Array.from({ length: workers }, worker));
        for (const jid of notFound) {
            results.set(jid, { jid, exists: false, cached: false });
            cache?.set(jid, false);
        }
    }

    return ordered.map((jid) => results.get(jid));
};
