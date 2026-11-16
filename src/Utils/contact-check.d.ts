/* Zahan Baileys maintained distribution. Upstream notices and license are preserved in LICENSE and NOTICE.md. */
import type { ContactCheckCacheOptions, ContactCheckResult } from '../Types/Content.js';
export const CONTACT_CHECK_DEFAULTS: Readonly<{
    ttlMs: number;
    max: number;
    chunkSize: number;
    concurrency: number;
    delayMs: number;
}>;
export function normalizePhoneDigits(value: string | number): string | undefined;
export function phoneToJid(value: string | number): string | undefined;
export function normalizeContactCheckCache(value?: boolean | ContactCheckCacheOptions | null): {
    ttlMs: number;
    max: number;
} | null;
export function makeContactCheckCache(value?: boolean | ContactCheckCacheOptions | null): {
    settings: {
        ttlMs: number;
        max: number;
    };
    get: (jid: string) => boolean | undefined;
    set: (jid: string, exists: boolean) => boolean;
    clear: () => void;
    stats: () => {
        hits: number;
        misses: number;
        keys: number;
        ttlMs: number;
        max: number;
    };
} | null;
export function resolveContactChecks(options: {
    inputs: Array<string | number>;
    cache?: ReturnType<typeof makeContactCheckCache>;
    query: (jids: string[]) => Promise<Array<{
        jid: string;
        exists: boolean;
    }>>;
    chunkSize?: number;
    concurrency?: number;
    delayMs?: number;
    sleep?: (ms: number) => Promise<unknown>;
    onInvalid?: (input: string | number) => void;
}): Promise<ContactCheckResult[]>;
