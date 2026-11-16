/* Zahan Baileys maintained distribution. Upstream notices and license are preserved in LICENSE and NOTICE.md. */

export const MEDIA_DOWNLOAD_CACHE_DEFAULTS = Object.freeze({
    ttlMs: 10 * 60 * 1000,
    max: 16,
    maxBytes: 32 * 1024 * 1024,
    maxEntryBytes: 8 * 1024 * 1024
});

export const normalizeMediaDownloadCache = (value) => {
    if (value === false || value === null) {
        return null;
    }
    const options = value === true || value === undefined ? {} : value;
    if (typeof options !== 'object' || options.enabled === false) {
        return null;
    }
    const pick = (key, fallback, { allowZero = false } = {}) => {
        const number = Number(options[key] ?? fallback);
        if (!Number.isFinite(number) || number < 0 || (!allowZero && number === 0)) {
            return fallback;
        }
        return number;
    };
    return {
        ttlMs: pick('ttlMs', MEDIA_DOWNLOAD_CACHE_DEFAULTS.ttlMs),
        max: Math.floor(pick('max', MEDIA_DOWNLOAD_CACHE_DEFAULTS.max)),
        maxBytes: pick('maxBytes', MEDIA_DOWNLOAD_CACHE_DEFAULTS.maxBytes),
        maxEntryBytes: pick('maxEntryBytes', MEDIA_DOWNLOAD_CACHE_DEFAULTS.maxEntryBytes)
    };
};

export const makeMediaDownloadCache = (value, { now = Date.now } = {}) => {
    const settings = normalizeMediaDownloadCache(value);
    if (!settings) {
        return null;
    }
    const entries = new Map();
    let totalBytes = 0;

    const drop = (key) => {
        const entry = entries.get(key);
        if (!entry) {
            return false;
        }
        entries.delete(key);
        totalBytes -= entry.bytes;
        return true;
    };

    const prune = () => {
        const timestamp = now();
        for (const [key, entry] of entries) {
            if (entry.expiresAt <= timestamp) {
                drop(key);
            }
        }
        while (entries.size > settings.max) {
            drop(entries.keys().next().value);
        }
        while (totalBytes > settings.maxBytes && entries.size > 0) {
            drop(entries.keys().next().value);
        }
    };

    return {
        settings,
        get: (key) => {
            const entry = entries.get(key);
            if (!entry) {
                return undefined;
            }
            if (entry.expiresAt <= now()) {
                drop(key);
                return undefined;
            }
            return entry.value;
        },
        set: (key, value) => {
            const bytes = Buffer.isBuffer(value) ? value.length : 0;
            if (!bytes || bytes > settings.maxEntryBytes) {
                return false;
            }
            drop(key);
            entries.set(key, { value, bytes, expiresAt: now() + settings.ttlMs });
            totalBytes += bytes;
            prune();
            return entries.has(key);
        },
        delete: drop,
        clear: () => {
            entries.clear();
            totalBytes = 0;
        },
        stats: () => ({ entries: entries.size, bytes: totalBytes, ...settings })
    };
};
