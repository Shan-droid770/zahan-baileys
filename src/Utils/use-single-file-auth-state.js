/* Zahan Baileys maintained distribution. Upstream notices and license are preserved in LICENSE and NOTICE.md. */
import { readFile, rename, stat, writeFile } from 'fs/promises';
import { DEFAULT_CACHE_TTLS } from '../Defaults/index.js';
import { proto } from '../../WAProto/index.js';
import { initAuthCreds } from './auth-utils.js';
import { BufferJSON } from './generics.js';
import { AuthVaultError, AuthVaultErrorCode, resolveAuthVault } from './auth-vault.js';
import { LRUCache } from 'lru-cache';
import { Mutex } from 'async-mutex';

const DEFAULT_FLUSH_TIMEOUT_MS = 3000;
const VAULT_RECORD = 'file:session';

export const useSingleFileAuthState = async (fileName, options = {}) => {
    const vault = await resolveAuthVault(options, 'useSingleFileAuthState');
    const allowPlaintext = options.allowPlaintext === true;
    const flushTimeoutMs = options.flushTimeoutMs ?? DEFAULT_FLUSH_TIMEOUT_MS;
    const cache = new LRUCache({
        max: 20000,
        ttl: 1000 * DEFAULT_CACHE_TTLS.SIGNAL_STORE,
        updateAgeOnGet: false,
        updateAgeOnHas: false,
        ttlAutopurge: true
    });

    const mutex = new Mutex();
    let fileData = {};
    let isLoaded = false;
    let flushTimeout = null;
    const loadKey = async () => {
        return await mutex.runExclusive(async () => {
            if (isLoaded)
                return;
            try {
                const raw = await readFile(fileName, 'utf-8');
                const sealed = Boolean(vault?.isSealed(raw));
                if (vault && !sealed && !allowPlaintext) {
                    throw new AuthVaultError(AuthVaultErrorCode.plaintext, `\`${fileName}\` is a plaintext session file; seal it with a vault or pass allowPlaintext: true to migrate an existing session`, { path: fileName });
                }
                const text = sealed ? await vault.open(VAULT_RECORD, raw) : raw;
                const data = JSON.parse(text, BufferJSON.reviver);
                fileData = data || {};
                for (const [keyName, value] of Object.entries(fileData)) {
                    cache.set(keyName, value);
                }
            }
            catch (error) {
                if (error instanceof AuthVaultError) {
                    throw error;
                }
                fileData = {};
            }
            isLoaded = true;
        });
    };
    const flushKey = () => {
        if (flushTimeout)
            return;
        flushTimeout = setTimeout(async () => {
            flushTimeout = null;
            await mutex.runExclusive(async () => {
                try {
                    const serialized = JSON.stringify(fileData, BufferJSON.replacer);
                    const payload = vault ? await vault.seal(VAULT_RECORD, serialized) : serialized;
                    const tempFile = fileName + '.temp';
                    await writeFile(tempFile, payload, { mode: 0o600 });
                    await rename(tempFile, fileName);
                }
                catch { }
            });
        }, flushTimeoutMs);
    };
    const writeKey = (keyName, value) => {
        cache.set(keyName, value);
        fileData[keyName] = value;
        flushKey();
    };
    const removeKey = (keyName) => {
        cache.delete(keyName);
        delete fileData[keyName];
        flushKey();
    };
    const fileInfo = await stat(fileName).catch(() => null);
    if (!fileInfo) {
        const empty = JSON.stringify({}, BufferJSON.replacer);
        await writeFile(fileName, vault ? await vault.seal(VAULT_RECORD, empty) : empty, { mode: 0o600 });
    }
    else if (!fileInfo.isFile()) {
        throw new Error(`found something that is not a file at ${fileName}, either delete it or specify a different location`);
    }
    await loadKey();
    const creds = fileData['creds'] || initAuthCreds();
    return {
        state: {
            creds,
            keys: {
                get: (type, ids) => {
                    const data = {};
                    for (const id of ids) {
                        const keyName = type + id;
                        let value = cache.get(keyName);
                        if (value === undefined && fileData[keyName] !== undefined) {
                            value = fileData[keyName];
                            cache.set(keyName, value);
                        }
                        if (type === 'app-state-sync-key' && value) {
                            value = proto.Message.AppStateSyncKeyData.fromObject(value);
                        }
                        data[id] = value;
                    }
                    return data;
                },
                set: (data) => {
                    for (const category in data) {
                        for (const id in data[category]) {
                            const keyName = category + id;
                            const value = data[category][id];
                            value ? writeKey(keyName, value) : removeKey(keyName);
                        }
                    }
                }
            }
        },
        saveCreds: () => writeKey('creds', creds),
        vault
    };
};
