/* Zahan Baileys maintained distribution. Upstream notices and license are preserved in LICENSE and NOTICE.md. */
import { DEFAULT_CONNECTION_CONFIG } from '../Defaults/index.js';
import { prepareModernMessageContent } from '../Utils/modern-messages.js';
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
    sock.sendMessage = (jid, content, options = {}) => sendMessage(jid, prepareModernMessageContent(content), options);
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
