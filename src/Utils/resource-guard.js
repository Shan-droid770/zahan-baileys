/* Zahan Baileys maintained distribution. Upstream notices and license are preserved in LICENSE and NOTICE.md. */
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import v8 from 'v8';

export const MEGABYTE = 1024 * 1024;

export const RESOURCE_GUARD_DEFAULTS = Object.freeze({
    enabled: true,
    intervalMs: 5 * 60 * 1000,
    staleTempFileMs: 60 * 60 * 1000,
    heapUsageRatio: 0.85,
    cleanTempFiles: true,
    trimCaches: true
});

export const getTempMediaDirectory = () => process.env.ZAHAN_TMP_DIR || join(tmpdir(), 'zahan-baileys');

const toMegabytes = (bytes) => Math.round((Number(bytes) || 0) / MEGABYTE * 10) / 10;

const fileAge = async (path, now) => {
    try {
        const stats = await fs.stat(path);
        return { size: stats.size, age: now - stats.mtimeMs, path };
    }
    catch {
        return undefined;
    }
};

export const listTempMediaFiles = async (directory = getTempMediaDirectory()) => {
    let entries;
    try {
        entries = await fs.readdir(directory, { withFileTypes: true });
    }
    catch (error) {
        if (error?.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
    const now = Date.now();
    const files = await Promise.all(entries
        .filter(entry => entry.isFile())
        .map(entry => fileAge(join(directory, entry.name), now)));
    return files.filter(Boolean);
};

export const getTempMediaUsage = async (directory = getTempMediaDirectory()) => {
    const files = await listTempMediaFiles(directory);
    return {
        directory,
        files: files.length,
        bytes: files.reduce((total, file) => total + file.size, 0)
    };
};

export const cleanupTempMedia = async ({ directory = getTempMediaDirectory(), maxAgeMs = RESOURCE_GUARD_DEFAULTS.staleTempFileMs, keepActiveMs = 60 * 1000 } = {}) => {
    const threshold = Math.max(Number(maxAgeMs) || 0, Number(keepActiveMs) || 0);
    const files = await listTempMediaFiles(directory);
    let removed = 0;
    let bytes = 0;
    for (const file of files) {
        if (file.age < threshold) {
            continue;
        }
        try {
            await fs.unlink(file.path);
            removed += 1;
            bytes += file.size;
        }
        catch {
        }
    }
    return { directory, removed, bytes };
};

export const getStorageUsage = async (directory = getTempMediaDirectory()) => {
    const temp = await getTempMediaUsage(directory);
    let freeBytes;
    let totalBytes;
    try {
        const stats = await fs.statfs(directory);
        freeBytes = Number(stats.bavail) * Number(stats.bsize);
        totalBytes = Number(stats.blocks) * Number(stats.bsize);
    }
    catch {
    }
    return {
        tempDir: temp.directory,
        tempFiles: temp.files,
        tempBytes: temp.bytes,
        tempMb: toMegabytes(temp.bytes),
        ...(freeBytes !== undefined ? { freeBytes, freeMb: toMegabytes(freeBytes), totalMb: toMegabytes(totalBytes) } : {})
    };
};

export const getMemoryUsage = () => {
    const usage = process.memoryUsage();
    const heapLimitBytes = v8.getHeapStatistics().heap_size_limit;
    return {
        rssBytes: usage.rss,
        rssMb: toMegabytes(usage.rss),
        heapTotalMb: toMegabytes(usage.heapTotal),
        heapUsedMb: toMegabytes(usage.heapUsed),
        externalMb: toMegabytes(usage.external),
        arrayBuffersMb: toMegabytes(usage.arrayBuffers),
        heapLimitMb: toMegabytes(heapLimitBytes),
        heapUsedRatio: heapLimitBytes ? Math.round((usage.heapUsed / heapLimitBytes) * 1000) / 1000 : 0
    };
};

const purge = (target, label, cleared) => {
    if (!target) {
        return;
    }
    try {
        if (typeof target.flushAll === 'function') {
            target.flushAll();
        }
        else if (typeof target.clear === 'function') {
            target.clear();
        }
        else if (typeof target.close === 'function') {
            target.close();
        }
        else {
            return;
        }
        cleared.push(label);
    }
    catch {
    }
};

const cacheTargets = (sock, config = {}) => [
    [sock?.userDevicesCache, 'userDevicesCache'],
    [sock?.outboundResendCache, 'outboundResendCache'],
    [sock?.placeholderResendCache, 'placeholderResendCache'],
    [config?.mediaCache, 'mediaCache'],
    [sock?.messageRetryManager, 'messageRetryManager']
];

export const getCacheUsage = (sock, config = {}) => {
    const usage = {};
    for (const [target, label] of cacheTargets(sock, config)) {
        if (!target) {
            continue;
        }
        if (typeof target.size === 'number') {
            usage[label] = target.size;
            continue;
        }
        if (typeof target.getStats === 'function') {
            try {
                usage[label] = target.getStats()?.keys;
            }
            catch {
            }
        }
    }
    return usage;
};

export const trimSocketCaches = (sock, config = {}) => {
    const cleared = [];
    for (const [target, label] of cacheTargets(sock, config)) {
        purge(target, label, cleared);
    }
    return cleared;
};

export const getResourceUsage = async (sock, config = {}, options = {}) => ({
    memory: getMemoryUsage(),
    storage: await getStorageUsage(options.directory || getTempMediaDirectory()),
    caches: getCacheUsage(sock, config),
    uptimeSeconds: Math.round(process.uptime())
});

export const trimMemory = async (sock, config = {}, options = {}) => {
    const cleared = trimSocketCaches(sock, config);
    const temp = options.cleanTempFiles === false
        ? { removed: 0, bytes: 0 }
        : await cleanupTempMedia({
            directory: options.directory || getTempMediaDirectory(),
            maxAgeMs: options.staleTempFileMs ?? RESOURCE_GUARD_DEFAULTS.staleTempFileMs
        });
    let garbageCollected = false;
    if (options.gc !== false && typeof global.gc === 'function') {
        global.gc();
        garbageCollected = true;
    }
    return {
        clearedCaches: cleared,
        removedTempFiles: temp.removed,
        freedTempBytes: temp.bytes,
        garbageCollected,
        ...getMemoryUsage()
    };
};

export const normalizeResourceGuardOptions = (value) => {
    if (value === false) {
        return { ...RESOURCE_GUARD_DEFAULTS, enabled: false };
    }
    if (value === true || value === undefined || value === null) {
        return { ...RESOURCE_GUARD_DEFAULTS };
    }
    return { ...RESOURCE_GUARD_DEFAULTS, ...value };
};

export const bindResourceGuard = (sock, config = {}) => {
    const options = normalizeResourceGuardOptions(config.resourceGuard);
    const installMethods = () => {
        sock.getResourceUsage = (extra = {}) => getResourceUsage(sock, config, { ...options, ...extra });
        sock.trimMemory = (extra = {}) => trimMemory(sock, config, { ...options, ...extra });
    };
    installMethods();
    if (!options.enabled) {
        return { stop() {}, runNow: () => sock.getResourceUsage() };
    }

    const runNow = async () => {
        const usage = getMemoryUsage();
        let result = { clearedCaches: [], removedTempFiles: 0, freedTempBytes: 0 };
        if (options.cleanTempFiles) {
            const temp = await cleanupTempMedia({
                directory: options.directory || getTempMediaDirectory(),
                maxAgeMs: options.staleTempFileMs
            }).catch(() => ({ removed: 0, bytes: 0 }));
            result.removedTempFiles = temp.removed;
            result.freedTempBytes = temp.bytes;
        }
        const overHeap = usage.heapUsedRatio >= options.heapUsageRatio;
        if (options.trimCaches && overHeap) {
            result.clearedCaches = trimSocketCaches(sock, config);
            if (typeof global.gc === 'function') {
                global.gc();
                result.garbageCollected = true;
            }
            config.logger?.warn?.({ memory: usage, clearedCaches: result.clearedCaches }, 'heap is above the guard threshold, caches were trimmed');
        }
        return result;
    };

    const timer = options.intervalMs > 0
        ? setInterval(() => {
            runNow().catch(error => config.logger?.debug?.({ error }, 'resource guard cycle failed'));
        }, options.intervalMs)
        : undefined;
    timer?.unref?.();

    const onEnd = async () => {
        if (timer) {
            clearInterval(timer);
        }
        await cleanupTempMedia({
            directory: options.directory || getTempMediaDirectory(),
            maxAgeMs: options.staleTempFileMs,
            keepActiveMs: 0
        }).catch(() => {});
    };
    if (typeof sock.registerSocketEndHandler === 'function') {
        sock.registerSocketEndHandler(() => {
            onEnd().catch(() => {});
        });
    }

    return {
        stop: () => {
            if (timer) {
                clearInterval(timer);
            }
        },
        runNow
    };
};
