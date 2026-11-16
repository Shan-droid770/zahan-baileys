import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { AUTH_VAULT_PREFIX, AuthVaultError, AuthVaultErrorCode, createAuthVault, encryptAuthStore, isAuthVaultRecord, migrateMultiFileSession } from '../src/Utils/auth-vault.js';
import { makeAuthStateFromStore } from '../src/Utils/auth-store.js';
import { useMultiFileAuthState } from '../src/Utils/use-multi-file-auth-state.js';
import { useSingleFileAuthState } from '../src/Utils/use-single-file-auth-state.js';
import { useSqliteAuthState } from '../src/Utils/use-sqlite-auth-state.js';
import { AccountSecurityError, assertAccountSecurity, auditAccountSecurity, formatAccountSecurityReport, restrictSessionPermissions } from '../src/Utils/account-security.js';
import { initAuthCreds } from '../src/Utils/auth-utils.js';

const hasSqlite = await import('better-sqlite3').then(() => true).catch(() => false);
const secret = 'correct horse battery staple 2026';
const otherSecret = 'a different secret with enough bytes';
const accountJid = '94770000000@s.whatsapp.net';

const withFolder = async (work) => {
    const folder = mkdtempSync(join(tmpdir(), 'zahan-security-'));
    try {
        return await work(folder);
    }
    finally {
        rmSync(folder, { recursive: true, force: true });
    }
};

const makeMemoryStore = () => {
    const rows = new Map();
    const key = (type, id) => `${type}:${id}`;
    return{
        rows,
        read: async (type, id) => rows.get(key(type, id)) ?? null,
        readMany: async (type, ids) => Object.fromEntries(ids.filter((id) => rows.has(key(type, id))).map((id) => [id, rows.get(key(type, id))])),
        write: async (type, id, value) => {
            rows.set(key(type, id), value);
        },
        apply: async (writes, removals) => {
            for (const entry of writes) {
                rows.set(key(entry.type, entry.id), entry.value);
            }
            for (const entry of removals) {
                rows.delete(key(entry.type, entry.id));
            }
        },
        clear: async () => rows.clear(),
        close: async () => undefined
    };
};

const expectVaultError = (code) => (error) => {
    assert.ok(error instanceof AuthVaultError, `expected AuthVaultError, got ${error?.name}`);
    assert.equal(error.code, code);
    return true;
};

test('vault seals and opens a record', async () => {
    const vault = await createAuthVault({ secret });
    const sealed = await vault.seal('creds:creds', '{"hello":"world"}');
    assert.ok(sealed.startsWith(`${AUTH_VAULT_PREFIX}.`));
    assert.ok(isAuthVaultRecord(sealed));
    assert.ok(vault.isSealed(sealed));
    assert.ok(!vault.isSealed('{"hello":"world"}'));
    assert.equal(await vault.open('creds:creds', sealed), '{"hello":"world"}');
    assert.equal(vault.fingerprint.length, 64);
    assert.equal(vault.shortFingerprint.length, 16);
});

test('vault refuses a short secret unless it is explicitly allowed', async () => {
    await assert.rejects(createAuthVault({ secret: 'short' }), expectVaultError(AuthVaultErrorCode.invalidSecret));
    const weak = await createAuthVault({ secret: 'short', allowWeakSecret: true });
    assert.ok(weak.fingerprint);
    await assert.rejects(createAuthVault({}), expectVaultError(AuthVaultErrorCode.invalidSecret));
});

test('a sealed record is bound to its name', async () => {
    const vault = await createAuthVault({ secret });
    const sealed = await vault.seal('session:alpha', 'alpha');
    assert.equal(await vault.open('session:alpha', sealed), 'alpha');
    await assert.rejects(vault.open('session:beta', sealed), expectVaultError(AuthVaultErrorCode.damaged));
});

