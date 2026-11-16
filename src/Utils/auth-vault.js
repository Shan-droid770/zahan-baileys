/* Zahan Baileys maintained distribution. Upstream notices and license are preserved in LICENSE and NOTICE.md. */
import { createCipheriv, createDecipheriv, createHash, randomBytes, scrypt } from 'crypto';
import { readdir, readFile, rename, writeFile } from 'fs/promises';
import { join } from 'path';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

export const AUTH_VAULT_PREFIX = 'zvault1';
export const AUTH_VAULT_AAD_NAMESPACE = 'zahan-baileys/session-vault/v1';
export const AUTH_VAULT_MIN_SECRET_LENGTH = 16;

const SALT_BYTES = 16;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;
const CIPHER = 'aes-256-gcm';
const DEFAULT_KDF = Object.freeze({ N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });

export const AuthVaultErrorCode = Object.freeze({
    invalidSecret: 'AUTH_VAULT_INVALID_SECRET',
    invalidRecord: 'AUTH_VAULT_INVALID_RECORD',
    damaged: 'AUTH_VAULT_DAMAGED',
    plaintext: 'AUTH_VAULT_PLAINTEXT',
    format: 'AUTH_VAULT_FORMAT'
});

export class AuthVaultError extends Error {
    constructor(code, message, details = {}) {
        super(message);
        this.name = 'AuthVaultError';
        this.code = code;
        Object.assign(this, details);
    }
}

const toBuffer = (value, label) => {
    if (Buffer.isBuffer(value)) {
        return value;
    }
    if (value instanceof Uint8Array) {
        return Buffer.from(value);
    }
    if (typeof value === 'string' && value.length) {
        return Buffer.from(value, 'utf8');
    }
    throw new AuthVaultError(AuthVaultErrorCode.invalidSecret, `\`${label}\` must be a non-empty string, Buffer, or Uint8Array`);
};

const normalizeSecret = (secret, { allowWeakSecret = false } = {}) => {
    if (secret === undefined || secret === null || secret === '') {
        throw new AuthVaultError(AuthVaultErrorCode.invalidSecret, 'a `secret` or `passphrase` is required to build a session vault');
    }
    const buffer = toBuffer(secret, 'secret');
    if (!allowWeakSecret && buffer.length < AUTH_VAULT_MIN_SECRET_LENGTH) {
        throw new AuthVaultError(AuthVaultErrorCode.invalidSecret, `the session vault secret is too short (${buffer.length} bytes); use at least ${AUTH_VAULT_MIN_SECRET_LENGTH} bytes of random material, or pass allowWeakSecret: true`, { length: buffer.length });
    }
    return buffer;
};

const assertRecord = (record) => {
    if (typeof record !== 'string' || !record.length) {
        throw new AuthVaultError(AuthVaultErrorCode.invalidRecord, 'every vault record needs a name so a sealed value cannot be moved to a different key');
    }
};

const aadFor = (record) => Buffer.from(`${AUTH_VAULT_AAD_NAMESPACE}:${record}`, 'utf8');

export const isAuthVaultRecord = (value) => {
    if (typeof value !== 'string' || !value.startsWith(`${AUTH_VAULT_PREFIX}.`)) {
        return false;
    }
    const parts = value.split('.');
    return parts.length === 5 && parts.every((part, index) => index === 0 || part.length > 0);
};

const parseEnvelope = (envelope) => {
    if (typeof envelope !== 'string') {
        throw new AuthVaultError(AuthVaultErrorCode.format, 'a sealed session record must be a string');
    }
    const parts = envelope.split('.');
    if (parts.length !== 5 || parts[0] !== AUTH_VAULT_PREFIX) {
        throw new AuthVaultError(AuthVaultErrorCode.format, `not a ${AUTH_VAULT_PREFIX} record`);
    }
    const salt = Buffer.from(parts[1], 'base64url');
    const iv = Buffer.from(parts[2], 'base64url');
    const tag = Buffer.from(parts[3], 'base64url');
    const body = Buffer.from(parts[4], 'base64url');
    if (salt.length < 8 || iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
        throw new AuthVaultError(AuthVaultErrorCode.format, 'the sealed session record is truncated or malformed');
    }
    return { salt, iv, tag, body };
};

const damaged = (record, error) => new AuthVaultError(AuthVaultErrorCode.damaged, `the session record \`${record}\` could not be opened: the vault secret is wrong or the record was modified`, { record, cause: error?.message });

const toPlaintext = (value) => {
    if (typeof value === 'string') {
        return Buffer.from(value, 'utf8');
    }
    if (Buffer.isBuffer(value)) {
        return value;
    }
    if (value instanceof Uint8Array) {
        return Buffer.from(value);
    }
    return Buffer.from(String(value), 'utf8');
};

