/* Zahan Baileys maintained distribution. Upstream notices and license are preserved in LICENSE and NOTICE.md. */
import type { SendQueueStats, SendRateLimitOptions } from '../Types/Content.js';
export const SEND_RATE_LIMIT_DEFAULTS: Readonly<{
    perChatMs: number;
    burst: number;
    jitter: number;
    maxQueue: number;
    simulateTyping: boolean;
    typingMs: number;
    typingJitter: number;
}>;
export function normalizeSendRateLimit(value?: boolean | SendRateLimitOptions | null): {
    perChatMs: number;
    burst: number;
    jitter: number;
    maxQueue: number;
    simulateTyping: boolean;
    typingMs: number;
    typingJitter: number;
} | null;
export interface SendRateLimiter {
    settings: {
        perChatMs: number;
        burst: number;
        jitter: number;
        maxQueue: number;
        simulateTyping: boolean;
        typingMs: number;
        typingJitter: number;
    };
    schedule: <T>(chat: string, task: () => Promise<T> | T) => Promise<T>;
    drain: () => Promise<void>;
    stats: () => SendQueueStats;
    pending: (chat: string) => number;
    reset: () => void;
}
export function createSendRateLimiter(options?: SendRateLimitOptions & {
    random?: () => number;
    now?: () => number;
    logger?: any;
}): SendRateLimiter;
export function typingDelayMs(settings: {
    typingMs?: number;
    typingJitter?: number;
} | undefined, random?: () => number): number;
