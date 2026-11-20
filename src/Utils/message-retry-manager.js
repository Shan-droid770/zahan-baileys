/* Zahan Baileys maintained distribution. Upstream notices and license are preserved in LICENSE and NOTICE.md. */
import { LRUCache } from 'lru-cache';

const RECENT_MESSAGES_SIZE = 1024;
const MESSAGE_KEY_SEPARATOR = '\u0000';

const DEFAULT_MAX_MSG_RETRY_COUNT = 5;

const RECREATE_SESSION_TIMEOUT = 60 * 60 * 1000;
const PHONE_REQUEST_DELAY = 3000;

export var RetryReason;
(function (RetryReason) {
    RetryReason[RetryReason["UnknownError"] = 0] = "UnknownError";
    RetryReason[RetryReason["SignalErrorNoSession"] = 1] = "SignalErrorNoSession";
    RetryReason[RetryReason["SignalErrorInvalidKey"] = 2] = "SignalErrorInvalidKey";
    RetryReason[RetryReason["SignalErrorInvalidKeyId"] = 3] = "SignalErrorInvalidKeyId";

    RetryReason[RetryReason["SignalErrorInvalidMessage"] = 4] = "SignalErrorInvalidMessage";
    RetryReason[RetryReason["SignalErrorInvalidSignature"] = 5] = "SignalErrorInvalidSignature";
    RetryReason[RetryReason["SignalErrorFutureMessage"] = 6] = "SignalErrorFutureMessage";

    RetryReason[RetryReason["SignalErrorBadMac"] = 7] = "SignalErrorBadMac";
    RetryReason[RetryReason["SignalErrorInvalidSession"] = 8] = "SignalErrorInvalidSession";
    RetryReason[RetryReason["SignalErrorInvalidMsgKey"] = 9] = "SignalErrorInvalidMsgKey";
    RetryReason[RetryReason["BadBroadcastEphemeralSetting"] = 10] = "BadBroadcastEphemeralSetting";
    RetryReason[RetryReason["UnknownCompanionNoPrekey"] = 11] = "UnknownCompanionNoPrekey";
    RetryReason[RetryReason["AdvFailure"] = 12] = "AdvFailure";
    RetryReason[RetryReason["StatusRevokeDelay"] = 13] = "StatusRevokeDelay";
})(RetryReason || (RetryReason = {}));

export const MAC_ERROR_CODES = Object.freeze([
    RetryReason.SignalErrorInvalidMessage,
    RetryReason.SignalErrorBadMac
]);

export const SESSION_RECOVERY_CODES = Object.freeze([
    RetryReason.SignalErrorInvalidKey,
    RetryReason.SignalErrorInvalidKeyId,
    ...MAC_ERROR_CODES,
    RetryReason.SignalErrorInvalidSession,
    RetryReason.SignalErrorInvalidMsgKey
]);

const MAC_ERROR_CODES_SET = new Set(MAC_ERROR_CODES);
const SESSION_RECOVERY_CODES_SET = new Set(SESSION_RECOVERY_CODES);
const RETRY_REASON_NAMES = new Map(Object.entries(RetryReason)
    .filter(([name]) => Number.isNaN(Number(name)))
    .map(([name, value]) => [name.toLowerCase(), value]));

export const parseRetryErrorCode = (errorAttr) => {
    if (errorAttr === undefined || errorAttr === null || errorAttr === '') {
        return undefined;
    }
    if (typeof errorAttr === 'number') {
        if (!Number.isInteger(errorAttr)) {
            return undefined;
        }
        return errorAttr >= RetryReason.UnknownError && errorAttr <= RetryReason.StatusRevokeDelay
            ? errorAttr
            : undefined;
    }
    const text = String(errorAttr).trim();
    if (!text) {
        return undefined;
    }
    if (/^\d+$/.test(text)) {
        return parseRetryErrorCode(Number(text));
    }
    return RETRY_REASON_NAMES.get(text.toLowerCase().replace(/[^a-z0-9]/g, ''));
};

export const isMacErrorCode = (errorCode) => errorCode !== undefined && MAC_ERROR_CODES_SET.has(errorCode);

export const isSessionRecoveryErrorCode = (errorCode) => errorCode !== undefined && SESSION_RECOVERY_CODES_SET.has(errorCode);

const userOf = (jid) => String(jid ?? '').split('@')[0].split(':')[0];

