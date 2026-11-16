/* Zahan Baileys maintained distribution. Upstream notices and license are preserved in LICENSE and NOTICE.md. */

export type MediaDownloadType = 'buffer' | 'stream';

export interface DownloadMediaOptions {
    startByte?: number;
    endByte?: number;
    headers?: Record<string, string>;
    [key: string]: any;
}

export interface DownloadMediaHelperOptions {
    recover?: boolean;
    cache?: boolean;
    logger?: any;
}

export interface SendMessageOptions {
    quoted?: any;
    messageId?: string;
    aiLabel?: boolean;
    /** @deprecated use `aiLabel` */
    ai?: boolean;
    additionalNodes?: any[];
    additionalAttributes?: Record<string, string>;
    useUserDevicesCache?: boolean;
    useCachedGroupMetadata?: boolean;
    statusJidList?: string[];
    ephemeralExpiration?: number;
    delayMs?: number;
    skipRateLimit?: boolean;
    [key: string]: any;
}

export interface AnyMessageContent {
    text?: string;
    image?: any;
    video?: any;
    audio?: any;
    document?: any;
    sticker?: any;
    location?: any;
    contacts?: any;
    poll?: {
        name: string;
        values: string[];
        selectableCount?: number;
        [key: string]: any;
    };
    react?: {
        text: string;
        key: any;
    };
    delete?: any;
    edit?: any;
    forward?: any;
    pin?: any;
    keep?: any;
    aiLabel?: boolean;
    /** @deprecated use `aiLabel` */
    ai?: boolean;
    [key: string]: any;
}

export interface ContactCheckResult {
    jid: string;
    exists: boolean;
    cached?: boolean;
}

export interface CheckNumbersOptions {
    cache?: boolean;
    chunkSize?: number;
    concurrency?: number;
    delayMs?: number;
}

export interface ContactCheckCacheOptions {
    enabled?: boolean;
    ttlMs?: number;
    max?: number;
}

export interface SendRateLimitOptions {
    enabled?: boolean;
    perChatMs?: number;
    burst?: number;
    jitter?: number;
    maxQueue?: number;
    simulateTyping?: boolean;
    typingMs?: number;
    typingJitter?: number;
}

export interface MediaDownloadCacheOptions {
    enabled?: boolean;
    ttlMs?: number;
    max?: number;
    maxBytes?: number;
    maxEntryBytes?: number;
}

export interface SendQueueStats {
    chats: number;
    queued: number;
    sent: number;
    delayed: number;
    rejected: number;
    perChatMs: number;
    burst: number;
    jitter: number;
    maxQueue: number;
}
