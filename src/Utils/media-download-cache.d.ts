/* Zahan Baileys maintained distribution. Upstream notices and license are preserved in LICENSE and NOTICE.md. */
import type { MediaDownloadCacheOptions } from '../Types/Content.js';
export const MEDIA_DOWNLOAD_CACHE_DEFAULTS: Readonly<{
    ttlMs: number;
    max: number;
    maxBytes: number;
    maxEntryBytes: number;
}>;
export function normalizeMediaDownloadCache(value?: boolean | MediaDownloadCacheOptions | null): {
    ttlMs: number;
    max: number;
    maxBytes: number;
    maxEntryBytes: number;
} | null;
export function makeMediaDownloadCache(value?: boolean | MediaDownloadCacheOptions | null, options?: {
    now?: () => number;
}): {
    settings: {
        ttlMs: number;
        max: number;
        maxBytes: number;
        maxEntryBytes: number;
    };
    get: (key: string) => Buffer | undefined;
    set: (key: string, value: Buffer) => boolean;
    delete: (key: string) => boolean;
    clear: () => void;
    stats: () => {
        entries: number;
        bytes: number;
        ttlMs: number;
        max: number;
        maxBytes: number;
        maxEntryBytes: number;
    };
} | null;
