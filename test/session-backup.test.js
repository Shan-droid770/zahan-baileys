import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectSessionKeys, exportSession, importSession, restoreSession, sessionBackupFingerprint, SESSION_BACKUP_PREFIX } from '../src/Utils/session-backup.js';

const makeState = ({ supportsList = true, preKeyCount = 3 } = {}) => {
    const creds = {
        me: { id: '94770000000:3@s.whatsapp.net', name: 'Zahan' },
        registrationId: 4242,
        noiseKey: { public: Buffer.from('noise-public'), private: Buffer.from('noise-private') },
        nextPreKeyId: preKeyCount + 1
    };
    const store = new Map();
    const bucket = (type) => {
        if (!store.has(type)) {
            store.set(type, new Map());
        }
        return store.get(type);
    };
    for (let index = 1; index <= preKeyCount; index += 1) {
        bucket('pre-key').set(String(index), { public: Buffer.from(`pk${index}`), private: Buffer.from(`sk${index}`) });
    }
    bucket('session').set('94711111111@s.whatsapp.net', { session: Buffer.from('session-record') });
    bucket('app-state-sync-key').set('regular_high', { keyData: Buffer.from('sync-key') });
    let saves = 0;
    const keys = {
        get: async (type, ids) => {
            const data = {};
            for (const id of ids) {
                const value = store.get(type)?.get(id);
                if (value !== undefined) {
                    data[id] = value;
                }
            }
            return data;
        },
        set: async (data) => {
            for (const type of Object.keys(data)) {
                for (const id of Object.keys(data[type])) {
                    const value = data[type][id];
                    if (value === null || value === undefined) {
                        store.get(type)?.delete(id);
                    }
                    else {
                        bucket(type).set(id, value);
                    }
                }
            }
        }
    };
    if (supportsList) {
        keys.list = async (type) => [...(store.get(type)?.keys() ?? [])];
    }
    return {
        state: { creds, keys, saveCreds: async () => { saves += 1; } },
        saves: () => saves,
        store
    };
};

const secret = 'zahan-session-secret-for-tests';

test('every key type with a listing is collected', async () => {
    const { state } = makeState();
    const { keys, missing } = await collectSessionKeys(state);
    assert.deepEqual(missing, []);
    assert.equal(Object.keys(keys['pre-key']).length, 3);
    assert.deepEqual(Object.keys(keys.session), ['94711111111@s.whatsapp.net']);
    assert.ok(keys['app-state-sync-key'].regular_high);
    assert.ok(Buffer.isBuffer(keys['pre-key']['1'].public));
});

test('a state without key listing still exports pre-keys and reports the rest', async () => {
    const { state } = makeState({ supportsList: false });
    const { keys, missing } = await collectSessionKeys(state);
    assert.equal(Object.keys(keys['pre-key']).length, 3);
    assert.ok(missing.includes('session'));
    assert.ok(missing.includes('app-state-sync-key'));
});

test('a session survives export and restore with buffers intact', async () => {
    const source = makeState();
    const blob = await exportSession(source.state, { secret });
    assert.ok(blob.startsWith(`${SESSION_BACKUP_PREFIX}.`));
    assert.match(sessionBackupFingerprint(blob), /^[0-9a-f]{16}$/);

    const payload = await importSession(blob, { secret });
    assert.equal(payload.format, 'zahan-session');
    assert.equal(payload.version, 1);
    assert.equal(payload.creds.registrationId, 4242);
    assert.ok(Buffer.isBuffer(payload.creds.noiseKey.private));

    const target = makeState();
    target.state.creds.me = { id: '111:1@s.whatsapp.net' };
    const result = await restoreSession(target.state, blob, { secret });
    assert.equal(result.creds, true);
    assert.equal(target.state.creds.me.id, '94770000000:3@s.whatsapp.net');
    assert.equal(target.saves(), 1);
    assert.ok(result.types.includes('session'));
    assert.equal(result.keyCount, 5);

    const restored = target.store.get('session').get('94711111111@s.whatsapp.net');
    assert.equal(restored.session.toString(), 'session-record');
    assert.equal(target.store.get('pre-key').get('2').public.toString(), 'pk2');
});

test('the wrong secret and a tampered blob are rejected', async () => {
    const { state } = makeState();
    const blob = await exportSession(state, { secret });
    await assert.rejects(() => importSession(blob, { secret: 'a-different-long-secret' }));
    const tampered = `${blob.slice(0, -4)}AAAA`;
    await assert.rejects(() => importSession(tampered, { secret }));
    await assert.rejects(() => importSession('not-a-backup', { secret }), /not a zahan session backup/);
    assert.equal(sessionBackupFingerprint('not-a-backup'), undefined);
});
