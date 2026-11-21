/* Zahan Baileys maintained distribution. Upstream notices and license are preserved in LICENSE and NOTICE.md. */

export const GROUP_ADDRESSING_MODES = Object.freeze(['pn', 'lid'])

export const isUsableGroupMetadata = metadata => {
    if (!metadata || typeof metadata !== 'object') {
        return false
    }
    if (!Array.isArray(metadata.participants)) {
        return false
    }
    return GROUP_ADDRESSING_MODES.includes(metadata.addressingMode)
}

export const describeUnusableGroupMetadata = metadata => {
    if (!metadata || typeof metadata !== 'object') {
        return 'nothing cached'
    }
    if (!Array.isArray(metadata.participants)) {
        return 'no participants'
    }
    if (metadata.addressingMode === undefined || metadata.addressingMode === null) {
        return 'no addressingMode'
    }
    return `addressingMode ${JSON.stringify(metadata.addressingMode)} is not pn or lid`
}

export const GROUP_METADATA_CACHE_DEFAULTS = Object.freeze({
    ttlMs: 30000,
    staleMs: 300000,
    maxEntries: 1000
})

export const createSharedGroupMetadataCache = (options = {}) => {
    const settings = { ...GROUP_METADATA_CACHE_DEFAULTS }
    for (const key of ['ttlMs', 'staleMs', 'maxEntries']) {
        const value = Number(options[key])
        if (Number.isFinite(value) && value >= 0) {
            settings[key] = Math.round(value)
        }
    }
    settings.maxEntries = Math.max(1, settings.maxEntries)
    const now = typeof options.now === 'function' ? options.now : Date.now
    const entries = new Map()
    const versions = new Map()
    const inflight = new Map()
    const counters = {
        hits: 0,
        misses: 0,
        staleHits: 0,
        loads: 0,
        invalidations: 0,
        failures: 0,
        refreshes: 0
    }
    let epoch = 0
    const keyOf = jid => typeof jid === 'string' ? jid : String(jid ?? '')
    const versionOf = key => `${epoch}:${versions.get(key) ?? 0}`
    const bumpVersion = key => versions.set(key, (versions.get(key) ?? 0) + 1)
    const touch = (key, entry) => {
        entries.delete(key)
        entries.set(key, entry)
    }
    const trim = () => {
        while (entries.size > settings.maxEntries) {
            const oldest = entries.keys().next().value
            if (oldest === undefined) {
                break
            }
            entries.delete(oldest)
        }
    }
    const set = (jid, metadata) => {
        if (!isUsableGroupMetadata(metadata)) {
            return false
        }
        const key = keyOf(jid)
        if (!key) {
            return false
        }
        bumpVersion(key)
        const entry = { metadata, storedAt: now() }
        entries.delete(key)
        entries.set(key, entry)
        trim()
        return true
    }
    const peek = jid => {
        const key = keyOf(jid)
        const entry = entries.get(key)
        if (!entry) {
            return undefined
        }
        const age = Math.max(0, now() - entry.storedAt)
        if (age <= settings.ttlMs) {
            touch(key, entry)
            return { metadata: entry.metadata, fresh: true }
        }
        if (age <= settings.ttlMs + settings.staleMs) {
            touch(key, entry)
            return { metadata: entry.metadata, fresh: false }
        }
        entries.delete(key)
        return undefined
    }
    const invalidate = jid => {
        const key = keyOf(jid)
        if (!key) {
            return false
        }
        const had = entries.delete(key)
        bumpVersion(key)
        counters.invalidations++
        return had
    }
    const clear = () => {
        entries.clear()
        versions.clear()
        epoch++
        counters.invalidations++
    }
    const enqueue = (jid, fetcher) => {
        const key = keyOf(jid)
        if (!key) {
            return Promise.resolve(undefined)
        }
        let state = inflight.get(key)
        if (state) {
            if (typeof fetcher === 'function' && !state.settled) {
                state.fetchers.push(fetcher)
            }
            return state.promise
        }
        const fetchers = typeof fetcher === 'function' ? [fetcher] : []
        const version = versionOf(key)
        let resolveTask
        const base = new Promise(resolve => {
            resolveTask = resolve
        })
        const promise = base.finally(() => {
            state.settled = true
            if (inflight.get(key) === state) {
                inflight.delete(key)
            }
        })
        state = { promise, fetchers, settled: false, version }
        inflight.set(key, state)
        queueMicrotask(async () => {
            while (state.fetchers.length) {
                const next = state.fetchers.shift()
                try {
                    const metadata = await next()
                    if (isUsableGroupMetadata(metadata)) {
                        if (versionOf(key) === state.version) {
                            set(key, metadata)
                            counters.loads++
                            resolveTask(metadata)
                        }
                        else {
                            resolveTask(undefined)
                        }
                        return
                    }
                    counters.failures++
                }
                catch {
                    counters.failures++
                }
            }
            resolveTask(undefined)
        })
        return promise
    }
    const refresh = (jid, fetcher) => {
        counters.refreshes++
        return enqueue(jid, fetcher)
    }
    const get = (jid, fetcher) => {
        const hit = peek(jid)
        if (hit?.fresh) {
            counters.hits++
            return Promise.resolve(hit.metadata)
        }
        if (hit) {
            counters.staleHits++
            refresh(jid, fetcher).catch(() => undefined)
            return Promise.resolve(hit.metadata)
        }
        counters.misses++
        return enqueue(jid, fetcher)
    }
    const stats = () => ({
        ...counters,
        entries: entries.size,
        inflight: inflight.size,
        ttlMs: settings.ttlMs,
        staleMs: settings.staleMs,
        maxEntries: settings.maxEntries
    })
    return { get, peek, set, refresh, invalidate, clear, stats }
}
