/* Zahan Baileys maintained distribution. Upstream notices and license are preserved in LICENSE and NOTICE.md. */

export declare const GROUP_ADDRESSING_MODES: readonly string[]
export declare function isUsableGroupMetadata(metadata: any): boolean
export declare function describeUnusableGroupMetadata(metadata: any): string
export declare const GROUP_METADATA_CACHE_DEFAULTS: Readonly<{
    ttlMs: number;
    staleMs: number;
    maxEntries: number;
}>
export interface SharedGroupMetadataCacheOptions {
    ttlMs?: number;
    staleMs?: number;
    maxEntries?: number;
    now?: () => number;
}
export interface SharedGroupMetadataCacheStats {
    hits: number;
    misses: number;
    staleHits: number;
    loads: number;
    invalidations: number;
    failures: number;
    refreshes: number;
    entries: number;
    inflight: number;
    ttlMs: number;
    staleMs: number;
    maxEntries: number;
}
export interface SharedGroupMetadataCache {
    get(jid: string, fetcher?: () => any | Promise<any>): Promise<any>;
    peek(jid: string): { metadata: any; fresh: boolean } | undefined;
    set(jid: string, metadata: any): boolean;
    refresh(jid: string, fetcher?: () => any | Promise<any>): Promise<any>;
    invalidate(jid: string): boolean;
    clear(): void;
    stats(): SharedGroupMetadataCacheStats;
}
export declare function createSharedGroupMetadataCache(options?: SharedGroupMetadataCacheOptions): SharedGroupMetadataCache;