test('a modified record is rejected instead of decrypted', async () => {
    const vault = await createAuthVault({ secret });
    const sealed = await vault.seal('creds:creds', '{"value":"x"}');
    const parts = sealed.split('.');
    const body = parts[4];
    parts[4] = `${body[0] === 'A' ? 'B' : 'A'}${body.slice(1)}`;
    await assert.rejects(vault.open('creds:creds', parts.join('.')), expectVaultError(AuthVaultErrorCode.damaged));
});

test('a different secret cannot open a record', async () => {
    const vault = await createAuthVault({ secret });
    const other = await createAuthVault({ secret: otherSecret });
    const sealed = await vault.seal('creds:creds', '{"value":"x"}');
    await assert.rejects(other.open('creds:creds', sealed), expectVaultError(AuthVaultErrorCode.damaged));
});

test('malformed records are reported as a format error', async () => {
    const vault = await createAuthVault({ secret });
    await assert.rejects(vault.open('creds:creds', 'not-a-vault-record'), expectVaultError(AuthVaultErrorCode.format));
    await assert.rejects(vault.seal('', 'x'), expectVaultError(AuthVaultErrorCode.invalidRecord));
    assert.equal(isAuthVaultRecord(undefined), false);
    assert.equal(isAuthVaultRecord(`${AUTH_VAULT_PREFIX}.only.two`), false);
});

test('a rotated vault keeps the same plaintext under a new key', async () => {
    const first = await createAuthVault({ secret });
    const second = await first.rotate(otherSecret);
    assert.notEqual(first.fingerprint, second.fingerprint);
    const sealed = await second.seal('creds:creds', 'payload');
    assert.equal(await second.open('creds:creds', sealed), 'payload');
    await assert.rejects(first.open('creds:creds', sealed), expectVaultError(AuthVaultErrorCode.damaged));
});

test('encryptAuthStore seals every value and opens it again', async () => {
    const store = makeMemoryStore();
    const vault = await createAuthVault({ secret });
    const secured = encryptAuthStore(store, vault);
    await secured.write('session', 'abc', '{"hello":"world"}');
    assert.ok(vault.isSealed(store.rows.get('session:abc')));
    assert.equal(await secured.read('session', 'abc'), '{"hello":"world"}');
    assert.deepEqual(await secured.readMany('session', ['abc', 'missing']), { abc: '{"hello":"world"}' });
    await secured.apply([{ type: 'pre-key', id: '1', value: '{"k":1}' }], []);
    assert.ok(vault.isSealed(store.rows.get('pre-key:1')));
    assert.equal(await secured.read('pre-key', '1'), '{"k":1}');
    assert.equal(await secured.read('session', 'absent'), null);
    store.rows.set('legacy:old', '{"plain":true}');
    await assert.rejects(secured.read('legacy', 'old'), expectVaultError(AuthVaultErrorCode.plaintext));
    const lenient = encryptAuthStore(store, vault, { allowPlaintext: true });
    assert.equal(await lenient.read('legacy', 'old'), '{"plain":true}');
});

test('makeAuthStateFromStore encrypts credentials and keys', async () => {
    const store = makeMemoryStore();
    const session = await makeAuthStateFromStore(store, { secret });
    assert.ok(session.vault);
    session.state.creds.me = { id: accountJid, name: 'bot' };
    await session.state.keys.set({ session: { device: { index: 1 } } });
    await session.saveCreds();
    assert.ok(session.vault.isSealed(store.rows.get('creds:creds')));
    assert.ok(!store.rows.get('creds:creds').includes('94770000000'));
    assert.ok(!store.rows.get('session:device').includes('index'));

    const reopened = await makeAuthStateFromStore(store, { secret });
    assert.equal(reopened.state.creds.me.id, accountJid);
    assert.deepEqual(await reopened.state.keys.get('session', ['device']), { device: { index: 1 } });
    await assert.rejects(makeAuthStateFromStore(store, { secret: otherSecret }), expectVaultError(AuthVaultErrorCode.damaged));
});

