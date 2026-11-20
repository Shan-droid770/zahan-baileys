/* Zahan Baileys maintained distribution. Upstream notices and license are preserved in LICENSE and NOTICE.md. */
export interface MultiSessionReconnectOptions {
    enabled: boolean;
    maxAttempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
    jitter: number;
}

export interface MultiSessionManagerOptions {
    makeSocket?: (config: any) => any | Promise<any>;
    defaults?: Record<string, any>;
    logger?: any;
    concurrency?: number;
    autoSaveCreds?: boolean;
    reconnect?: boolean | Partial<MultiSessionReconnectOptions> & {
        maxReconnectAttempts?: number;
        reconnectBaseDelayMs?: number;
        reconnectMaxDelayMs?: number;
    };
    scheduler?: {
        setTimeout: (work: () => void, ms: number) => any;
        clearTimeout: (handle: any) => void;
    };
    random?: () => number;
    now?: () => number;
    hooks?: {
        onError?: (id: string, error: unknown, phase: string) => void;
        onOpen?: (id: string, update: any) => void;
        onClose?: (id: string, update: any) => void;
        onConnectionUpdate?: (id: string, update: any) => void;
        onRecovery?: (id: string, payload: any) => void;
    };
}

export interface MultiSessionDescriptor {
    id: string;
    state: string;
    connected: boolean;
    attempts: number;
    user?: string;
    startedAt?: number;
    openedAt?: number;
    lastCloseAt?: number;
    lastStatusCode?: number;
    queued: number;
    socket?: any;
}

export interface MultiSessionStats {
    added: number;
    removed: number;
    started: number;
    stopped: number;
    reconnects: number;
    failures: number;
    loggedOut: number;
    credsSaves: number;
    recoveries: number;
    sessions: number;
    connected: number;
    byState: Record<string, number>;
    shuttingDown: boolean;
    limiter: {
        active: number;
        pending: number;
        limit: number;
    };
    reconnect: MultiSessionReconnectOptions;
}

export interface MultiSessionManager {
    add(id: string, config?: Record<string, any>, options?: { start?: boolean }): Promise<any>;
    start(id: string): Promise<any>;
    stop(id: string): Promise<boolean>;
    restart(id: string): Promise<any>;
    remove(id: string): Promise<boolean>;
    get(id: string): MultiSessionDescriptor | undefined;
    socket(id: string): any;
    list(): MultiSessionDescriptor[];
    on(event: string, handler: (id: string, payload: any) => void): () => void;
    recover(id: string, jid: string, request?: Record<string, any>): Promise<any>;
    recoverAll(jids?: string[], request?: Record<string, any>): Promise<Array<{
        id: string;
        results: any[];
        error?: string;
    }>>;
    stats(): MultiSessionStats;
    shutdown(): Promise<void>;
}

export declare const MULTI_SESSION_DEFAULTS: Readonly<{
    concurrency: number;
    autoSaveCreds: boolean;
    reconnect: boolean;
    maxReconnectAttempts: number;
    reconnectBaseDelayMs: number;
    reconnectMaxDelayMs: number;
    jitter: number;
}>;
export declare function normalizeReconnectOptions(value?: boolean | Partial<MultiSessionReconnectOptions>): MultiSessionReconnectOptions;
export declare function reconnectDelay(attempt: number, options?: any, random?: () => number): number;
export declare function createConcurrencyLimiter(limit?: number): {
    schedule<T>(work: () => T | Promise<T>): Promise<T>;
    readonly active: number;
    readonly pending: number;
    readonly limit: number;
};
export declare function makeMultiSessionManager(options?: MultiSessionManagerOptions): MultiSessionManager;