export class MessageRetryManager {
    constructor(logger, maxMsgRetryCount) {
        this.logger = logger;
        this.recentMessagesMap = new LRUCache({
            max: RECENT_MESSAGES_SIZE,
            ttl: 5 * 60 * 1000,
            ttlAutopurge: true,
            dispose: (_value, key) => {
                const separatorIndex = key.lastIndexOf(MESSAGE_KEY_SEPARATOR);
                if (separatorIndex === -1) {
                    return;
                }
                const messageId = key.slice(separatorIndex + MESSAGE_KEY_SEPARATOR.length);
                const keys = this.messageKeyIndex.get(messageId);
                if (!keys) {
                    return;
                }
                keys.delete(key);
                if (!keys.size) {
                    this.messageKeyIndex.delete(messageId);
                }
            }
        });
        this.messageKeyIndex = new Map();
        this.sessionRecreateHistory = new LRUCache({
            ttl: RECREATE_SESSION_TIMEOUT * 2,
            ttlAutopurge: true
        });
        this.retryCounters = new LRUCache({
            ttl: 15 * 60 * 1000,
            ttlAutopurge: true,
            updateAgeOnGet: true
        });
        this.baseKeys = new LRUCache({
            max: 1024,
            ttl: 15 * 60 * 1000,
            ttlAutopurge: true
        });
        this.pendingPhoneRequests = {};
        this.statistics = {
            totalRetries: 0,
            successfulRetries: 0,
            failedRetries: 0,
            mediaRetries: 0,
            sessionRecreations: 0,
            macRecoveries: 0,
            jidResets: 0,
            phoneRequests: 0
        };
        this.maxMsgRetryCount = Number.isInteger(maxMsgRetryCount) ? maxMsgRetryCount : DEFAULT_MAX_MSG_RETRY_COUNT;
    }

    addRecentMessage(to, id, message) {
        const key = { to, id };
        const keyStr = this.keyToString(key);

        this.recentMessagesMap.set(keyStr, {
            message,
            timestamp: Date.now()
        });
        const keys = this.messageKeyIndex.get(id);
        if (keys) {
            keys.add(keyStr);
        }
        else {
            this.messageKeyIndex.set(id, new Set([keyStr]));
        }
        this.logger.debug(`Added message to retry cache: ${to}/${id}`);
    }

    getRecentMessage(to, id) {
        const key = { to, id };
        const keyStr = this.keyToString(key);
        return this.recentMessagesMap.get(keyStr);
    }

    shouldRecreateSession(jid, hasSession, errorCode) {

        if (!hasSession) {
            this.sessionRecreateHistory.set(jid, Date.now());
            this.statistics.sessionRecreations++;
            return {
                reason: "we don't have a Signal session with them",
                recreate: true,
                instant: false
            };
        }

        if (isSessionRecoveryErrorCode(errorCode)) {
            this.sessionRecreateHistory.set(jid, Date.now());
            this.statistics.sessionRecreations++;
            this.statistics.macRecoveries++;
            this.logger.warn({ jid, errorCode: RetryReason[errorCode] }, 'MAC/session error detected, forcing immediate session recreation');
            return {
                reason: `MAC/session error (code ${errorCode}: ${RetryReason[errorCode]}), immediate session recreation`,
                recreate: true,
                instant: true
            };
        }
        const now = Date.now();
        const prevTime = this.sessionRecreateHistory.get(jid);

        if (!prevTime || now - prevTime > RECREATE_SESSION_TIMEOUT) {
            this.sessionRecreateHistory.set(jid, now);
            this.statistics.sessionRecreations++;
            return {
                reason: 'retry count > 1 and over an hour since last recreation',
                recreate: true,
                instant: false
            };
        }
        return { reason: '', recreate: false, instant: false };
    }

    parseRetryErrorCode(errorAttr) {
        return parseRetryErrorCode(errorAttr);
    }

    isMacError(errorCode) {
        return isMacErrorCode(errorCode);
    }

    incrementRetryCount(messageId) {
        this.retryCounters.set(messageId, (this.retryCounters.get(messageId) || 0) + 1);
        this.statistics.totalRetries++;
        return this.retryCounters.get(messageId);
    }

    getRetryCount(messageId) {
        return this.retryCounters.get(messageId) || 0;
    }

    hasExceededMaxRetries(messageId) {
        return this.getRetryCount(messageId) >= this.maxMsgRetryCount;
    }

    markRetrySuccess(messageId) {
        this.statistics.successfulRetries++;

        this.retryCounters.delete(messageId);
        this.cancelPendingPhoneRequest(messageId);
        this.removeRecentMessage(messageId);
    }

    markRetryFailed(messageId) {
        this.statistics.failedRetries++;
        this.retryCounters.delete(messageId);
        this.cancelPendingPhoneRequest(messageId);
        this.removeRecentMessage(messageId);
    }

