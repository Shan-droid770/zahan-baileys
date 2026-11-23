/* Zahan Baileys maintained distribution. Upstream notices and license are preserved in LICENSE and NOTICE.md. */
import { Boom } from '@hapi/boom';
import { jidNormalizedUser } from '../WABinary/index.js';
import { downloadMediaMessage, normalizeMessageContent } from './messages.js';
import { getUrlFromDirectPath } from './messages-media.js';
import { TTLCache } from './ttl-cache.js';

export const VIEW_ONCE_WRAPPER_KEYS = Object.freeze(['viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension']);
export const VIEW_ONCE_MEDIA_KEYS = Object.freeze({
    imageMessage: 'image',
    videoMessage: 'video',
    audioMessage: 'audio',
    ptvMessage: 'video',
    instantImageMessage: 'image'
});
export const DEFAULT_VIEW_ONCE_MAX_BYTES = 64 * 1024 * 1024;
export const DEFAULT_VIEW_ONCE_TRIGGER_EMOJIS = Object.freeze(['🔓', '📥']);
export const DEFAULT_VIEW_ONCE_CACHE_SIZE = 256;
export const DEFAULT_VIEW_ONCE_TTL_MS = 24 * 60 * 60 * 1000;

const TRANSPARENT_WRAPPERS = [
    'ephemeralMessage',
    'editedMessage',
    'documentWithCaptionMessage',
    'associatedChildMessage',
    'botForwardedMessage',
    'spoilerMessage',
    'groupMentionedMessage',
    'limitSharingMessage',
    'botInvokeMessage',
    'lottieStickerMessage',
    'groupStatusMessage',
    'groupStatusMessageV2',
    'groupStatusMentionMessage',
    'statusMentionMessage',
    'deviceSentMessage'
];
const WRAPPER_KEYS = [...VIEW_ONCE_WRAPPER_KEYS, ...TRANSPARENT_WRAPPERS];
const MEDIA_CRITICAL_FIELDS = new Set([
    'url',
    'directPath',
    'mediaKey',
    'fileSha256',
    'fileEncSha256',
    'fileLength',
    'mediaKeyTimestamp',
    'viewOnce'
]);

const isEmptyBinary = (value) => {
    if (value === undefined || value === null || value === '') {
        return true;
    }
    if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) {
        return value.byteLength === 0;
    }
    if (Array.isArray(value)) {
        return value.length === 0;
    }
    if (typeof value === 'object' && value.type === 'Buffer' && Array.isArray(value.data)) {
        return value.data.length === 0;
    }
    return false;
};

const hasUsableMediaKey = (mediaKey) => {
    if (!mediaKey) {
        return false;
    }
    if (typeof mediaKey === 'string') {
        return mediaKey.trim().length > 0;
    }
    if (ArrayBuffer.isView(mediaKey) || mediaKey instanceof ArrayBuffer) {
        return mediaKey.byteLength > 0;
    }
    if (Array.isArray(mediaKey)) {
        return mediaKey.length > 0;
    }
    if (typeof mediaKey === 'object') {
        if (mediaKey.type === 'Buffer' && Array.isArray(mediaKey.data)) {
            return mediaKey.data.length > 0;
        }
        return Object.keys(mediaKey).some(key => /^\d+$/.test(key));
    }
    return false;
};

const hasMediaLocation = (media) => Boolean(
    (typeof media?.url === 'string' && media.url.length > 0) ||
    (typeof media?.directPath === 'string' && media.directPath.length > 0)
);

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

const extractViewOnceMedia = (content) => {
    if (!content || typeof content !== 'object') {
        return undefined;
    }
    for (const [key, type] of Object.entries(VIEW_ONCE_MEDIA_KEYS)) {
        const media = content[key];
        if (media && typeof media === 'object') {
            return { key, type, media };
        }
    }
    return undefined;
};

const hasViewOnceFlag = (message) => Boolean(extractViewOnceMedia(message)?.media?.viewOnce);

