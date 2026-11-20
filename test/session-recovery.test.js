import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jidDecode } from '../src/WABinary/jid-utils.js';
import {
    classifyRetryError,
    collectRecoveryTargets,
    isMacErrorText,
    makeSessionRecovery,
    normalizeSessionRecovery,
    SESSION_RECOVERY_DEFAULTS
} from '../src/Utils/session-recovery.js';
import { MAC_ERROR_CODES, MessageRetryManager, RetryReason, SESSION_RECOVERY_CODES } from '../src/Utils/message-retry-manager.js';

const quietLogger = { debug() { }, info() { }, warn() { }, error() { }, trace() { } };

const PN_USER = '94711111111';
const LID_USER = '222222liduser';
const GROUP_JID = '120363000000000000@g.us';

const makeHarness = ({ initial = {} } = {}) => {
    const store = new Map();
    const bucket = (type) => {
        if (!store.has(type)) {
            store.set(type, new Map());
        }
        return store.get(type);
    };
    for (const [type, entries] of Object.entries(initial)) {
        for (const [id, value] of Object.entries(entries)) {
            bucket(type).set(id, value);
        }
    }
    const writes = [];
    const keys = {
        get: async (type, ids) => {
            const result = {};
            for (const id of ids) {
                const value = bucket(type).get(id);
                if (value !== undefined && value !== null) {
                    result[id] = value;
                }
            }
            return result;
        },
        set: async (data) => {
            writes.push(data);
            for (const [type, entries] of Object.entries(data)) {
                for (const [id, value] of Object.entries(entries)) {
                    if (value === null || value === undefined) {
                        bucket(type).delete(id);
                    }
                    else {
                        bucket(type).set(id, value);
                    }
                }
            }
        },
        list: async (type) => [...bucket(type).keys()]
    };
    const signalRepository = {
        jidToSignalProtocolAddress: (jid) => {
            const decoded = jidDecode(jid);
            const suffix = decoded.server === 'lid' || decoded.server === 'hosted.lid' ? '_1' : '';
            return `${decoded.user}${suffix}.${decoded.device ?? 0}`;
        }
    };
    const refreshCalls = [];
    const events = [];
    const deletedDevices = [];
    const retryManager = new MessageRetryManager(quietLogger, 3);
    const recovery = makeSessionRecovery({
        keys,
        listingKeys: keys,
        signalRepository,
        assertSessions: async (jids, force) => {
            refreshCalls.push({ jids, force });
            return true;
        },
        messageRetryManager: retryManager,
        userDevicesCache: { del: (ids) => deletedDevices.push(...ids) },
        ev: { emit: (event, payload) => events.push({ event, payload }) },
        logger: quietLogger
    });
    return { store, bucket, writes, keys, signalRepository, refreshCalls, events, deletedDevices, retryManager, recovery };
};

const defaultInitial = () => ({
    session: {
        [`${PN_USER}.0`]: Buffer.from('pn-0'),
        [`${PN_USER}.1`]: Buffer.from('pn-1'),
        [`${LID_USER}_1.0`]: Buffer.from('lid-0'),
        '99999999999.0': Buffer.from('unrelated')
    },
    'device-list': { [PN_USER]: ['0', '1', '2'] },
    'lid-mapping': { [PN_USER]: LID_USER },
    'identity-key': { [`${PN_USER}.1`]: Buffer.from('identity') },
    'sender-key': {
        [`${GROUP_JID}::${PN_USER}.0`]: Buffer.from('sk'),
        '99999999999@g.us::other.0': Buffer.from('sk-other')
    },
    'sender-key-memory': { [GROUP_JID]: { 'someone': true } }
});

test('MAC error codes and texts are classified for instant recovery', () => {
    assert.deepEqual([...MAC_ERROR_CODES], [RetryReason.SignalErrorInvalidMessage, RetryReason.SignalErrorBadMac]);
    assert.ok(SESSION_RECOVERY_CODES.includes(RetryReason.SignalErrorInvalidKeyId));
    assert.ok(classifyRetryError({ attrs: { error: '7' } }).isMac);
    assert.equal(classifyRetryError({ attrs: { error: '7' } }).code, RetryReason.SignalErrorBadMac);
    assert.equal(classifyRetryError('4').reason, 'SignalErrorInvalidMessage');
    assert.ok(classifyRetryError({ messageStubParameters: ['SessionError: Bad MAC'] }).recoverable);
    assert.ok(classifyRetryError('SignalErrorBadMac').isMac);
    assert.equal(classifyRetryError('bad mac').code, undefined);
    assert.ok(isMacErrorText('Message MAC verification failed'));
    assert.equal(classifyRetryError({ attrs: { error: '500' } }).recoverable, false);
    assert.equal(classifyRetryError(undefined).recoverable, false);
});