test('makeAuthStateFromStore refuses to read a plaintext session unless asked', async () => {
    const store = makeMemoryStore();
    store.rows.set('creds:creds', JSON.stringify(initAuthCreds()));
    await assert.rejects(makeAuthStateFromStore(store, { secret }), expectVaultError(AuthVaultErrorCode.plaintext));
    const migrated = await makeAuthStateFromStore(store, { secret, allowPlaintext: true });
    await migrated.saveCreds();
    assert.ok(migrated.vault.isSealed(store.rows.get('creds:creds')));
});

test('the multi-file backend seals every file and reopens the session', async () => {
    await withFolder(async (folder) => {
        const { state, saveCreds, vault } = await useMultiFileAuthState(folder, { secret });
        assert.ok(vault);
        state.creds.me = { id: accountJid, name: 'bot' };
        await state.keys.set({ session: { device: { index: 2 } } });
        await saveCreds();

        const files = readdirSync(folder);
        assert.ok(files.includes('creds.json'));
        assert.ok(files.includes('session-device.json'));
        for (const name of files) {
            const raw = readFileSync(join(folder, name), 'utf8');
            assert.ok(raw.startsWith(`${AUTH_VAULT_PREFIX}.`), `${name} is not sealed`);
            assert.ok(!raw.includes('94770000000'), `${name} leaks the account number`);
        }
        assert.equal(statSync(join(folder, 'creds.json')).mode & 0o077, 0);

        const reopened = await useMultiFileAuthState(folder, { secret });
        assert.equal(reopened.state.creds.me.id, accountJid);
        assert.deepEqual(await reopened.state.keys.get('session', ['device']), { device: { index: 2 } });
        await assert.rejects(useMultiFileAuthState(folder, { secret: otherSecret }), expectVaultError(AuthVaultErrorCode.damaged));
    });
});

test('the multi-file backend treats a changed file as an attack', async () => {
    await withFolder(async (folder) => {
        const { state, saveCreds } = await useMultiFileAuthState(folder, { secret });
        state.creds.me = { id: accountJid };
        await saveCreds();
        const path = join(folder, 'creds.json');
        const sealed = readFileSync(path, 'utf8');
        const parts = sealed.split('.');
        const body = parts[4];
        parts[4] = `${body[0] === 'A' ? 'B' : 'A'}${body.slice(1)}`;
        writeFileSync(path, parts.join('.'));
        await assert.rejects(useMultiFileAuthState(folder, { secret }), expectVaultError(AuthVaultErrorCode.damaged));
    });
});

test('migrateMultiFileSession seals an existing plaintext session', async () => {
    await withFolder(async (folder) => {
        const creds = initAuthCreds();
        creds.me = { id: accountJid, name: 'bot' };
        writeFileSync(join(folder, 'creds.json'), JSON.stringify(creds, (key, value) => value?.type === 'Buffer' ? Buffer.from(value.data) : value));
        writeFileSync(join(folder, 'session-device.json'), '{"index":3}');

        const vault = await createAuthVault({ secret });
        const result = await migrateMultiFileSession(folder, { vault });
        assert.equal(result.total, 2);
        assert.equal(result.migrated, 2);
        assert.equal(result.failed.length, 0);
        for (const name of readdirSync(folder)) {
            assert.ok(readFileSync(join(folder, name), 'utf8').startsWith(`${AUTH_VAULT_PREFIX}.`));
        }

        const reopened = await useMultiFileAuthState(folder, { vault });
        assert.equal(reopened.state.creds.me.id, accountJid);
        assert.deepEqual(await reopened.state.keys.get('session', ['device']), { device: { index: 3 } });
    });
});

test('migrateMultiFileSession rotates the key of an already sealed session', async () => {
    await withFolder(async (folder) => {
        const first = await useMultiFileAuthState(folder, { secret });
        first.state.creds.me = { id: accountJid };
        await first.saveCreds();
        const next = await first.vault.rotate(otherSecret);
        const result = await migrateMultiFileSession(folder, { vault: next, from: first.vault });
        assert.equal(result.rotated, 1);
        assert.equal(result.failed.length, 0);
        const reopened = await useMultiFileAuthState(folder, { vault: next });
        assert.equal(reopened.state.creds.me.id, accountJid);
        await assert.rejects(useMultiFileAuthState(folder, { secret }), expectVaultError(AuthVaultErrorCode.damaged));
    });
});

