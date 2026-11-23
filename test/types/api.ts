/* Compile-only checks: `npm run test:types`. Nothing here runs. */
import makeWASocket, {
    type AnyMessageContent,
    type CheckNumbersOptions,
    type ContactCheckResult,
    type DownloadMediaOptions,
    type SendMessageOptions,
    type SendQueueStats,
    type SessionBackupOptions,
    type SessionRecoveryRequest,
    bindViewOnceCache,
    classifyRetryError,
    createSessionManager,
    exportSession,
    hasDownloadableViewOnceMedia,
    hydrateQuotedViewOnce,
    importSession,
    restoreSession,
    createSharedGroupMetadataCache
} from '../../src/index.js';

const socket = makeWASocket({ auth: {} as any });

const content: AnyMessageContent = { text: 'hello', aiLabel: true };
const legacy: AnyMessageContent = { text: 'hello', ai: true };
const options: SendMessageOptions = { aiLabel: true, quoted: {} as any, skipRateLimit: true };

const sent = socket.sendMessage('94770000000@s.whatsapp.net', content, options);
const sentLegacy = socket.sendMessage('94770000000@s.whatsapp.net', 'plain text', legacy);
const labeled = socket.sendAiMessage('94770000000@s.whatsapp.net', content);
const bufferDownload: Promise<Buffer> = socket.downloadMedia({ key: {} }, 'buffer', { startByte: 0 } satisfies DownloadMediaOptions);
const streamDownload: Promise<import('stream').Readable> = socket.downloadMedia({ key: {} }, 'stream');
const reupload = socket.requestMediaReupload({ key: {} });
const clearedCache: void = socket.clearMediaCache();
const queueStats: SendQueueStats | null = socket.sendQueueStats();
const flushing: Promise<void> = socket.flushSendQueue();

const checkOptions: CheckNumbersOptions = { cache: false, concurrency: 2, delayMs: 0 };
const checked: Promise<ContactCheckResult[]> = socket.checkNumbers(['94770000000', '94771111111'], checkOptions);
const cacheStats = socket.contactCheckStats();

const recoveryRequest: SessionRecoveryRequest = { reason: 'SignalErrorBadMac', refreshSessions: true, purgeSenderKeys: true };
const recovered = socket.recoverSession('94770000000:1@s.whatsapp.net', recoveryRequest);
const recoveredMany = socket.recoverSessions(['94770000000@s.whatsapp.net'], recoveryRequest);
const recoveryStats = socket.sessionRecoveryStats();
const errorCode = classifyRetryError({ attrs: { error: '7' } }).code;

const manager = createSessionManager({ concurrency: 3, reconnect: { maxAttempts: 5 } });
const added = manager.add('bot-1', { auth: {} as any });
const managerSockets = manager.list();
const managerStats = manager.stats();
const managerRecovery = manager.recover('bot-1', '94770000000@s.whatsapp.net', recoveryRequest);
const managerWithCache = createSessionManager({
    concurrency: 2,
    groupMetadataCache: { ttlMs: 30000, staleMs: 300000, maxEntries: 1000 }
});
const invalidated: boolean = managerWithCache.invalidateGroupMetadata('120363000000000000@g.us');
const groupCacheStats = managerWithCache.stats().groupMetadataCache;
const sharedCache = createSharedGroupMetadataCache({ ttlMs: 1000, staleMs: 1000, maxEntries: 10 });
const cachedGroup = sharedCache.get('120363000000000000@g.us', async () => ({ participants: [], addressingMode: 'pn' }));

const backupOptions: SessionBackupOptions = { secret: 'a-long-enough-session-secret' };
const authState = { creds: {} as any, keys: {} as any, saveCreds: async () => undefined };
const exported: Promise<string> = exportSession(authState, backupOptions);
const imported = importSession('zsess1.x', backupOptions);
const restored = restoreSession(authState, 'zsess1.x', { ...backupOptions, replaceCreds: false });
const voStoreSize: number = socket.viewOnceStore.size;
const voResolved = socket.resolveViewOnce({ key: {} });
const stopVoCache = bindViewOnceCache(socket);
const voHydrated: Promise<boolean> = hydrateQuotedViewOnce({ key: {}, message: {} }, { store: socket.viewOnceStore });
const voDownloadable: boolean = hasDownloadableViewOnceMedia({});

export const _unused = [sent, sentLegacy, labeled, bufferDownload, streamDownload, reupload, clearedCache, queueStats, flushing, checked, cacheStats, exported, imported, restored, recovered, recoveredMany, recoveryStats, errorCode, added, managerSockets, managerStats, managerRecovery, managerWithCache, invalidated, groupCacheStats, sharedCache, cachedGroup, voStoreSize, voResolved, stopVoCache, voHydrated, voDownloadable];
