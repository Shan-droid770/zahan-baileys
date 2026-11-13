/* Zahan Baileys maintained distribution. Upstream notices and license are preserved in LICENSE and NOTICE.md. */
import { Boom } from '@hapi/boom';
import { jidNormalizedUser } from '../WABinary/index.js';
import { downloadMediaMessage, normalizeMessageContent } from './messages.js';
import { TTLCache } from './ttl-cache.js';

export const VIEW_ONCE_WRAPPER_KEYS = Object.freeze(['viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension']);
export const VIEW_ONCE_MEDIA_KEYS = Object.freeze({
    imageMessage: 'image',
    videoMessage: 'video',
    audioMessage: 'audio'
});
export const DEFAULT_VIEW_ONCE_MAX_BYTES = 64 * 1024 * 1024;
export const DEFAULT_VIEW_ONCE_TRIGGER_EMOJIS = Object.freeze(['🔓', '📥']);
export const DEFAULT_VIEW_ONCE_CACHE_SIZE = 256;
export const DEFAULT_VIEW_ONCE_TTL_MS = 24 * 60 * 60 * 1000;

const TRANSPARENT_WRAPPERS = ['ephemeralMessage', 'editedMessage', 'documentWithCaptionMessage', 'associatedChildMessage', 'botForwardedMessage'];
const WRAPPER_KEYS = [...VIEW_ONCE_WRAPPER_KEYS, ...TRANSPARENT_WRAPPERS];

const findWrappedMessage = (message, keys = WRAPPER_KEYS) => {
    if (!message || typeof message !== 'object') {
        return undefined;
    }
    for (const key of keys) {
        const wrapper = message[key];
        if (wrapper && typeof wrapper === 'object' && wrapper.message) {
            return { key, message: wrapper.message };
        }
    }
    return undefined;
};

const hasViewOnceFlag = (message) => {
    if (!message || typeof message !== 'object') {
        return false;
    }
    for (const key of Object.keys(VIEW_ONCE_MEDIA_KEYS)) {
        if (message[key]?.viewOnce) {
            return true;
        }
    }
    return false;
};

export const unwrapViewOnce = (message) => {
    let current = message;
    let wrapped = false;
    for (let depth = 0; depth < 6; depth++) {
        const inner = findWrappedMessage(current);
        if (!inner) {
            break;
        }
        if (VIEW_ONCE_WRAPPER_KEYS.includes(inner.key)) {
            wrapped = true;
        }
        current = inner.message;
    }
    if (wrapped || hasViewOnceFlag(current)) {
        return current;
    }
    return undefined;
};

export const isViewOnceMessage = (message) => !!unwrapViewOnce(message);

const mediaTypeOfContent = (content) => {
    if (!content || typeof content !== 'object') {
        return undefined;
    }
    for (const [key, type] of Object.entries(VIEW_ONCE_MEDIA_KEYS)) {
        if (content[key]) {
            return type;
        }
    }
    return undefined;
};

export const getViewOnceMediaType = (message) => {
    const content = unwrapViewOnce(message);
    return content ? mediaTypeOfContent(content) : undefined;
};

export const describeViewOnce = (message) => {
    const content = unwrapViewOnce(message);
    const type = getViewOnceMediaType(message);
    if (!content || !type) {
        return undefined;
    }
    const media = content[`${type}Message`];
    return {
        type,
        mimetype: media.mimetype,
        caption: media.caption,
        fileName: media.fileName,
        ptt: media.ptt,
        fileLength: Number(media.fileLength) || undefined,
        width: media.width,
        height: media.height,
        seconds: media.seconds
    };
};

const contextInfoOf = (content) => {
    for (const value of Object.values(content ?? {})) {
        if (value && typeof value === 'object' && value.contextInfo?.quotedMessage) {
            return value.contextInfo;
        }
    }
    return undefined;
};

const storeKey = (jid, id) => `${jidNormalizedUser(jid)}:${id}`;

export const makeViewOnceStore = ({ max = DEFAULT_VIEW_ONCE_CACHE_SIZE, ttlMs = DEFAULT_VIEW_ONCE_TTL_MS } = {}) => {
    const cache = new TTLCache({ ttl: ttlMs, maxKeys: max });
    const remember = (message) => {
        const id = message?.key?.id;
        const chat = message?.key?.remoteJid;
        if (!id || !chat || !message.message) {
            return false;
        }
        cache.set(storeKey(chat, id), {
            key: { ...message.key, remoteJid: jidNormalizedUser(chat) },
            message: message.message
        });
        return true;
    };
    return {
        remember,
        get: (jid, id) => (jid && id ? cache.get(storeKey(jid, id)) : undefined),
        delete: (jid, id) => (jid && id ? cache.del(storeKey(jid, id)) : 0),
        get size() {
            return cache.size;
        },
        clear: () => cache.flushAll()
    };
};