test('a plaintext session is refused instead of silently trusted', async () => {
    await withFolder(async (folder) => {
        writeFileSync(join(folder, 'creds.json'), JSON.stringify(initAuthCreds()));
        await assert.rejects(useMultiFileAuthState(folder, { secret }), expectVaultError(AuthVaultErrorCode.plaintext));
        const migrated = await useMultiFileAuthState(folder, { secret, allowPlaintext: true });
        await migrated.saveCreds();
        assert.ok(readFileSync(join(folder, 'creds.json'), 'utf8').startsWith(`${AUTH_VAULT_PREFIX}.`));
    });
});

test('the single-file backend seals the whole file', async () => {
    await withFolder(async (folder) => {
        const path = join(folder, 'session.json');
        const { state, saveCreds, vault } = await useSingleFileAuthState(path, { secret, flushTimeoutMs: 20 });
        assert.ok(vault);
        state.creds.me = { id: accountJid, name: 'bot' };
        saveCreds();
        await delay(60);
        const raw = readFileSync(path, 'utf8');
        assert.ok(raw.startsWith(`${AUTH_VAULT_PREFIX}.`));
        assert.ok(!raw.includes('94770000000'));

        const reopened = await useSingleFileAuthState(path, { secret, flushTimeoutMs: 20 });
        assert.equal(reopened.state.creds.me.id, accountJid);
        await assert.rejects(useSingleFileAuthState(path, { secret: otherSecret }), expectVaultError(AuthVaultErrorCode.damaged));
    });
});

test('the single-file backend refuses a plaintext session file', async () => {
    await withFolder(async (folder) => {
        const path = join(folder, 'session.json');
        writeFileSync(path, JSON.stringify(initAuthCreds()));
        await assert.rejects(useSingleFileAuthState(path, { secret }), expectVaultError(AuthVaultErrorCode.plaintext));
        const migrated = await useSingleFileAuthState(path, { secret, allowPlaintext: true, flushTimeoutMs: 20 });
        migrated.saveCreds();
        await delay(60);
        assert.ok(readFileSync(path, 'utf8').startsWith(`${AUTH_VAULT_PREFIX}.`));
    });
});

test('the sqlite backend seals every row', { skip: hasSqlite ? false : 'better-sqlite3 is not installed' }, async () => {
    await withFolder(async (folder) => {
        const dbPath = join(folder, 'session.db');
        const { state, saveCreds, vault } = await useSqliteAuthState({ dbPath, secret });
        assert.ok(vault);
        state.creds.me = { id: accountJid, name: 'bot' };
        await state.keys.set({ session: { device: { index: 4 } } });
        await saveCreds();

        const Database = (await import('better-sqlite3')).default;
        const database = new Database(dbPath, { readonly: true });
        const credsRow = database.prepare('SELECT value FROM creds').get();
        const keyRow = database.prepare('SELECT value FROM signal_keys').get();
        database.close();
        assert.ok(credsRow.value.startsWith(`${AUTH_VAULT_PREFIX}.`));
        assert.ok(!credsRow.value.includes('94770000000'));
        assert.ok(keyRow.value.startsWith(`${AUTH_VAULT_PREFIX}.`));
        assert.ok(!keyRow.value.includes('index'));

        const reopened = await useSqliteAuthState({ dbPath, secret });
        assert.equal(reopened.state.creds.me.id, accountJid);
        assert.deepEqual(await reopened.state.keys.get('session', ['device']), { device: { index: 4 } });
        await assert.rejects(useSqliteAuthState({ dbPath, secret: otherSecret }), expectVaultError(AuthVaultErrorCode.damaged));
    });
});

