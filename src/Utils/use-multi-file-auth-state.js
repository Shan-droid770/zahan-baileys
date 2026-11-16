/* Zahan Baileys maintained distribution. Upstream notices and license are preserved in LICENSE and NOTICE.md. */
import { Mutex } from 'async-mutex';
import { mkdir, readdir, readFile, stat, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { proto } from '../../WAProto/index.js';
import { initAuthCreds } from './auth-utils.js';
import { BufferJSON } from './generics.js';
import { AuthVaultError, AuthVaultErrorCode, resolveAuthVault } from './auth-vault.js';

const fileLocks = new Map();

const withFileLock = async (path, work) => {
    let entry = fileLocks.get(path);
    if (!entry) {
        entry = { mutex: new Mutex(), waiting: 0 };
        fileLocks.set(path, entry);
    }
    entry.waiting++;
    const release = await entry.mutex.acquire();
    try {
        return await work();
    }
    finally {
        release();
        entry.waiting--;
        if (entry.waiting === 0) {
            fileLocks.delete(path);
        }
    }
};

export const countAuthFileLocks = () => fileLocks.size;

const fixFileName = (file) => file?.replace(/\//g, '__')?.replace(/:/g, '-');

export const useMultiFileAuthState = async (folder, options = {}) => {
    const vault = await resolveAuthVault(options, 'useMultiFileAuthState');
    const allowPlaintext = options.allowPlaintext === true;
    const recordName = (file) => `file:${fixFileName(file)}`;

    const writeData = async (data, file) => {
        const filePath = join(folder, fixFileName(file));
        const serialized = JSON.stringify(data, BufferJSON.replacer);
        const payload = vault ? await vault.seal(recordName(file), serialized) : serialized;
        return withFileLock(filePath, () => writeFile(filePath, payload, { mode: 0o600 }));
    };
    const readData = async (file) => {
        try {
            const filePath = join(folder, fixFileName(file));
            return await withFileLock(filePath, async () => {
                const raw = await readFile(filePath, { encoding: 'utf-8' });
                const sealed = Boolean(vault?.isSealed(raw));
                if (vault && !sealed && !allowPlaintext) {
                    throw new AuthVaultError(AuthVaultErrorCode.plaintext, `\`${filePath}\` is a plaintext session record; seal it with migrateMultiFileSession or pass allowPlaintext: true to migrate an existing session`, { path: filePath });
                }
                const text = sealed ? await vault.open(recordName(file), raw) : raw;
                return JSON.parse(text, BufferJSON.reviver);
            });
        }
        catch (error) {
            if (error instanceof AuthVaultError) {
                throw error;
            }
            return null;
        }
    };
    const removeData = async (file) => {
        try {
            const filePath = join(folder, fixFileName(file));
            return await withFileLock(filePath, async () => {
                try {
                    await unlink(filePath);
                }
                catch {
                }
            });
        }
        catch { }
    };
    const folderInfo = await stat(folder).catch(() => { });
    if (folderInfo) {
        if (!folderInfo.isDirectory()) {
            throw new Error(`found something that is not a directory at ${folder}, either delete it or specify a different location`);
        }
    }
    else {
        await mkdir(folder, { recursive: true, mode: 0o700 });
    }
    const creds = (await readData('creds.json')) || initAuthCreds();
    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    await Promise.all(ids.map(async (id) => {
                        let value = await readData(`${type}-${id}.json`);
                        if (type === 'app-state-sync-key' && value) {
                            value = proto.Message.AppStateSyncKeyData.fromObject(value);
                        }
                        data[id] = value;
                    }));
                    return data;
                },
                list: async (type) => {
                    try {
                        const names = await readdir(folder);
                        const prefix = `${type}-`;
                        return names
                            .filter(name => name.startsWith(prefix) && name.endsWith('.json'))
                            .map(name => name.slice(prefix.length, -'.json'.length));
                    }
                    catch {
                        return [];
                    }
                },
                set: async (data) => {
                    const tasks = [];
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const file = `${category}-${id}.json`;
                            tasks.push(value ? writeData(value, file) : removeData(file));
                        }
                    }
                    await Promise.all(tasks);
                }
            }
        },
        saveCreds: async () => {
            return writeData(creds, 'creds.json');
        },
        vault
    };
};
