/* Zahan Baileys maintained distribution. Upstream notices and license are preserved in LICENSE and NOTICE.md. */
import { createHash } from 'crypto';
import { createAuthVault, vaultRecordName } from './auth-vault.js';
import { BufferJSON } from './generics.js';

export const SESSION_BACKUP_FORMAT = 'zahan-session';
export const SESSION_BACKUP_VERSION = 1;
export const SESSION_BACKUP_PREFIX = 'zsess1';
export const SESSION_BACKUP_RECORD = vaultRecordName('session', 'backup');

export const DEFAULT_SESSION_KEY_TYPES = Object.freeze([
    'pre-key',
    'session',
    'app-state-sync-key',
    'app-state-sync-version',
    'sender-key',
    'sender-key-memory',
    'tctoken',
    'identity-key',
    'device-list',
    'lid-mapping'
]);

const resolveVault = async (options = {}) => {
    if (options.vault) {
        return options.vault;
    }
    return createAuthVault(options);
};

export const collectSessionKeys = async (authState, options = {}) => {
    if (!authState?.keys || typeof authState.keys.get !== 'function') {
        throw new TypeError('collectSessionKeys needs an auth state with creds and keys');
    }
    const types = options.types ?? DEFAULT_SESSION_KEY_TYPES;
    const idsByType = options.keyIds ?? {};
    const keys = {};
    const missing = [];
    for (const type of types) {
        let ids = Array.isArray(idsByType[type]) ? idsByType[type].map(String) : undefined;
        if (!ids && typeof authState.keys.list === 'function') {
            const listed = await authState.keys.list(type).catch(() => undefined);
            if (Array.isArray(listed)) {
                ids = listed.map(String);
            }
        }
        if (!ids && type === 'pre-key') {
            const next = Number(authState.creds?.nextPreKeyId);
            if (Number.isFinite(next) && next > 1) {
                ids = Array.from({ length: Math.min(next - 1, 1000) }, (_, index) => String(index + 1));
            }
        }
        if (!ids) {
            missing.push(type);
            continue;
        }
        if (!ids.length) {
            keys[type] = {};
            continue;
        }
        const values = await authState.keys.get(type, ids);
        const entries = Object.entries(values ?? {}).filter(([, value]) => value !== undefined && value !== null);
        if (entries.length) {
            keys[type] = Object.fromEntries(entries);
        }
    }
    return { keys, missing: missing.filter((type) => !keys[type]) };
};

export const serializeSession = async (authState, options = {}) => {
    const { keys, missing } = await collectSessionKeys(authState, options);
    return {
        format: SESSION_BACKUP_FORMAT,
        version: SESSION_BACKUP_VERSION,
        createdAt: new Date().toISOString(),
        creds: authState.creds,
        keys,
        missing
    };
};

export const exportSession = async (authState, options = {}) => {
    const vault = await resolveVault(options);
    const payload = await serializeSession(authState, options);
    const envelope = await vault.seal(SESSION_BACKUP_RECORD, JSON.stringify(payload, BufferJSON.replacer));
    return `${SESSION_BACKUP_PREFIX}.${envelope}`;
};

export const importSession = async (blob, options = {}) => {
    if (typeof blob !== 'string' || !blob.trim()) {
        throw new TypeError('importSession needs the string that exportSession returned');
    }
    const prefix = `${SESSION_BACKUP_PREFIX}.`;
    if (!blob.startsWith(prefix)) {
        throw new Error(`this is not a zahan session backup, expected it to start with "${prefix}"`);
    }
    const vault = await resolveVault(options);
    const text = await vault.open(SESSION_BACKUP_RECORD, blob.slice(prefix.length));
    const payload = JSON.parse(text, BufferJSON.reviver);
    if (payload?.format !== SESSION_BACKUP_FORMAT) {
        throw new Error('the backup does not contain a zahan session');
    }
    if (Number(payload.version) > SESSION_BACKUP_VERSION) {
        throw new Error(`the backup was written by a newer version (v${payload.version}); update zahan-baileys to restore it`);
    }
    return payload;
};

export const restoreSession = async (authState, blob, options = {}) => {
    if (!authState?.keys || typeof authState.keys.set !== 'function') {
        throw new TypeError('restoreSession needs an auth state with creds and keys');
    }
    const payload = await importSession(blob, options);
    const result = { creds: false, types: [], keyCount: 0, missing: payload.missing ?? [] };
    if (payload.creds && options.replaceCreds !== false) {
        for (const key of Object.keys(authState.creds ?? {})) {
            delete authState.creds[key];
        }
        Object.assign(authState.creds, payload.creds);
        if (typeof authState.saveCreds === 'function') {
            await authState.saveCreds();
        }
        result.creds = true;
    }
    for (const [type, values] of Object.entries(payload.keys ?? {})) {
        const ids = Object.keys(values);
        if (!ids.length) {
            continue;
        }
        await authState.keys.set({ [type]: values });
        result.types.push(type);
        result.keyCount += ids.length;
    }
    return result;
};

export const sessionBackupFingerprint = (blob) => {
    if (typeof blob !== 'string') {
        return undefined;
    }
    const envelope = blob.startsWith(`${SESSION_BACKUP_PREFIX}.`) ? blob.slice(SESSION_BACKUP_PREFIX.length + 1) : blob;
    const parts = envelope.split('.');
    if (parts.length < 5) {
        return undefined;
    }
    return createHash('sha256').update(Buffer.from(parts[1], 'base64url')).digest('hex').slice(0, 16);
};