export const unwrapViewOnce = (message) => {
    let current = message;
    let wrapped = false;
    for (let depth = 0; depth < 8; depth++) {
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

export const hasDownloadableViewOnceMedia = (message) => {
    const content = unwrapViewOnce(message?.message ?? message);
    const info = extractViewOnceMedia(content);
    return Boolean(info && hasUsableMediaKey(info.media.mediaKey) && hasMediaLocation(info.media));
};

export const getViewOnceMediaType = (message) => {
    const content = unwrapViewOnce(message);
    return extractViewOnceMedia(content)?.type;
};

export const describeViewOnce = (message) => {
    const content = unwrapViewOnce(message);
    const info = extractViewOnceMedia(content);
    if (!content || !info) {
        return undefined;
    }
    const { type, media } = info;
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

const collectQuoteContexts = (message) => {
    const contexts = [];
    const seen = new Set();
    const visitContainer = (container) => {
        if (!container || typeof container !== 'object') {
            return;
        }
        for (const value of Object.values(container)) {
            if (value && typeof value === 'object' && value.contextInfo && typeof value.contextInfo === 'object') {
                const ctx = value.contextInfo;
                if ((ctx.quotedMessage || ctx.stanzaId || ctx.quotedMessageId) && !seen.has(ctx)) {
                    seen.add(ctx);
                    contexts.push(ctx);
                }
            }
        }
    };
    let current = message?.message ?? message;
    for (let depth = 0; depth < 8 && current && typeof current === 'object'; depth++) {
        visitContainer(current);
        const edited = current.protocolMessage?.editedMessage;
        if (edited && typeof edited === 'object') {
            visitContainer(edited);
        }
        const inner = findWrappedMessage(current);
        if (!inner) {
            break;
        }
        current = inner.message;
    }
    return contexts;
};

const contextInfoOf = (content) => {
    for (const value of Object.values(content ?? {})) {
        if (value && typeof value === 'object' && (value.contextInfo?.quotedMessage || value.contextInfo?.stanzaId)) {
            return value.contextInfo;
        }
    }
    return undefined;
};

const isSharedChatJid = (jid) => typeof jid === 'string' && (jid.endsWith('@g.us') || jid.endsWith('@community') || jid.endsWith('@newsletter'));

const storeKey = (jid, id) => `${jidNormalizedUser(jid)}:${id}`;

export const makeViewOnceStore = ({ max = DEFAULT_VIEW_ONCE_CACHE_SIZE, ttlMs = DEFAULT_VIEW_ONCE_TTL_MS } = {}) => {
    const cache = new TTLCache({ ttl: ttlMs, maxKeys: max });
    const altKeys = new Map();
    const byId = new Map();

    const pruneStaleIndexes = () => {
        if (byId.size <= max * 2 && altKeys.size <= max * 2) {
            return;
        }
        for (const [id, keys] of byId.entries()) {
            for (const pk of keys) {
                if (!cache.get(pk)) {
                    keys.delete(pk);
                }
            }
            if (!keys.size) {
                byId.delete(id);
            }
        }
        for (const [altKey, pk] of altKeys.entries()) {
            if (!cache.get(pk)) {
                altKeys.delete(altKey);
            }
        }
    };

    const remember = (message) => {
        const id = message?.key?.id;
        const chat = message?.key?.remoteJid;
        if (!id || !chat || !message?.message || !isViewOnceMessage(message.message)) {
            return false;
        }
        const normalizedChat = jidNormalizedUser(chat);
        const primaryKey = storeKey(normalizedChat, id);
        const existing = cache.get(primaryKey);
        if (existing && hasDownloadableViewOnceMedia(existing.message) && !hasDownloadableViewOnceMedia(message.message)) {
            return false;
        }
        const entry = {
            key: { ...message.key, remoteJid: normalizedChat },
            message: message.message
        };
        cache.set(primaryKey, entry);
        let idSet = byId.get(id);
        if (!idSet) {
            idSet = new Set();
            byId.set(id, idSet);
        }
        idSet.add(primaryKey);
        if (typeof message.key.remoteJidAlt === 'string' && message.key.remoteJidAlt) {
            altKeys.set(storeKey(message.key.remoteJidAlt, id), primaryKey);
        }
        pruneStaleIndexes();
        return true;
    };

    const get = (jid, id) => {
        if (!jid || !id) {
            return undefined;
        }
        const key = storeKey(jid, id);
        const direct = cache.get(key);
        if (direct) {
            return direct;
        }
        const altPrimary = altKeys.get(key);
        if (altPrimary) {
            const altEntry = cache.get(altPrimary);
            if (altEntry) {
                return altEntry;
            }
            altKeys.delete(key);
        }
        return undefined;
    };

    const getById = (id, preferredJid) => {
        if (!id) {
            return undefined;
        }
        if (preferredJid) {
            const direct = get(preferredJid, id);
            if (direct) {
                return direct;
            }
        }
        const keys = byId.get(id);
        if (!keys?.size) {
            return undefined;
        }
        const normalizedPreferred = preferredJid ? jidNormalizedUser(preferredJid) : undefined;
        const preferredIsShared = isSharedChatJid(normalizedPreferred);
        let fallback;
        for (const pk of keys) {
            const entry = cache.get(pk);
            if (!entry) {
                keys.delete(pk);
                continue;
            }
            const entryChat = entry.key?.remoteJid;
            const entryAlt = entry.key?.remoteJidAlt ? jidNormalizedUser(entry.key.remoteJidAlt) : undefined;
            if (normalizedPreferred) {
                const sameChat = entryChat === normalizedPreferred || entryAlt === normalizedPreferred;
                if (preferredIsShared && !sameChat) {
                    continue;
                }
                if (!preferredIsShared && isSharedChatJid(entryChat) && !sameChat) {
                    continue;
                }
            }
            if (hasDownloadableViewOnceMedia(entry.message)) {
                return entry;
            }
            fallback ??= entry;
        }
        if (!keys.size) {
            byId.delete(id);
        }
        return fallback;
    };

    const remove = (jid, id) => {
        if (!jid || !id) {
            return 0;
        }
        const key = storeKey(jid, id);
        const primary = cache.get(key) ? key : altKeys.get(key);
        if (!primary) {
            return 0;
        }
        const entry = cache.get(primary);
        const removed = cache.del(primary);
        altKeys.delete(key);
        if (entry?.key?.remoteJidAlt) {
            altKeys.delete(storeKey(entry.key.remoteJidAlt, id));
        }
        const idSet = byId.get(id);
        if (idSet) {
            idSet.delete(primary);
            if (!idSet.size) {
                byId.delete(id);
            }
        }
        return removed;
    };

    return {
        remember,
        get,
        getById,
        delete: remove,
        get size() {
            return cache.size;
        },
        clear: () => {
            cache.flushAll();
            altKeys.clear();
            byId.clear();
        }
    };
};

const uniqueValues = (values) => [...new Set(values.filter(value => typeof value === 'string' && value.length > 0))];

const findViewOnceWrapperKey = (message) => {
    let current = message?.message ?? message;
    for (let depth = 0; depth < 8 && current && typeof current === 'object'; depth++) {
        const inner = findWrappedMessage(current);
        if (!inner) {
            break;
        }
        if (VIEW_ONCE_WRAPPER_KEYS.includes(inner.key)) {
            return inner.key;
        }
        current = inner.message;
    }
    return 'viewOnceMessageV2';
};

const buildCleanViewOnceMedia = (originalMessage, mediaKeyName, media) => {
    const clean = { ...media };
    delete clean.contextInfo;
    if (!clean.url && typeof clean.directPath === 'string' && clean.directPath.length > 0) {
        clean.url = getUrlFromDirectPath(clean.directPath);
    }
    if (mediaKeyName !== 'ptvMessage' && clean.viewOnce === undefined) {
        clean.viewOnce = true;
    }
    return clean;
};

const resolveTargetsSync = ({ jids, ids, store, messageRetryManager, requireDownloadable = true }) => {
    const matches = (msg) => {
        if (!msg || !isViewOnceMessage(msg.message ?? msg)) {
            return false;
        }
        return !requireDownloadable || hasDownloadableViewOnceMedia(msg.message ?? msg);
    };
    if (store) {
        for (const id of ids) {
            for (const jid of jids) {
                const entry = store.get?.(jid, id);
                if (matches(entry)) {
                    return entry;
                }
            }
            if (typeof store.getById === 'function') {
                for (const jid of jids) {
                    const entry = store.getById(id, jid);
                    if (matches(entry)) {
                        return entry;
                    }
                }
                if (!jids.length) {
                    const entry = store.getById(id);
                    if (matches(entry)) {
                        return entry;
                    }
                }
            }
        }
    }
    if (messageRetryManager?.getRecentMessage) {
        for (const id of ids) {
            for (const jid of jids) {
                const recent = messageRetryManager.getRecentMessage(jid, id);
                const msg = recent?.message;
                if (msg && matches({ message: msg })) {
                    return {
                        key: { remoteJid: jidNormalizedUser(jid), id },
                        message: msg
                    };
                }
            }
        }
    }
    return undefined;
};

const resolveTargetsAsync = async ({ jids, ids, participant, store, messageRetryManager, getMessage, logger, requireDownloadable = true }) => {
    const syncEntry = resolveTargetsSync({ jids, ids, store, messageRetryManager, requireDownloadable });
    if (syncEntry) {
        return syncEntry;
    }
    if (typeof getMessage !== 'function') {
        return undefined;
    }
    for (const id of ids) {
        for (const jid of jids) {
            try {
                const loaded = await getMessage({
                    remoteJid: jid,
                    id,
                    ...(participant ? { participant } : {})
                });
                const loadedMessage = loaded?.message ?? (loaded && !loaded.key && isViewOnceMessage(loaded) ? loaded : undefined);
                if (!loadedMessage || !isViewOnceMessage(loadedMessage)) {
                    continue;
                }
                if (requireDownloadable && !hasDownloadableViewOnceMedia(loadedMessage)) {
                    continue;
                }
                const normalized = {
                    key: {
                        remoteJid: jidNormalizedUser(loaded?.key?.remoteJid || jid),
                        id: loaded?.key?.id || id,
                        ...(loaded?.key || {})
                    },
                    message: loadedMessage
                };
                store?.remember?.(normalized);
                return normalized;
            }
            catch (error) {
                logger?.debug?.({ error, jid, id }, 'getMessage lookup failed during view-once resolution');
            }
        }
    }
    return undefined;
};

const hydrateContextWithOriginal = (context, original) => {
    const origUnwrapped = unwrapViewOnce(original?.message ?? original);
    const origInfo = extractViewOnceMedia(origUnwrapped);
    if (!origInfo) {
        return false;
    }
    const cleanMedia = buildCleanViewOnceMedia(original?.message ?? original, origInfo.key, origInfo.media);
    const quoted = context.quotedMessage;
    const quotedContent = quoted ? unwrapViewOnce(quoted) : undefined;
    const quotedInfo = quotedContent ? extractViewOnceMedia(quotedContent) : undefined;

    if (quotedInfo?.media) {
        for (const [field, value] of Object.entries(cleanMedia)) {
            if (value === undefined || value === null) {
                continue;
            }
            const current = quotedInfo.media[field];
            if (MEDIA_CRITICAL_FIELDS.has(field)) {
                if (isEmptyBinary(current) || field === 'url' || field === 'directPath' || field === 'mediaKey') {
                    quotedInfo.media[field] = value;
                }
            }
            else if (isEmptyBinary(current)) {
                quotedInfo.media[field] = value;
            }
        }
        return true;
    }

    if (quotedContent && typeof quotedContent === 'object') {
        quotedContent[origInfo.key] = cleanMedia;
        return true;
    }

    if (quoted && typeof quoted === 'object') {
        for (const wrapperKey of VIEW_ONCE_WRAPPER_KEYS) {
            if (quoted[wrapperKey] && typeof quoted[wrapperKey] === 'object') {
                quoted[wrapperKey].message = { [origInfo.key]: cleanMedia };
                return true;
            }
        }
    }

    const wrapperKey = findViewOnceWrapperKey(original?.message ?? original);
    context.quotedMessage = {
        [wrapperKey]: {
            message: {
                [origInfo.key]: cleanMedia
            }
        }
    };
    return true;
};

const ensureDirectPathUrl = (quoted) => {
    const info = extractViewOnceMedia(unwrapViewOnce(quoted));
    if (info?.media && !info.media.url && typeof info.media.directPath === 'string' && info.media.directPath.length > 0) {
        info.media.url = getUrlFromDirectPath(info.media.directPath);
    }
};

const candidateJidsForContext = (message, context) => uniqueValues([
    context?.remoteJid,
    message?.key?.remoteJid,
    message?.key?.remoteJidAlt
]);

const candidateIdsForContext = (context) => uniqueValues([
    context?.stanzaId,
    context?.quotedMessageId
]);

export const needsQuotedViewOnceHydration = (message, store) => {
    const contexts = collectQuoteContexts(message);
    if (!contexts.length) {
        return false;
    }
    for (const context of contexts) {
        const ids = candidateIdsForContext(context);
        if (!ids.length) {
            continue;
        }
        const quoted = context.quotedMessage;
        if (quoted && isViewOnceMessage(quoted)) {
            if (!hasDownloadableViewOnceMedia(quoted)) {
                return true;
            }
            ensureDirectPathUrl(quoted);
            continue;
        }
        if (store) {
            const jids = candidateJidsForContext(message, context);
            const hit = resolveTargetsSync({ jids, ids, store, requireDownloadable: true });
            if (hit) {
                return true;
            }
        }
        if (!quoted || typeof quoted !== 'object' || !Object.keys(quoted).length || quoted.placeholderMessage) {
            return true;
        }
    }
    return false;
};

export const hydrateQuotedViewOnceSync = (message, { store, messageRetryManager } = {}) => {
    const contexts = collectQuoteContexts(message);
    if (!contexts.length) {
        return false;
    }
    let hydrated = false;
    for (const context of contexts) {
        const ids = candidateIdsForContext(context);
        if (!ids.length) {
            continue;
        }
        const quoted = context.quotedMessage;
        if (quoted && isViewOnceMessage(quoted) && hasDownloadableViewOnceMedia(quoted)) {
            ensureDirectPathUrl(quoted);
            continue;
        }
        const jids = candidateJidsForContext(message, context);
        const original = resolveTargetsSync({ jids, ids, store, messageRetryManager, requireDownloadable: true });
        if (original && hydrateContextWithOriginal(context, original)) {
            hydrated = true;
        }
    }
    return hydrated;
};

export const hydrateQuotedViewOnce = async (message, { store, messageRetryManager, getMessage, logger } = {}) => {
    const contexts = collectQuoteContexts(message);
    if (!contexts.length) {
        return false;
    }
    let hydrated = false;
    for (const context of contexts) {
        const ids = candidateIdsForContext(context);
        if (!ids.length) {
            continue;
        }
        const quoted = context.quotedMessage;
        if (quoted && isViewOnceMessage(quoted) && hasDownloadableViewOnceMedia(quoted)) {
            ensureDirectPathUrl(quoted);
            continue;
        }
        const jids = candidateJidsForContext(message, context);
        const quotedLooksViewOnce = isViewOnceMessage(quoted);
        const quotedIsEmptyStub = !quoted || typeof quoted !== 'object' || !Object.keys(quoted).length || Boolean(quoted.placeholderMessage);
        const original = quotedLooksViewOnce || quotedIsEmptyStub
            ? await resolveTargetsAsync({
                jids,
                ids,
                participant: context.participant,
                store,
                messageRetryManager,
                getMessage,
                logger,
                requireDownloadable: true
            })
            : resolveTargetsSync({ jids, ids, store, messageRetryManager, requireDownloadable: true });
        if (original && hydrateContextWithOriginal(context, original)) {
            hydrated = true;
        }
    }
    return hydrated;
};

export const resolveViewOnceMessage = async (message, options = {}) => {
    const store = options.store ?? options.sock?.viewOnceStore;
    const messageRetryManager = options.messageRetryManager ?? options.sock?.messageRetryManager;
    const getMessage = options.getMessage ?? options.sock?.getMessage;
    const logger = options.logger;

    if (hasDownloadableViewOnceMedia(message)) {
        const cloned = {
            key: message?.key,
            message: message?.message ?? message
        };
        ensureDirectPathUrl(cloned.message);
        return cloned;
    }

    const keyIds = uniqueValues([message?.key?.id]);
    const keyJids = uniqueValues([message?.key?.remoteJid, message?.key?.remoteJidAlt]);
    if (keyIds.length) {
        const resolvedByKey = await resolveTargetsAsync({
            jids: keyJids,
            ids: keyIds,
            participant: message?.key?.participant,
            store,
            messageRetryManager,
            getMessage,
            logger,
            requireDownloadable: true
        });
        if (resolvedByKey) {
            return resolvedByKey;
        }
    }

    const contexts = collectQuoteContexts(message);
    for (const context of contexts) {
        const ids = candidateIdsForContext(context);
        const jids = candidateJidsForContext(message, context);
        if (ids.length) {
            const resolvedFromQuote = await resolveTargetsAsync({
                jids,
                ids,
                participant: context.participant,
                store,
                messageRetryManager,
                getMessage,
                logger,
                requireDownloadable: true
            });
            if (resolvedFromQuote) {
                return resolvedFromQuote;
            }
        }
        if (context.quotedMessage && isViewOnceMessage(context.quotedMessage)) {
            return {
                key: {
                    remoteJid: jids[0],
                    id: ids[0],
                    ...(context.participant ? { participant: context.participant } : {})
                },
                message: context.quotedMessage
            };
        }
    }

    if (isViewOnceMessage(message?.message ?? message)) {
        return {
            key: message?.key,
            message: message?.message ?? message
        };
    }

    return undefined;
};

export const openViewOnceMedia = async (message, options = {}) => {
    const {
        sock,
        logger,
        mode = 'stream',
        maxBytes = DEFAULT_VIEW_ONCE_MAX_BYTES,
        recover = true,
        download = downloadMediaMessage,
        downloadOptions,
        store = sock?.viewOnceStore,
        getMessage = sock?.getMessage,
        messageRetryManager = sock?.messageRetryManager
    } = options;

    const resolved = await resolveViewOnceMessage(message, {
        sock,
        store,
        getMessage,
        messageRetryManager,
        logger
    });
    const content = unwrapViewOnce(resolved?.message ?? message?.message ?? message);
    const info = extractViewOnceMedia(content);
    if (!content || !info) {
        throw new Boom('Not a view-once media message', { statusCode: 400, data: message?.key });
    }
    const { key: mediaKeyName, type, media } = info;
    if (!options.download && (!hasUsableMediaKey(media.mediaKey) || !hasMediaLocation(media))) {
        throw new Boom('View-once media is missing mediaKey or url/directPath and was not found in cache', {
            statusCode: 422,
            data: { key: resolved?.key ?? message?.key, type }
        });
    }
    const declaredLength = Number(media.fileLength);
    if (Number.isFinite(declaredLength) && maxBytes && declaredLength > maxBytes) {
        throw new Boom(`View-once media is ${declaredLength} bytes, over the ${maxBytes} byte limit`, {
            statusCode: 413,
            data: { type, fileLength: declaredLength }
        });
    }
    const normalizedDownloadContent = mediaKeyName === 'instantImageMessage'
        ? { imageMessage: media }
        : content;
    const target = {
        key: resolved?.key ?? message?.key,
        message: normalizedDownloadContent
    };
    const downloaded = await download(target, mode === 'buffer' ? 'buffer' : 'stream', downloadOptions ?? {}, {
        logger,
        ...(recover && sock?.updateMediaMessage ? { reuploadRequest: messageToReupload => sock.updateMediaMessage(messageToReupload) } : {})
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
    emojis: null,
    react: true,
    reply: true,
    scope: 'all',
    mode: 'stream',
    asDocument: false,
    maxBytes: DEFAULT_VIEW_ONCE_MAX_BYTES,
    cacheSize: DEFAULT_VIEW_ONCE_CACHE_SIZE,
    ttlMs: DEFAULT_VIEW_ONCE_TTL_MS,
    singleUse: false,
    recover: true,
    ackEmoji: '✅',
    captionPrefix: undefined,
    captionSuffix: undefined,
    forwardToJid: undefined,
    allowFromMe: false,
    onRetrieved: undefined,
    shouldRetrieve: undefined,
    logger: undefined,
    download: undefined,
    downloadOptions: undefined,
    getMessage: undefined
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

export const bindViewOnceCache = (sock, options = {}) => {
    const store = options.store ?? sock?.viewOnceStore;
    if (!store || typeof sock?.ev?.on !== 'function') {
        return () => {};
    }
    const messageRetryManager = options.messageRetryManager ?? sock?.messageRetryManager;
    const onUpsert = (event) => {
        const messages = Array.isArray(event?.messages) ? event.messages : [];
        for (const message of messages) {
            if (!message?.message || !message?.key?.remoteJid || message.key.remoteJid === 'status@broadcast') {
                continue;
            }
            if (isViewOnceMessage(message.message)) {
                store.remember(message);
            }
            hydrateQuotedViewOnceSync(message, { store, messageRetryManager });
        }
    };
    const onUpdate = (updates) => {
        if (!Array.isArray(updates)) {
            return;
        }
        for (const item of updates) {
            const msg = item?.update?.message;
            if (msg && item?.key && isViewOnceMessage(msg)) {
                store.remember({ key: item.key, message: msg });
            }
        }
    };
    const onHistory = (event) => {
        const messages = Array.isArray(event?.messages) ? event.messages : [];
        const viewOnceMessages = [];
        for (const message of messages) {
            if (message?.key?.remoteJid && message.key.remoteJid !== 'status@broadcast' && hasDownloadableViewOnceMedia(message)) {
                viewOnceMessages.push(message);
            }
        }
        viewOnceMessages.sort((a, b) => Number(a?.messageTimestamp || 0) - Number(b?.messageTimestamp || 0));
        for (const message of viewOnceMessages) {
            store.remember(message);
        }
    };
    sock.ev.on('messages.upsert', onUpsert);
    sock.ev.on('messages.update', onUpdate);
    sock.ev.on('messaging-history.set', onHistory);
    return () => {
        sock.ev.off?.('messages.upsert', onUpsert);
        sock.ev.off?.('messages.update', onUpdate);
        sock.ev.off?.('messaging-history.set', onHistory);
        if (options.clearOnStop) {
            store.clear?.();
        }
    };
};

export const bindViewOnceRetrieval = (sock, config = {}) => {
    const options = normalizeViewOnceOptions(config.viewOnceRetrieval ?? config.viewOnce);
    if (!options.enabled) {
        return () => {};
    }
    const logger = options.logger ?? config.logger;
    const emojis = normalizeEmojis(options.emojis);
    const ownsStore = !options.store && !sock?.viewOnceStore;
    const store = options.store ?? sock?.viewOnceStore ?? makeViewOnceStore({ max: options.cacheSize, ttlMs: options.ttlMs });
    const getMessage = options.getMessage ?? config.getMessage ?? sock?.getMessage;
    const messageRetryManager = sock?.messageRetryManager;
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
                store,
                getMessage,
                messageRetryManager,
                mode: options.mode,
                maxBytes: options.maxBytes,
                recover: options.recover,
                download: options.download,
                downloadOptions: options.downloadOptions
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
                if (isViewOnceMessage(message.message) || isViewOnceMessage(content)) {
                    store.remember(message);
                }
                hydrateQuotedViewOnceSync(message, { store, messageRetryManager });

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
                    const stored = await resolveTargetsAsync({
                        jids: uniqueValues([targetChat, message.key.remoteJidAlt]),
                        ids: [targetKey.id],
                        participant: targetKey.participant,
                        store,
                        messageRetryManager,
                        getMessage,
                        logger,
                        requireDownloadable: false
                    });
                    if (!stored) {
                        continue;
                    }
                    await deliver({ stored, chat: targetChat, trigger: message, source: 'reaction' });
                    continue;
                }

                if (!options.reply) {
                    continue;
                }
                const context = contextInfoOf(content) ?? contextInfoOf(message.message);
                if (!context?.stanzaId && !context?.quotedMessageId) {
                    continue;
                }
                const quoted = context.quotedMessage;
                const quoteIds = candidateIdsForContext(context);
                const quoteJids = candidateJidsForContext(message, context);
                const quotedLooksViewOnce = isViewOnceMessage(quoted);
                const quotedIsEmptyStub = !quoted || typeof quoted !== 'object' || !Object.keys(quoted).length || Boolean(quoted.placeholderMessage);

                let stored = await resolveTargetsAsync({
                    jids: quoteJids,
                    ids: quoteIds,
                    participant: context.participant,
                    store,
                    messageRetryManager,
                    getMessage: quotedLooksViewOnce || quotedIsEmptyStub ? getMessage : undefined,
                    logger,
                    requireDownloadable: true
                });
                if (!stored && quotedLooksViewOnce) {
                    stored = {
                        key: {
                            remoteJid: quoteJids[0] || chat,
                            id: quoteIds[0],
                            ...(context.participant ? { participant: context.participant } : {})
                        },
                        message: quoted
                    };
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
        if (ownsStore) {
            store.clear?.();
        }
    };
};