export const openViewOnceMedia = async (message, options = {}) => {
    const {
        sock,
        logger,
        mode = 'stream',
        maxBytes = DEFAULT_VIEW_ONCE_MAX_BYTES,
        download = downloadMediaMessage
    } = options;
    const content = unwrapViewOnce(message?.message ?? message);
    const type = mediaTypeOfContent(content);
    if (!content || !type) {
        throw new Boom('Not a view-once media message', { statusCode: 400, data: message?.key });
    }
    const media = content[`${type}Message`];
    const declaredLength = Number(media.fileLength);
    if (Number.isFinite(declaredLength) && maxBytes && declaredLength > maxBytes) {
        throw new Boom(`View-once media is ${declaredLength} bytes, over the ${maxBytes} byte limit`, {
            statusCode: 413,
            data: { type, fileLength: declaredLength }
        });
    }
    const target = {
        key: message?.key,
        message: content
    };
    const downloaded = await download(target, mode === 'buffer' ? 'buffer' : 'stream', {}, {
        logger,
        reuploadRequest: sock?.updateMediaMessage ? messageToReupload => sock.updateMediaMessage(messageToReupload) : undefined
    });
    return {
        type,
        mimetype: media.mimetype,
        caption: media.caption,
        fileName: media.fileName,
        ptt: media.ptt,
        seconds: media.seconds,
        width: media.width,
        height: media.height,
        ...(mode === 'buffer' ? { buffer: downloaded } : { stream: downloaded })
    };
};

export const downloadViewOnceMedia = async (message, options = {}) => openViewOnceMedia(message, { ...options, mode: 'buffer' });

export const buildViewOncePayload = (media, options = {}) => {
    const { asDocument = false, captionPrefix, captionSuffix, mimetype, fileName } = options;
    const source = media.stream ? { stream: media.stream } : media.buffer;
    if (!source) {
        throw new Boom('View-once media has no stream or buffer', { statusCode: 400 });
    }
    const caption = [captionPrefix, media.caption, captionSuffix].filter(part => typeof part === 'string' && part.length).join(' ');
    if (asDocument && media.type !== 'audio') {
        const extension = media.type === 'image' ? 'jpg' : media.type === 'video' ? 'mp4' : 'bin';
        return {
            document: source,
            mimetype: mimetype || media.mimetype || 'application/octet-stream',
            fileName: fileName || media.fileName || `view-once.${extension}`,
            ...(caption ? { caption } : {})
        };
    }
    if (media.type === 'image') {
        return {
            image: source,
            ...(mimetype || media.mimetype ? { mimetype: mimetype || media.mimetype } : {}),
            ...(caption ? { caption } : {})
        };
    }
    if (media.type === 'video') {
        return {
            video: source,
            ...(mimetype || media.mimetype ? { mimetype: mimetype || media.mimetype } : {}),
            ...(caption ? { caption } : {}),
            ...(media.width && media.height ? { width: media.width, height: media.height } : {})
        };
    }
    return {
        audio: source,
        mimetype: mimetype || media.mimetype || 'audio/ogg; codecs=opus',
        ptt: media.ptt !== false,
        ...(media.seconds ? { seconds: media.seconds } : {})
    };
};

const VIEW_ONCE_DEFAULTS = Object.freeze({
    enabled: true,
    emojis: DEFAULT_VIEW_ONCE_TRIGGER_EMOJIS,
    react: true,
    reply: true,
    scope: 'all',
    mode: 'stream',
    asDocument: false,
    maxBytes: DEFAULT_VIEW_ONCE_MAX_BYTES,
    cacheSize: DEFAULT_VIEW_ONCE_CACHE_SIZE,
    ttlMs: DEFAULT_VIEW_ONCE_TTL_MS,
    singleUse: false,
    ackEmoji: '✅',
    captionPrefix: undefined,
    captionSuffix: undefined,
    forwardToJid: undefined,
    allowFromMe: false,
    onRetrieved: undefined,
    shouldRetrieve: undefined,
    logger: undefined,
    download: undefined,
    downloadOptions: undefined
});

export const normalizeViewOnceOptions = (value) => {
    if (value === false) {
        return { ...VIEW_ONCE_DEFAULTS, enabled: false };
    }
    if (value === true || value === undefined || value === null) {
        return { ...VIEW_ONCE_DEFAULTS };
    }
    return { ...VIEW_ONCE_DEFAULTS, ...value };
};

const normalizeEmojis = (emojis) => {
    if (emojis === null || emojis === undefined || emojis === '*' || emojis === 'any') {
        return null;
    }
    const list = Array.isArray(emojis) ? emojis : [emojis];
    const set = new Set(list.filter(item => typeof item === 'string' && item.length).map(item => item.trim()));
    return set.size ? set : null;
};

const isEmojiTrigger = (text, emojis) => {
    if (!text) {
        return false;
    }
    if (!emojis) {
        return true;
    }
    return emojis.has(String(text).trim());
};

const scopeAllows = (scope, chat, sender) => {
    if (scope === 'all' || scope === undefined) {
        return true;
    }
    const isGroup = typeof chat === 'string' && (chat.endsWith('@g.us') || chat.endsWith('@community'));
    if (scope === 'group') {
        return isGroup;
    }
    if (scope === 'dm') {
        return !isGroup;
    }
    if (scope === 'self') {
        return typeof sender === 'string' && typeof chat === 'string' && jidNormalizedUser(sender) === jidNormalizedUser(chat);
    }
    return false;
};

