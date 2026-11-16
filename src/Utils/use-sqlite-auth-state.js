/* Zahan Baileys maintained distribution. Upstream notices and license are preserved in LICENSE and NOTICE.md. */
import { proto } from '../../WAProto/index.js';
import { initAuthCreds } from './auth-utils.js';
import { BufferJSON } from './generics.js';
import { AuthVaultError, AuthVaultErrorCode, resolveAuthVault } from './auth-vault.js';
async function loadBetterSqlite3() {
    try {

        const mod = (await import('better-sqlite3'));
        return mod.default ?? mod;
    }
    catch (err) {
        const helpful = new Error('`better-sqlite3` is required for `useSqliteAuthState`. Install it as a peer dependency: `npm install better-sqlite3` (or `yarn add better-sqlite3`).');

        helpful.cause = err;
        throw helpful;
    }
}
const CREDS_ROW_KEY = '__creds__';
const CREATE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS creds (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS signal_keys (
  type TEXT NOT NULL,
  id TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (type, id)
);
CREATE INDEX IF NOT EXISTS signal_keys_type_idx ON signal_keys(type);
`;
export async function useSqliteAuthState(opts = {}) {
    const vault = await resolveAuthVault(opts, 'useSqliteAuthState');
    const allowPlaintext = opts.allowPlaintext === true;
    const recordName = (type, id) => `sqlite:${type}:${id}`;
    const openValue = async (record, raw) => {
        if (raw === null || raw === undefined) {
            return null;
        }
        if (vault?.isSealed(raw)) {
            return vault.open(record, raw);
        }
        if (vault && !allowPlaintext) {
            throw new AuthVaultError(AuthVaultErrorCode.plaintext, `the session row \`${record}\` is stored in plaintext; seal it first or pass allowPlaintext: true to migrate an existing session`, { record });
        }
        return raw;
    };
    const sealValue = async (record, text) => vault ? vault.seal(record, text) : text;
    let db;
    let owned = false;
    if (opts.database) {
        db = opts.database;
    }
    else {
        const Database = await loadBetterSqlite3();
        db = new Database(opts.dbPath);
        owned = true;
    }

    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.exec(CREATE_SCHEMA_SQL);
    const stmts = {
        credsSelect: db.prepare('SELECT value FROM creds WHERE key = ?'),
        credsUpsert: db.prepare('INSERT INTO creds (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'),
        keySelect: db.prepare('SELECT value FROM signal_keys WHERE type = ? AND id = ?'),
        keyUpsert: db.prepare('INSERT INTO signal_keys (type, id, value) VALUES (?, ?, ?) ON CONFLICT(type, id) DO UPDATE SET value = excluded.value'),
        keyDelete: db.prepare('DELETE FROM signal_keys WHERE type = ? AND id = ?'),
        keyListIds: db.prepare('SELECT id FROM signal_keys WHERE type = ?'),
        keyList: db.prepare('SELECT id, value FROM signal_keys WHERE type = ?'),
        clearKeys: db.prepare('DELETE FROM signal_keys'),
        clearCreds: db.prepare('DELETE FROM creds')
    };
    const loadCreds = async () => {
        const row = stmts.credsSelect.get(CREDS_ROW_KEY);
        if (!row)
            return initAuthCreds();
        return JSON.parse(await openValue('sqlite:creds', row.value), BufferJSON.reviver);
    };
    const persistCreds = async (creds) => {
        stmts.credsUpsert.run(CREDS_ROW_KEY, await sealValue('sqlite:creds', JSON.stringify(creds, BufferJSON.replacer)));
    };
    const creds = await loadCreds();
    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    for (const id of ids) {
                        const row = stmts.keySelect.get(type, id);
                        if (row) {
                            let value = JSON.parse(await openValue(recordName(type, id), row.value), BufferJSON.reviver);
                            if (type === 'app-state-sync-key' && value) {
                                value = proto.Message.AppStateSyncKeyData.fromObject(value);
                            }
                            data[id] = value;
                        }
                    }
                    return data;
                },
                set: async (data) => {
                    const operations = [];
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            operations.push({
                                category,
                                id,
                                payload: value ? await sealValue(recordName(category, id), JSON.stringify(value, BufferJSON.replacer)) : null
                            });
                        }
                    }
                    const writeTx = db.transaction(() => {
                        for (const operation of operations) {
                            if (operation.payload) {
                                stmts.keyUpsert.run(operation.category, operation.id, operation.payload);
                            }
                            else {
                                stmts.keyDelete.run(operation.category, operation.id);
                            }
                        }
                    });
                    writeTx();
                }
            }
        },
        saveCreds: async () => {
            await persistCreds(creds);
        },
        vault,
        clearAuth: async () => {
            const wipe = db.transaction(() => {
                stmts.clearKeys.run();
                stmts.clearCreds.run();
            });
            wipe();
        },
        close: async () => {
            if (owned) {
                db.close();
            }
        }
    };
}
