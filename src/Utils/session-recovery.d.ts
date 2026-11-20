/* Zahan Baileys maintained distribution. Upstream notices and license are preserved in LICENSE and NOTICE.md. */
export interface SessionRecoverySettings {
    enabled: boolean;
    autoRecoverMacErrors: boolean;
    purgeRelatedSessions: boolean;
    refreshSessions: boolean;
    purgeSenderKeys: boolean;
    purgeIdentityKeys: boolean;
    emitEvents: boolean;
    cooldownMs: number;
    maxRefreshJids: number;
}

export interface SessionRecoveryRequest extends Partial<SessionRecoverySettings> {
    code?: number;
    reason?: string;
    groupJid?: string;
    force?: boolean;
    auto?: boolean;
    settings?: Partial<SessionRecoverySettings>;
}

export interface RetryErrorClassification {
    code?: number;
    isMac: boolean;
    recoverable: boolean;
    reason?: string;
}

export interface SessionRecoveryResult {
    jid: string;
    user?: string;
    code?: number;
    reason?: string;
    recovered: boolean;
    skipped?: string;
    error?: string;
    coalesced?: boolean;
    purged?: {
        sessions: string[];
        senderKeys: string[];
        senderKeyMemory: string[];
        identityKeys: string[];
    };
    users?: string[];
    resetMessages?: number;
    refreshed: boolean;
    durationMs?: number;
}

export interface SessionRecoveryStats {
    requests: number;
    recoveries: number;
    coalesced: number;
    skipped: number;
    failures: number;
    purgedSessions: number;
    purgedSenderKeys: number;
    purgedIdentityKeys: number;
    refreshed: number;
    retryStateResets: number;
    lastAt?: number;
    lastReason?: string;
    byCode: Record<string, number>;
}

export interface RecoveryTargets {
    jid: string;
    user?: string;
    users: string[];
    jids: string[];
    addresses: string[];
    senderKeyIds: string[];
    refreshJids: string[];
    groupJid?: string;
}

export interface SessionRecoveryManager {
    settings: SessionRecoverySettings;
    recover(jid: string, request?: SessionRecoveryRequest): Promise<SessionRecoveryResult>;
    recoverMany(jids: string[], request?: SessionRecoveryRequest): Promise<{
        results: SessionRecoveryResult[];
        summary: SessionRecoveryStats;
    }>;
    stats(): SessionRecoveryStats;
    clear(): void;
    close(): void;
}

export declare const SESSION_RECOVERY_DEFAULTS: Readonly<SessionRecoverySettings>;
export declare function normalizeSessionRecovery(value?: boolean | Partial<SessionRecoverySettings>): SessionRecoverySettings;
export declare function isMacErrorText(value: unknown): boolean;
export declare function classifyRetryError(input: unknown): RetryErrorClassification;
export declare function collectRecoveryTargets(options: {
    jid: string;
    keys: any;
    listingKeys?: any;
    signalRepository: any;
    groupJid?: string;
    purgeRelatedSessions?: boolean;
    maxRefreshJids?: number;
}): Promise<RecoveryTargets>;
export declare function makeSessionRecovery(options: {
    keys: any;
    listingKeys?: any;
    signalRepository: any;
    assertSessions?: (jids: string[], force: boolean) => Promise<boolean>;
    messageRetryManager?: any;
    userDevicesCache?: any;
    ev?: any;
    logger?: any;
    options?: boolean | Partial<SessionRecoverySettings>;
}): SessionRecoveryManager;