test('auditing a plaintext session reports it as unsafe', async () => {
    await withFolder(async (folder) => {
        const creds = initAuthCreds();
        creds.me = { id: accountJid, name: 'bot' };
        writeSessionFile(folder, 'creds.json', JSON.stringify(creds, null, 2));
        chmodSync(join(folder, 'creds.json'), 0o644);
        const report = await auditAccountSecurity({ authState: { creds }, sessionPath: folder });
        assert.equal(report.safe, false);
        assert.ok(['D', 'F'].includes(report.grade));
        const ids = report.findings.map((finding) => finding.id);
        assert.ok(ids.includes('session-vault-missing'));
        assert.ok(ids.includes('session-plaintext'));
        assert.ok(ids.includes('session-file-permissions'));
        assert.equal(report.vault.enabled, false);
        assert.ok(report.findings.some((finding) => finding.severity === 'critical'));
        const text = formatAccountSecurityReport(report);
        assert.match(text, /ACTION REQUIRED/);
        assert.match(text, /session-plaintext/);
    });
});

test('auditing a sealed session passes', async () => {
    await withFolder(async (folder) => {
        const { state, saveCreds, vault } = await useMultiFileAuthState(folder, { secret });
        state.creds.me = { id: accountJid, name: 'bot' };
        await saveCreds();
        const report = await auditAccountSecurity({ authState: state, vault, sessionPath: folder, preKeyCount: 1 });
        assert.equal(report.safe, true);
        assert.equal(report.grade, 'A');
        assert.equal(report.vault.enabled, true);
        assert.equal(report.vault.shortFingerprint.length, 16);
        assert.equal(report.counts.high, 0);
        assert.equal(report.counts.critical, 0);
        assert.equal(report.counts.medium, 1);
        assert.equal(report.scanned.files, 1);
        assert.doesNotThrow(() => formatAccountSecurityReport(report));
    });
});

test('assertAccountSecurity throws on an unsafe session and passes a safe one', async () => {
    await withFolder(async (folder) => {
        const creds = initAuthCreds();
        creds.me = { id: accountJid };
        writeSessionFile(folder, 'creds.json', JSON.stringify(creds));
        chmodSync(join(folder, 'creds.json'), 0o644);
        await assert.rejects(assertAccountSecurity({ authState: { creds }, sessionPath: folder }), (error) => {
            assert.ok(error instanceof AccountSecurityError);
            assert.equal(error.code, 'ACCOUNT_SECURITY_UNSAFE');
            assert.equal(error.report.safe, false);
            return true;
        });

        const { state, saveCreds, vault } = await useMultiFileAuthState(join(folder, 'sealed'), { secret });
        state.creds.me = { id: accountJid };
        await saveCreds();
        const report = await assertAccountSecurity({ authState: state, vault, sessionPath: join(folder, 'sealed') });
        assert.equal(report.safe, true);
    });
});

test('incomplete credentials are flagged', async () => {
    const report = await auditAccountSecurity({ authState: { creds: { registered: true, me: { id: accountJid } } } });
    assert.equal(report.safe, false);
    assert.ok(report.findings.some((finding) => finding.id === 'creds-keys-missing' && finding.severity === 'critical'));
});

test('restrictSessionPermissions tightens a session folder', async () => {
    await withFolder(async (folder) => {
        writeSessionFile(folder, 'creds.json', '{}');
        chmodSync(join(folder, 'creds.json'), 0o644);
        chmodSync(folder, 0o755);
        const result = await restrictSessionPermissions(folder);
        assert.equal(result.directory, true);
        assert.ok(result.updated >= 1);
        assert.equal(statSync(join(folder, 'creds.json')).mode & 0o777, 0o600);
        assert.equal(statSync(folder).mode & 0o777, 0o700);
        const report = await auditAccountSecurity({ authState: null, sessionPath: folder });
        assert.ok(!report.findings.some((finding) => finding.severity === 'high' && finding.id.startsWith('session-file-permissions')));
    });
});

function writeSessionFile(folder, name, contents) {
    writeFileSync(join(folder, name), contents, { mode: 0o600 });
}