test('partial recovery settings keep the safe defaults', () => {
    const normalized = normalizeSessionRecovery({ cooldownMs: 250, refreshSessions: false });
    assert.equal(normalized.cooldownMs, 250);
    assert.equal(normalized.refreshSessions, false);
    assert.equal(normalized.purgeRelatedSessions, SESSION_RECOVERY_DEFAULTS.purgeRelatedSessions);
    assert.equal(normalizeSessionRecovery(false).autoRecoverMacErrors, false);
    assert.equal(normalizeSessionRecovery(undefined).enabled, true);
});

test('recovery targets cover PN, LID, every device and group sender keys', async () => {
    const { keys, signalRepository } = makeHarness({ initial: defaultInitial() });
    const targets = await collectRecoveryTargets({
        jid: `${PN_USER}:1@s.whatsapp.net`,
        keys,
        listingKeys: keys,
        signalRepository,
        groupJid: GROUP_JID
    });
    assert.deepEqual(targets.users, [PN_USER, LID_USER]);
    for (const address of [`${PN_USER}.0`, `${PN_USER}.1`, `${PN_USER}.2`, `${LID_USER}_1.0`, `${LID_USER}_1.1`, `${LID_USER}_1.2`]) {
        assert.ok(targets.addresses.includes(address), `missing ${address}`);
    }
    assert.ok(!targets.addresses.includes('99999999999.0'));
    assert.deepEqual(targets.senderKeyIds, [`${GROUP_JID}::${PN_USER}.0`]);
    assert.ok(targets.refreshJids.some(jid => jid.endsWith('@lid')));
});

test('group and newsletter JIDs are never expanded into Signal devices', async () => {
    const { keys, signalRepository } = makeHarness({ initial: defaultInitial() });
    for (const jid of [GROUP_JID, '120363000000000000@newsletter']) {
        const targets = await collectRecoveryTargets({ jid, keys, listingKeys: keys, signalRepository });
        assert.deepEqual(targets.addresses, []);
        assert.deepEqual(targets.refreshJids, []);
    }
});

test('a LID mapping held only in the in-memory cache is still covered', async () => {
    const { keys, signalRepository } = makeHarness({
        initial: { ...defaultInitial(), 'lid-mapping': {} }
    });
    signalRepository.lidMapping = {
        mappingCache: { get: (key) => key === `pn:${PN_USER}` ? LID_USER : undefined }
    };
    const targets = await collectRecoveryTargets({
        jid: `${PN_USER}:1@s.whatsapp.net`,
        keys,
        listingKeys: keys,
        signalRepository
    });
    assert.ok(targets.users.includes(LID_USER));
    assert.ok(targets.addresses.includes(`${LID_USER}_1.1`));
});

test('a bad MAC purges all related sessions in one write and refreshes bundles once', async () => {
    const initial = defaultInitial();
    const h = makeHarness({ initial });
    h.retryManager.addRecentMessage(`${PN_USER}@s.whatsapp.net`, 'MSG-1', { conversation: 'hello' });
    h.retryManager.incrementRetryCount('MSG-1');
    h.retryManager.saveBaseKey(`${PN_USER}.1`, 'MSG-1', Buffer.from([1, 2, 3]));
    const result = await h.recovery.recover(`${PN_USER}:1@s.whatsapp.net`, {
        code: RetryReason.SignalErrorBadMac,
        reason: 'SignalErrorBadMac',
        groupJid: GROUP_JID,
        purgeIdentityKeys: true
    });
    assert.equal(result.recovered, true);
    assert.equal(result.refreshed, true);
    assert.equal(result.resetMessages, 1);
    assert.equal(h.writes.length, 1, 'all deletions are committed together');
    const write = h.writes[0];
    assert.equal(write.session[`${PN_USER}.0`], null);
    assert.equal(write.session[`${LID_USER}_1.2`], null);
    assert.equal(write['identity-key'][`${PN_USER}.1`], null);
    assert.equal(write['sender-key'][`${GROUP_JID}::${PN_USER}.0`], null);
    assert.equal(write['sender-key-memory'][GROUP_JID], null);
    assert.equal(h.bucket('session').has('99999999999.0'), true, 'unrelated sessions survive');
    assert.equal(h.refreshCalls.length, 1);
    assert.equal(h.refreshCalls[0].force, true);
    assert.ok(h.refreshCalls[0].jids.every(jid => jid.endsWith('@lid')));
    assert.deepEqual(h.deletedDevices, [PN_USER, LID_USER]);
    assert.equal(h.events[0].event, 'session.recovery');
    assert.equal(h.events[0].payload.code, RetryReason.SignalErrorBadMac);
    assert.equal(h.retryManager.getRetryCount('MSG-1'), 0);
    assert.equal(h.retryManager.getRecentMessage(`${PN_USER}@s.whatsapp.net`, 'MSG-1'), undefined);
    assert.equal(h.retryManager.hasSameBaseKey(`${PN_USER}.1`, 'MSG-1', Buffer.from([1, 2, 3])), false);
    assert.equal(h.recovery.stats().purgedSessions, Object.keys(write.session).length);
    assert.equal(h.recovery.stats().byCode.SignalErrorBadMac, 1);
});