export const createAuthVault = async (options = {}) => {
    const secret = normalizeSecret(options.secret ?? options.passphrase, options);
    const kdf = { ...DEFAULT_KDF, ...(options.kdf || {}) };
    const derived = new Map();

    const derive = async (salt) => {
        const cacheKey = salt.toString('hex');
        const cached = derived.get(cacheKey);
        if (cached) {
            return cached;
        }
        const material = Buffer.from(await scryptAsync(secret, salt, KEY_BYTES, kdf));
        derived.set(cacheKey, material);
        return material;
    };

    const salt = options.salt ? toBuffer(options.salt, 'salt') : randomBytes(SALT_BYTES);
    if (salt.length < 8) {
        throw new AuthVaultError(AuthVaultErrorCode.invalidSecret, 'the vault salt must be at least 8 bytes');
    }

    const key = await derive(salt);
    const fingerprint = createHash('sha256').update(key).digest('hex');

    const seal = async (record, plaintext) => {
        assertRecord(record);
        const iv = randomBytes(IV_BYTES);
        const cipher = createCipheriv(CIPHER, key, iv, { authTagLength: TAG_BYTES });
        cipher.setAAD(aadFor(record));
        const body = Buffer.concat([cipher.update(toPlaintext(plaintext)), cipher.final()]);
        return [AUTH_VAULT_PREFIX, salt.toString('base64url'), iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), body.toString('base64url')].join('.');
    };

    const open = async (record, envelope) => {
        assertRecord(record);
        const { salt: envelopeSalt, iv, tag, body } = parseEnvelope(envelope);
        const envelopeKey = await derive(envelopeSalt);
        const decipher = createDecipheriv(CIPHER, envelopeKey, iv, { authTagLength: TAG_BYTES });
        decipher.setAAD(aadFor(record));
        decipher.setAuthTag(tag);
        try {
            return Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8');
        }
        catch (error) {
            throw damaged(record, error);
        }
    };

    const vault = {
        algorithm: `${CIPHER}+scrypt`,
        prefix: AUTH_VAULT_PREFIX,
        fingerprint,
        shortFingerprint: fingerprint.slice(0, 16),
        isSealed: isAuthVaultRecord,
        seal,
        open,
        rotate: (nextSecret, rotateOptions = {}) => createAuthVault({
            secret: nextSecret,
            kdf: rotateOptions.kdf ?? kdf,
            salt: randomBytes(SALT_BYTES),
            allowWeakSecret: rotateOptions.allowWeakSecret ?? false
        }),
        get kdf() {
            return { ...kdf };
        }
    };

    return Object.freeze(vault);
};

export const resolveAuthVault = async (options = {}, factoryName = 'this auth state') => {
    if (options.vault) {
        return options.vault;
    }
    if (options.secret || options.passphrase) {
        return createAuthVault(options);
    }
    if (options.requireVault) {
        throw new AuthVaultError(AuthVaultErrorCode.invalidSecret, `${factoryName} was asked to require a vault but no \`secret\`, \`passphrase\`, or \`vault\` was given`);
    }
    return null;
};

export const vaultRecordName = (type, id) => `${type}:${id}`;

export const encryptAuthStore = (store, vault, options = {}) => {
    if (!store || typeof store.read !== 'function') {
        throw new TypeError('encryptAuthStore needs a store with read/readMany/write/apply');
    }
    if (!vault || typeof vault.seal !== 'function') {
        throw new TypeError('encryptAuthStore needs a vault created by createAuthVault');
    }
    const allowPlaintext = options.allowPlaintext === true;

    const sealValue = async (type, id, value) => vault.seal(vaultRecordName(type, id), String(value));

    const openValue = async (type, id, value) => {
        if (value === null || value === undefined) {
            return value;
        }
        if (vault.isSealed(value)) {
            return vault.open(vaultRecordName(type, id), value);
        }
        if (!allowPlaintext) {
            throw new AuthVaultError(AuthVaultErrorCode.plaintext, `the session record \`${vaultRecordName(type, id)}\` is stored in plaintext; seal it first or pass allowPlaintext: true to migrate an existing session`, { type, id });
        }
        return value;
    };

    return {
        read: async (type, id) => openValue(type, id, await store.read(type, id)),
        readMany: async (type, ids) => {
            const rows = await store.readMany(type, ids);
            const opened = {};
            for (const id of ids) {
                if (rows[id] !== undefined && rows[id] !== null) {
                    opened[id] = await openValue(type, id, rows[id]);
                }
            }
            return opened;
        },
        write: async (type, id, value) => store.write(type, id, await sealValue(type, id, value)),
        apply: async (writes, removals) => {
            const sealedWrites = [];
            for (const entry of writes) {
                sealedWrites.push({ ...entry, value: await sealValue(entry.type, entry.id, entry.value) });
            }
            return store.apply(sealedWrites, removals);
        },
        clear: async () => await store.clear?.(),
        close: async () => await store.close?.()
    };
};

export const migrateMultiFileSession = async (folder, options = {}) => {
    const vault = await resolveAuthVault(options, 'migrateMultiFileSession');
    if (!vault) {
        throw new AuthVaultError(AuthVaultErrorCode.invalidSecret, 'migrateMultiFileSession needs a `secret`, `passphrase`, or `vault`');
    }
    const previous = options.from ?? null;
    const allowPlaintext = options.allowPlaintext !== false;
    const names = (await readdir(folder)).filter((name) => name.endsWith('.json'));
    const result = { total: names.length, migrated: 0, rotated: 0, skipped: 0, failed: [], fingerprint: vault.fingerprint };

    for (const name of names) {
        const path = join(folder, name);
        const record = `file:${name}`;
        try {
            const raw = await readFile(path, 'utf-8');
            let text;
            let action;
            if (vault.isSealed(raw)) {
                if (!previous) {
                    result.skipped += 1;
                    continue;
                }
                text = await previous.open(record, raw);
                action = 'rotated';
            }
            else {
                if (!allowPlaintext) {
                    result.skipped += 1;
                    continue;
                }
                text = raw;
                action = 'migrated';
            }
            const sealed = await vault.seal(record, text);
            if (await vault.open(record, sealed) !== text) {
                throw new Error('the sealed record did not round-trip');
            }
            const temporary = `${path}.vault-tmp`;
            await writeFile(temporary, sealed, { mode: 0o600 });
            await rename(temporary, path);
            result[action] += 1;
        }
        catch (error) {
            result.failed.push({ file: name, error: error?.message ?? String(error) });
        }
    }

    return result;
};