export const bindViewOnceRetrieval = (sock, config = {}) => {
    const options = normalizeViewOnceOptions(config.viewOnceRetrieval ?? config.viewOnce);
    if (!options.enabled) {
        return () => {};
    }
    const logger = options.logger ?? config.logger;
    const emojis = normalizeEmojis(options.emojis);
    const store = options.store ?? makeViewOnceStore({ max: options.cacheSize, ttlMs: options.ttlMs });
    const pending = new Set();

    const deliver = async ({ stored, chat, trigger, source }) => {
        const key = storeKey(stored.key.remoteJid, stored.key.id);
        if (pending.has(key)) {
            return undefined;
        }
        pending.add(key);
        try {
            if (typeof options.shouldRetrieve === 'function') {
                const allowed = await options.shouldRetrieve({ stored, chat, trigger, source });
                if (allowed === false) {
                    return undefined;
                }
            }
            const media = await openViewOnceMedia(stored, {
                sock,
                logger,
                mode: options.mode,
                maxBytes: options.maxBytes,
                download: options.download,
                ...(options.downloadOptions || {})
            });
            const payload = buildViewOncePayload(media, options);
            const destination = options.forwardToJid || chat;
            const sent = await sock.sendMessage(destination, payload, {
                quoted: trigger,
                ...(options.sendOptions || {})
            });
            if (options.singleUse) {
                store.delete(stored.key.remoteJid, stored.key.id);
            }
            if (options.ackEmoji) {
                await sock.sendMessage(chat, { react: { text: options.ackEmoji, key: trigger.key } }).catch(error => {
                    logger?.debug?.({ error, key: trigger.key }, 'view-once acknowledgement reaction failed');
                });
            }
            sock.ev?.emit?.('viewonce.retrieved', {
                key: stored.key,
                chat: destination,
                type: media.type,
                mimetype: media.mimetype,
                source,
                message: sent
            });
            if (typeof options.onRetrieved === 'function') {
                await options.onRetrieved({
                    key: stored.key,
                    chat: destination,
                    type: media.type,
                    mimetype: media.mimetype,
                    source,
                    media,
                    message: sent
                });
            }
            return sent;
        }
        catch (error) {
            logger?.warn?.({ error, key: stored?.key }, 'failed to open a view-once message');
            sock.ev?.emit?.('viewonce.failed', { key: stored?.key, chat, source, error });
            return undefined;
        }
        finally {
            pending.delete(key);
        }
    };

    const handler = async (event) => {
        const messages = Array.isArray(event?.messages) ? event.messages : [];
        for (const message of messages) {
            try {
                const chat = message?.key?.remoteJid;
                if (!message?.message || !chat || chat === 'status@broadcast') {
                    continue;
                }
                const content = normalizeMessageContent(message.message);
                if (!content) {
                    continue;
                }
                const fromMe = !!message.key.fromMe;
                if (fromMe && !options.allowFromMe) {
                    continue;
                }
                const scope = options.scope;
                const sender = message.key.participant || chat;
                if (!scopeAllows(scope, chat, sender)) {
                    continue;
                }

                if (content.reactionMessage) {
                    const targetKey = content.reactionMessage.key;
                    if (!options.react || !targetKey?.id || !targetKey.remoteJid) {
                        continue;
                    }
                    if (!isEmojiTrigger(content.reactionMessage.text, emojis)) {
                        continue;
                    }
                    const targetChat = targetKey.remoteJid;
                    if (targetChat === 'status@broadcast' || !scopeAllows(scope, targetChat, message.key.participant || targetChat)) {
                        continue;
                    }
                    const stored = store.get(targetChat, targetKey.id);
                    if (!stored) {
                        continue;
                    }
                    await deliver({ stored, chat: targetChat, trigger: message, source: 'reaction' });
                    continue;
                }

                if (isViewOnceMessage(message.message) || isViewOnceMessage(content)) {
                    store.remember(message);
                }

                if (!options.reply) {
                    continue;
                }
                const context = contextInfoOf(content) ?? contextInfoOf(message.message);
                if (!context?.quotedMessage || !context.stanzaId) {
                    continue;
                }
                const quoted = context.quotedMessage;
                let stored;
                if (isViewOnceMessage(quoted)) {
                    stored = {
                        key: {
                            remoteJid: chat,
                            id: context.stanzaId,
                            ...(context.participant ? { participant: context.participant } : {})
                        },
                        message: quoted
                    };
                }
                else {
                    stored = store.get(chat, context.stanzaId) ?? store.get(chat, context.quotedMessageId);
                }
                if (!stored) {
                    continue;
                }
                await deliver({ stored, chat, trigger: message, source: 'reply' });
            }
            catch (error) {
                logger?.warn?.({ error, key: message?.key }, 'view-once retrieval handler failed');
            }
        }
    };

    sock.ev.on('messages.upsert', handler);
    return () => {
        sock.ev.off('messages.upsert', handler);
        pending.clear();
        store.clear?.();
    };
};
