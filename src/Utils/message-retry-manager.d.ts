/* Zahan Baileys maintained distribution. Upstream notices and license are preserved in LICENSE and NOTICE.md. */
export const RetryReason: any;
export const MAC_ERROR_CODES: readonly number[];
export const SESSION_RECOVERY_CODES: readonly number[];
export declare function parseRetryErrorCode(errorAttr: unknown): number | undefined;
export declare function isMacErrorCode(errorCode: number | undefined): boolean;
export declare function isSessionRecoveryErrorCode(errorCode: number | undefined): boolean;
export class MessageRetryManager {
    constructor(logger: any, maxMsgRetryCount?: number);
    logger: any;
    recentMessagesMap: any;
    messageKeyIndex: Map<string, Set<string>>;
    sessionRecreateHistory: any;
    retryCounters: any;
    baseKeys: any;
    pendingPhoneRequests: {};
    maxMsgRetryCount: any;
    statistics: {
        totalRetries: number;
        successfulRetries: number;
        failedRetries: number;
        mediaRetries: number;
        sessionRecreations: number;
        macRecoveries: number;
        jidResets: number;
        phoneRequests: number;
    };
    addRecentMessage(to: any, id: any, message: any): void;
    getRecentMessage(to: any, id: any): any;
    shouldRecreateSession(jid: any, hasSession: any, errorCode?: number): {
        reason: string;
        recreate: boolean;
        instant: boolean;
    };
    parseRetryErrorCode(errorAttr: any): number | undefined;
    isMacError(errorCode: any): boolean;
    incrementRetryCount(messageId: any): any;
    getRetryCount(messageId: any): any;
    hasExceededMaxRetries(messageId: any): boolean;
    markRetrySuccess(messageId: any): void;
    markRetryFailed(messageId: any): void;
    resetRetryCounter(messageId: string): void;
    resetJid(jid: string, options?: {
        users?: string[];
        addresses?: string[];
    }): number;
    schedulePhoneRequest(messageId: any, callback: any, delay?: number): void;
    cancelPendingPhoneRequest(messageId: any): void;
    clear(): void;
    saveBaseKey(addr: any, msgId: any, baseKey: any): void;
    hasSameBaseKey(addr: any, msgId: any, baseKey: any): boolean;
    deleteBaseKey(addr: any, msgId: any): void;
    keyToString(key: any): string;
    removeRecentMessage(messageId: any): void;
}
