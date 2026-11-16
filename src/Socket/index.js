/* Zahan Baileys maintained distribution. Upstream notices and license are preserved in LICENSE and NOTICE.md. */
import { DEFAULT_CONNECTION_CONFIG } from '../Defaults/index.js';
import { delay } from '../Utils/generics.js';
import { downloadMediaMessage } from '../Utils/messages.js';
import { makeMediaDownloadCache } from '../Utils/media-download-cache.js';
import { prepareModernMessageContent } from '../Utils/modern-messages.js';
import { createSendRateLimiter, normalizeSendRateLimit, typingDelayMs } from '../Utils/send-rate-limit.js';
import { isJidNewsletter } from '../WABinary/index.js';
import { makeNewsletterStatusFetcher, makeNewsletterStatusUpdatesFetcher, makeNewsletterStatusReactionSender, makeNewsletterStatusRevokeSender, makeNewsletterStatusSender } from '../Utils/newsletter-status.js';
import { bindVoiceRecognition } from '../Utils/voice-recognition.js';
import { bindViewOnceRetrieval, downloadViewOnceMedia, openViewOnceMedia } from '../Utils/view-once.js';
import { bindResourceGuard } from '../Utils/resource-guard.js';
import { makeChannelStatusSender, makeStatusSender } from '../Utils/status-send.js';
import { makeCommunitiesSocket } from './communities.js';

const makeWASocket = (config) => {
    const newConfig = {
        ...DEFAULT_CONNECTION_CONFIG,
        ...config
    };
    const sock = makeCommunitiesSocket(newConfig);
    bindVoiceRecognition(sock, newConfig);
    const sendMessage = sock.sendMessage.bind(sock);
    const rateLimit = normalizeSendRateLimit(newConfig.sendRateLimit);
    const limiter = rateLimit ? createSendRateLimiter({ ...rateLimit, logger: newConfig.logger }) : null;
    const simulateTyping = async (jid) => {
        if (Array.isArray(jid) || jid === 'status@broadcast' || isJidNewsletter(jid) || typeof sock.sendPresenceUpdate !== 'function') {
            return;
        }
        try {
            await sock.sendPresenceUpdate('composing', jid);
            await delay(typingDelayMs(limiter.settings));
        }
        catch (error) {
            newConfig.logger?.debug?.({ jid, error: error?.message }, 'presence simulation failed');
        }
    };
    sock.sendMessage = (jid, content, options = {}) => {
        const prepared = prepareModernMessageContent(content);
        const { skipRateLimit, ...rest } = options ?? {};
        if (!limiter || skipRateLimit) {
            return sendMessage(jid, prepared, rest);
        }
        const chat = Array.isArray(jid) ? 'status@broadcast' : jid;
        return limiter.schedule(chat, async () => {
            if (limiter.settings.simulateTyping) {
                await simulateTyping(jid);
            }
            return sendMessage(jid, prepared, rest);
        }).finally(async () => {
            if (limiter.settings.simulateTyping && !Array.isArray(jid) && jid !== 'status@broadcast' && !isJidNewsletter(jid) && typeof sock.sendPresenceUpdate === 'function') {
                await sock.sendPresenceUpdate('paused', jid).catch(() => undefined);
            }
        });
    };
    sock.sendLimiter = limiter;
    sock.sendQueueStats = () => limiter?.stats() ?? null;
    sock.flushSendQueue = () => limiter?.drain() ?? Promise.resolve();
    sock.sendAiMessage = (jid, content, options = {}) => sock.sendMessage(jid, content, { ...options, aiLabel: true });
    sock.sendBizBotMessage = sock.sendAiMessage;
    const mediaCache = makeMediaDownloadCache(newConfig.mediaDownloadCache);
    sock.downloadMedia = async (message, type = 'buffer', options = {}, extra = {}) => {
        const recover = extra.recover !== false;
        const cacheable = type === 'buffer' && extra.cache !== false && mediaCache && message?.key;
        const cacheKey = cacheable ? `${message.key.remoteJid ?? ''}:${message.key.id ?? ''}` : undefined;
        if (cacheable) {
            const cached = mediaCache.get(cacheKey);
            if (cached) {
                return cached;
            }
        }
        const ctx = { logger: extra.logger ?? newConfig.logger };
        if (recover && typeof sock.updateMediaMessage === 'function') {
            ctx.reuploadRequest = sock.updateMediaMessage;
        }
        const result = await downloadMediaMessage(message, type, options, ctx);
        if (cacheable && Buffer.isBuffer(result)) {
            mediaCache.set(cacheKey, result);
        }
        return result;
    };
    sock.requestMediaReupload = (message) => sock.updateMediaMessage(message);
    sock.clearMediaCache = () => mediaCache?.clear();
    sock.mediaCacheStats = () => mediaCache?.stats() ?? null;
    sock.sendNewsletterStatus = makeNewsletterStatusSender(sock, newConfig);
    sock.sendNewsletterStatusReaction = makeNewsletterStatusReactionSender(sock);
    sock.revokeNewsletterStatus = makeNewsletterStatusRevokeSender(sock);
    sock.getNewsletterStatuses = makeNewsletterStatusFetcher(sock);
    sock.getNewsletterStatusUpdates = makeNewsletterStatusUpdatesFetcher(sock);
    sock.sendStatus = makeStatusSender(sock);
    sock.sendChannelStatus = makeChannelStatusSender(sock);
    sock.reactChannelStatus = sock.sendNewsletterStatusReaction;
    sock.revokeChannelStatus = sock.revokeNewsletterStatus;
    sock.getChannelStatuses = sock.getNewsletterStatuses;
    sock.getChannelStatusUpdates = sock.getNewsletterStatusUpdates;
    sock.openViewOnce = (message, options = {}) => openViewOnceMedia(message, { sock, logger: newConfig.logger, ...options });
    sock.downloadViewOnce = (message, options = {}) => downloadViewOnceMedia(message, { sock, logger: newConfig.logger, ...options });
    sock.retrieveViewOnce = sock.downloadViewOnce;
    sock.stopViewOnceRetrieval = bindViewOnceRetrieval(sock, newConfig);
    bindResourceGuard(sock, newConfig);
    if (newConfig.AnchorGuard) {
        import('@rexxhayanasi/elaina-anchorguard')
            .then(({ createAntiBugGuard }) => {
                sock.anchorGuard = createAntiBugGuard(sock, { logger: sock.logger, ...(newConfig.AnchorGuardConfig || {}) });
            })
            .catch((error) => {
                sock.logger?.warn?.({ error: error.message }, 'AnchorGuard is enabled but @rexxhayanasi/elaina-anchorguard is not installed. Run: npm install @rexxhayanasi/elaina-anchorguard');
            });
    }
    return sock;
};
export default makeWASocket;
