/* Zahan Baileys maintained distribution. Upstream notices and license are preserved in LICENSE and NOTICE.md. */
import { Boom } from '@hapi/boom';
import { isJidGroup, isJidNewsletter, jidNormalizedUser } from '../WABinary/index.js';
import { prepareStatusMedia } from './status-media.js';

export const STATUS_BROADCAST_JID = 'status@broadcast';

const assertContent = (content) => {
    if (!content || typeof content !== 'object' || Array.isArray(content)) {
        throw new Boom('Status content must be an object such as { text } or { image }', { statusCode: 400 });
    }
};

const uniqueJids = (list) => {
    const seen = new Set();
    const result = [];
    for (const jid of list) {
        if (typeof jid !== 'string' || !jid) {
            throw new TypeError(`Invalid status recipient: ${JSON.stringify(jid)}`);
        }
        const normalized = jidNormalizedUser(jid);
        if (!seen.has(normalized)) {
            seen.add(normalized);
            result.push(normalized);
        }
    }
    return result;
};

export const resolveStatusTargets = (target, options = {}) => {
    if (Array.isArray(target)) {
        return uniqueJids(target);
    }
    if (Array.isArray(options.statusJidList)) {
        return uniqueJids(options.statusJidList);
    }
    if (typeof target === 'string' && target && target !== STATUS_BROADCAST_JID && !isJidNewsletter(target)) {
        return uniqueJids([target]);
    }
    return [];
};

export const expandStatusTargets = async (sock, targets) => {
    const groups = targets.filter(isJidGroup);
    if (!groups.length) {
        return uniqueJids(targets);
    }
    const direct = targets.filter(jid => !isJidGroup(jid));
    const expanded = await Promise.all(groups.map(async (group) => {
        try {
            const metadata = await sock.groupMetadata?.(group);
            return (metadata?.participants || []).map(participant => participant.id);
        }
        catch (error) {
            sock.logger?.warn?.({ error, group }, 'could not expand a status group recipient');
            return [];
        }
    }));
    return uniqueJids([...direct, ...expanded.flat()]);
};

export const makeStatusSender = (sock) => {
    return async (target, content, options = {}) => {
        assertContent(content);
        const { quality = 'original', maxBytes, maxEdge, statusJidList, ...rest } = options;
        const prepared = await prepareStatusMedia(content, { quality, maxBytes, maxEdge });

        if (typeof target === 'string' && isJidNewsletter(target)) {
            if (typeof sock.sendNewsletterStatus !== 'function') {
                throw new Boom('Channel status is not available on this socket', { statusCode: 400 });
            }
            return sock.sendNewsletterStatus(target, prepared, rest);
        }

        const targets = await expandStatusTargets(sock, resolveStatusTargets(target, { statusJidList }));
        if (!targets.length) {
            throw new Boom('sendStatus needs a recipient list, a status@broadcast jid, or a @newsletter jid', { statusCode: 400 });
        }
        return sock.sendMessage(STATUS_BROADCAST_JID, prepared, { ...rest, statusJidList: targets });
    };
};

export const makeChannelStatusSender = (sock) => {
    return async (jid, content, options = {}) => {
        if (!isJidNewsletter(jid)) {
            throw new Boom('Channel status needs a @newsletter jid', { statusCode: 400 });
        }
        if (typeof sock.sendNewsletterStatus !== 'function') {
            throw new Boom('Channel status is not available on this socket', { statusCode: 400 });
        }
        assertContent(content);
        const { quality = 'original', maxBytes, maxEdge, ...rest } = options;
        const prepared = await prepareStatusMedia(content, { quality, maxBytes, maxEdge });
        return sock.sendNewsletterStatus(jid, prepared, rest);
    };
};