test('concurrent recoveries for one user are coalesced into a single purge', async () => {
    const h = makeHarness({ initial: defaultInitial() });
    const [first, second] = await Promise.all([
        h.recovery.recover(`${PN_USER}:1@s.whatsapp.net`, { reason: 'a' }),
        h.recovery.recover(`${PN_USER}:2@s.whatsapp.net`, { reason: 'b' })
    ]);
    assert.equal(h.writes.length, 1);
    assert.equal(h.refreshCalls.length, 1);
    assert.equal(first.coalesced === true || second.coalesced === true, true);
    assert.equal(h.recovery.stats().coalesced, 1);
});

test('recoverMany batches different users and cooldown can be overridden', async () => {
    const h = makeHarness({ initial: defaultInitial() });
    const batch = await h.recovery.recoverMany([
        `${PN_USER}:1@s.whatsapp.net`,
        '94722222222:0@s.whatsapp.net'
    ], { reason: 'bulk', cooldownMs: 60_000, auto: true });
    assert.equal(batch.results.length, 2);
    assert.equal(h.writes.length, 1);
    assert.equal(h.refreshCalls.length, 1);
    const repeated = await h.recovery.recover(`${PN_USER}:1@s.whatsapp.net`, { cooldownMs: 60_000, auto: true });
    assert.equal(repeated.skipped, 'cooldown');
    assert.equal(h.writes.length, 1);
    const forced = await h.recovery.recover(`${PN_USER}:1@s.whatsapp.net`, { cooldownMs: 60_000, force: true, auto: true });
    assert.equal(forced.recovered, true);
    assert.equal(h.writes.length, 2);
});

test('recovery can be disabled without breaking manual forced calls', async () => {
    const h = makeHarness({ initial: defaultInitial() });
    const disabled = makeSessionRecovery({
        keys: h.keys,
        listingKeys: h.keys,
        signalRepository: h.signalRepository,
        logger: quietLogger,
        options: false
    });
    assert.equal((await disabled.recover(`${PN_USER}:1@s.whatsapp.net`)).skipped, 'disabled');
    assert.equal((await disabled.recover(`${PN_USER}:1@s.whatsapp.net`, { force: true })).recovered, true);
});

test('resetRetryCounter clears a stale counter without dropping the cached message', () => {
    const manager = new MessageRetryManager(quietLogger, 3);
    manager.addRecentMessage(`${PN_USER}@s.whatsapp.net`, 'KEEP', { conversation: 'resend me' });
    manager.incrementRetryCount('KEEP');
    manager.incrementRetryCount('KEEP');
    manager.saveBaseKey(`${PN_USER}.0`, 'KEEP', Buffer.from([7]));
    manager.resetRetryCounter('KEEP');
    assert.equal(manager.getRetryCount('KEEP'), 0);
    assert.equal(manager.hasSameBaseKey(`${PN_USER}.0`, 'KEEP', Buffer.from([7])), false);
    assert.deepEqual(manager.getRecentMessage(`${PN_USER}@s.whatsapp.net`, 'KEEP').message, { conversation: 'resend me' });
});

test('resetJid clears counters, pending phone requests and base keys', () => {
    const manager = new MessageRetryManager(quietLogger, 3);
    manager.addRecentMessage(`${PN_USER}@s.whatsapp.net`, 'A', { conversation: 'a' });
    manager.addRecentMessage(`${PN_USER}:2@s.whatsapp.net`, 'B', { conversation: 'b' });
    manager.incrementRetryCount('A');
    manager.incrementRetryCount('B');
    manager.saveBaseKey(`${PN_USER}.0`, 'A', Buffer.from([9]));
    let fired = false;
    manager.schedulePhoneRequest('A', () => { fired = true; }, 5);
    const removed = manager.resetJid(`${PN_USER}:1@s.whatsapp.net`, {
        users: [LID_USER],
        addresses: [`${PN_USER}.0`]
    });
    assert.equal(removed, 2);
    assert.equal(manager.getRetryCount('A'), 0);
    assert.equal(manager.getRetryCount('B'), 0);
    assert.equal(manager.hasSameBaseKey(`${PN_USER}.0`, 'A', Buffer.from([9])), false);
    assert.equal(manager.statistics.jidResets, 1);
    assert.equal(Object.keys(manager.pendingPhoneRequests).length, 0);
    assert.equal(fired, false);
});
