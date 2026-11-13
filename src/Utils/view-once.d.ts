/* Zahan Baileys maintained distribution. Upstream notices and license are preserved in LICENSE and NOTICE.md. */
export const VIEW_ONCE_WRAPPER_KEYS: readonly string[];
export const VIEW_ONCE_MEDIA_KEYS: Readonly<{
    imageMessage: string;
    videoMessage: string;
    audioMessage: string;
}>;
export const DEFAULT_VIEW_ONCE_MAX_BYTES: number;
export const DEFAULT_VIEW_ONCE_TRIGGER_EMOJIS: readonly string[];
export const DEFAULT_VIEW_ONCE_CACHE_SIZE: number;
export const DEFAULT_VIEW_ONCE_TTL_MS: number;
export function isViewOnceMessage(message: any): boolean;
export function unwrapViewOnce(message: any): any;
export function getViewOnceMediaType(message: any): 'image' | 'video' | 'audio' | undefined;
export function describeViewOnce(message: any): {
    type: 'image' | 'video' | 'audio';
    mimetype: any;
    caption: any;
    fileName: any;
    ptt: any;
    fileLength: number | undefined;
    width: any;
    height: any;
    seconds: any;
} | undefined;
export type ViewOnceStore = {
    remember(message: any): boolean;
    get(jid: string, id: string): any;
    delete(jid: string, id: string): number;
    readonly size: number;
    clear(): void;
};
export function makeViewOnceStore(options?: {
    max?: number;
    ttlMs?: number;
}): ViewOnceStore;
export function openViewOnceMedia(message: any, options?: any): Promise<any>;
export function downloadViewOnceMedia(message: any, options?: any): Promise<any>;
export function buildViewOncePayload(media: any, options?: any): any;
export type ViewOnceRetrievalOptions = {
    enabled?: boolean;
    emojis?: string[] | string | null;
    react?: boolean;
    reply?: boolean;
    scope?: 'all' | 'dm' | 'group' | 'self';
    mode?: 'stream' | 'buffer';
    asDocument?: boolean;
    maxBytes?: number;
    cacheSize?: number;
    ttlMs?: number;
    singleUse?: boolean;
    ackEmoji?: string | null;
    captionPrefix?: string;
    captionSuffix?: string;
    forwardToJid?: string;
    allowFromMe?: boolean;
    onRetrieved?: (info: any) => void | Promise<void>;
    shouldRetrieve?: (info: any) => boolean | Promise<boolean>;
    download?: (message: any, type: string, options: any, ctx: any) => Promise<any>;
    downloadOptions?: Record<string, any>;
    sendOptions?: Record<string, any>;
    logger?: any;
    store?: ViewOnceStore;
};
export function normalizeViewOnceOptions(value?: boolean | ViewOnceRetrievalOptions): ViewOnceRetrievalOptions;
export function bindViewOnceRetrieval(sock: any, config?: any): () => void;