    resetRetryCounter(messageId) {
        this.retryCounters.delete(messageId);
        this.cancelPendingPhoneRequest(messageId);
        for (const [key] of this.baseKeys.entries()) {
            if (key.endsWith(`:${messageId}`)) {
                this.baseKeys.delete(key);
            }
        }
    }

    resetJid(jid, { users = [], addresses = [] } = {}) {
        const targetUsers = new Set([userOf(jid), ...users.map(userOf)].filter(Boolean));
        if (!targetUsers.size) {
            return 0;
        }
        const addressSet = new Set(addresses.map(String));
        const messageIds = new Set();
        let removed = 0;
        for (const [keyStr] of this.recentMessagesMap.entries()) {
            const separatorIndex = keyStr.lastIndexOf(MESSAGE_KEY_SEPARATOR);
            if (separatorIndex === -1) {
                continue;
            }
            const to = keyStr.slice(0, separatorIndex);
            const messageId = keyStr.slice(separatorIndex + MESSAGE_KEY_SEPARATOR.length);
            if (!targetUsers.has(userOf(to))) {
                continue;
            }
            this.recentMessagesMap.delete(keyStr);
            messageIds.add(messageId);
            removed++;
        }
        for (const messageId of messageIds) {
            this.messageKeyIndex.delete(messageId);
            this.retryCounters.delete(messageId);
            this.cancelPendingPhoneRequest(messageId);
        }
        for (const [key] of this.baseKeys.entries()) {
            const separatorIndex = key.lastIndexOf(':');
            const addr = separatorIndex === -1 ? key : key.slice(0, separatorIndex);
            const msgId = separatorIndex === -1 ? '' : key.slice(separatorIndex + 1);
            if (addressSet.has(addr) || messageIds.has(msgId)) {
                this.baseKeys.delete(key);
            }
        }
        for (const [key] of this.sessionRecreateHistory.entries()) {
            if (typeof key === 'string' && targetUsers.has(userOf(key))) {
                this.sessionRecreateHistory.delete(key);
            }
        }
        this.statistics.jidResets++;
        this.logger.debug({ jid, removed }, 'reset retry state for recovered session');
        return removed;
    }

    schedulePhoneRequest(messageId, callback, delay = PHONE_REQUEST_DELAY) {

        this.cancelPendingPhoneRequest(messageId);
        this.pendingPhoneRequests[messageId] = setTimeout(() => {
            delete this.pendingPhoneRequests[messageId];
            this.statistics.phoneRequests++;
            callback();
        }, delay);
        this.logger.debug(`Scheduled phone request for message ${messageId} with ${delay}ms delay`);
    }

    cancelPendingPhoneRequest(messageId) {
        const timeout = this.pendingPhoneRequests[messageId];
        if (timeout) {
            clearTimeout(timeout);
            delete this.pendingPhoneRequests[messageId];
            this.logger.debug(`Cancelled pending phone request for message ${messageId}`);
        }
    }
    clear() {
        this.recentMessagesMap.clear();
        this.messageKeyIndex.clear();
        this.sessionRecreateHistory.clear();
        this.retryCounters.clear();
        this.baseKeys.clear();
        for (const messageId of Object.keys(this.pendingPhoneRequests)) {
            this.cancelPendingPhoneRequest(messageId);
        }
        this.statistics = {
            totalRetries: 0,
            successfulRetries: 0,
            failedRetries: 0,
            mediaRetries: 0,
            sessionRecreations: 0,
            macRecoveries: 0,
            jidResets: 0,
            phoneRequests: 0
        };
    }
    saveBaseKey(addr, msgId, baseKey) {
        this.baseKeys.set(`${addr}:${msgId}`, baseKey);
    }
    hasSameBaseKey(addr, msgId, baseKey) {
        const stored = this.baseKeys.get(`${addr}:${msgId}`);
        if (!stored || stored.length !== baseKey.length) {
            return false;
        }
        for (let i = 0; i < stored.length; i++) {
            if (stored[i] !== baseKey[i])
                return false;
        }
        return true;
    }
    deleteBaseKey(addr, msgId) {
        this.baseKeys.delete(`${addr}:${msgId}`);
    }
    keyToString(key) {
        return `${key.to}${MESSAGE_KEY_SEPARATOR}${key.id}`;
    }
    removeRecentMessage(messageId) {
        const keys = this.messageKeyIndex.get(messageId);
        if (!keys) {
            return;
        }
        for (const keyStr of [...keys]) {
            this.recentMessagesMap.delete(keyStr);
        }
        this.messageKeyIndex.delete(messageId);
    }
}
