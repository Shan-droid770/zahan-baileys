/* Compile-only checks: `npm run test:types`. Nothing here runs. */
import makeWASocket, {
    type AnyMessageContent,
    type CheckNumbersOptions,
    type ContactCheckResult,
    type DownloadMediaOptions,
    type SendMessageOptions,
    type SendQueueStats,
    type SessionBackupOptions,
    exportSession,
    importSession,
    restoreSession
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

const backupOptions: SessionBackupOptions = { secret: 'a-long-enough-session-secret' };
const authState = { creds: {} as any, keys: {} as any, saveCreds: async () => undefined };
const exported: Promise<string> = exportSession(authState, backupOptions);
const imported = importSession('zsess1.x', backupOptions);
const restored = restoreSession(authState, 'zsess1.x', { ...backupOptions, replaceCreds: false });

export const _unused = [sent, sentLegacy, labeled, bufferDownload, streamDownload, reupload, clearedCache, queueStats, flushing, checked, cacheStats, exported, imported, restored];
