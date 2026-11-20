import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import {
    createConcurrencyLimiter,
    makeMultiSessionManager,
    normalizeReconnectOptions,
    reconnectDelay
} from '../src/Utils/multi-session-manager.js';

const quietLogger = { debug() { }, info() { }, warn() { }, error() { }, trace() { }, child() { return this; } };
const tick = () => new Promise(resolve => setImmediate(resolve));

class FakeSocket {
    constructor(id, registry) {
        this.id = id;
        this.ev = new EventEmitter();
        this.user = { id: `${id}@s.whatsapp.net` };
        this.authState = { creds: { me: { id: this.user.id } } };
        this.ended = false;
        this.endError = undefined;
        this.recovered = [];
        registry.push(this);
    }

    emit(event, payload) {
        return this.ev.emit(event, payload);
    }

    async end(error) {
        this.ended = true;
        this.endError = error?.message;
    }

    async recoverSession(jid, request) {
        this.recovered.push({ jid, request });
        return { jid, recovered: true, refreshed: false };
    }

    async recoverSessions(jids) {
        return { results: jids.map(jid => ({ jid, recovered: true })) };
    }
}

const makeScheduler = () => {
    const tasks = [];
    return {
        tasks,
        setTimeout(work, ms) {
            const task = { work, ms, cleared: false };
            tasks.push(task);
            return task;
        },
        clearTimeout(task) {
            if (task) {
                task.cleared = true;
            }
        },
        async fire() {
            const pending = tasks.splice(0).filter(task => !task.cleared);
            for (const task of pending) {
                await task.work();
            }
            await tick();
            await new Promise(resolve => setTimeout(resolve, 20));
            await tick();
            return pending.length;
        }
    };
};

const makeFactory = () => {
    const sockets = [];
    let active = 0;
    let peak = 0;
    const factory = async (config) => {
        active++;
        peak = Math.max(peak, active);
        await new Promise(resolve => setTimeout(resolve, 5));
        active--;
        return new FakeSocket(config.sessionId, sockets);
    };
    return { factory, sockets, peak: () => peak };
};

const makeManager = (overrides = {}) => {
    const built = makeFactory();
    const scheduler = makeScheduler();
    const manager = makeMultiSessionManager({
        makeSocket: built.factory,
        scheduler,
        logger: quietLogger,
        random: () => 0.5,
        ...overrides
    });
    return { manager, scheduler, ...built };
};

test('concurrency limiter never runs more than the configured number of tasks', async () => {
    const limiter = createConcurrencyLimiter(2);
    let active = 0;
    let peak = 0;
    const work = async () => {
        active++;
        peak = Math.max(peak, active);
        await new Promise(resolve => setTimeout(resolve, 5));
        active--;
        return active;
    };
    await Promise.all(Array.from({ length: 6 }, () => limiter.schedule(work)));
    assert.equal(peak, 2);
    assert.equal(limiter.active, 0);
    assert.equal(limiter.limit, 2);
});

test('reconnect delay is exponential, capped and jitter-free when random is fixed', () => {
    const options = normalizeReconnectOptions({ maxAttempts: 5, baseDelayMs: 100, maxDelayMs: 800, jitter: 0 });
    assert.deepEqual([0, 1, 2, 3, 4].map(attempt => reconnectDelay(attempt, options, () => 0.5)), [100, 200, 400, 800, 800]);
    assert.equal(normalizeReconnectOptions(false).enabled, false);
    assert.ok(reconnectDelay(3, { enabled: true, maxAttempts: 5, baseDelayMs: 100, maxDelayMs: 800, jitter: 1 }, () => 1) <= 1600);
});

test('many sessions start with bounded concurrency and one socket per id', async () => {
    const { manager, sockets, peak } = makeManager({ concurrency: 2 });
    const ids = ['alpha', 'beta', 'gamma', 'delta'];
    const results = await Promise.all(ids.map(id => manager.add(id, { sessionId: id })));
    assert.equal(results.length, 4);
    assert.equal(sockets.length, 4);
    assert.equal(peak(), 2);
    assert.equal(await manager.start('alpha'), results[0]);
    assert.equal(manager.socket('alpha'), results[0]);
    assert.equal(manager.list().length, 4);
    assert.equal(manager.stats().started, 4);
    assert.equal(manager.stats().limiter.limit, 2);
    await manager.shutdown();
});

test('global listeners, credential saves and session recovery fan out correctly', async () => {
    const { manager, sockets } = makeManager({ concurrency: 3 });
    const seen = [];
    const unsubscribe = manager.on('messages.upsert', (id, payload) => seen.push({ id, text: payload.text }));
    let saves = 0;
    const config = (id) => ({ sessionId: id, saveCreds: async () => { saves++; } });
    await Promise.all(['one', 'two'].map(id => manager.add(id, config(id))));
    for (const sock of sockets) {
        sock.emit('messages.upsert', { text: `from-${sock.id}` });
        sock.emit('creds.update', { registrationId: 1 });
        sock.emit('session.recovery', { results: [{ jid: 'x' }] });
        sock.emit('connection.update', { connection: 'open' });
    }
    await tick();
    assert.equal(seen.length, 2);
    assert.deepEqual(seen.map(item => item.text).sort(), ['from-one', 'from-two']);
    assert.equal(saves, 2);
    assert.equal(manager.stats().credsSaves, 2);
    assert.equal(manager.stats().recoveries, 2);
    assert.equal(manager.stats().connected, 2);
    unsubscribe();
    sockets[0].emit('messages.upsert', { text: 'ignored' });
    assert.equal(seen.length, 2);
    const result = await manager.recover('one', '94711111111@s.whatsapp.net', { reason: 'manual' });
    assert.equal(result.recovered, true);
    assert.equal(sockets[0].recovered.length, 1);
    const all = await manager.recoverAll(['111@s.whatsapp.net', '222@s.whatsapp.net']);
    assert.equal(all.length, 2);
    assert.ok(all.every(item => item.results.length === 2));
    await manager.shutdown();
});

test('closed sessions reconnect with backoff, logged-out sessions do not', async () => {
    const { manager, scheduler, sockets } = makeManager({
        reconnect: { maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 400, jitter: 0 }
    });
    await Promise.all(['live', 'gone'].map(id => manager.add(id, { sessionId: id })));
    sockets[0].emit('connection.update', { connection: 'close', lastDisconnect: { error: { output: { statusCode: 408 } } } });
    assert.equal(manager.get('live').state, 'reconnecting');
    assert.equal(scheduler.tasks.length, 1);
    assert.equal(scheduler.tasks[0].ms, 100);
    sockets[1].emit('connection.update', { connection: 'close', lastDisconnect: { error: { output: { statusCode: 401 } } } });
    assert.equal(manager.get('gone').state, 'loggedOut');
    assert.equal(scheduler.tasks.length, 1, 'only the recoverable session is scheduled');
    assert.equal(await scheduler.fire(), 1);
    assert.equal(sockets.length, 3);
    assert.equal(manager.stats().reconnects, 1);
    assert.equal(manager.stats().loggedOut, 1);
    await manager.shutdown();
});

test('stop detaches listeners, ends the socket and prevents stale reconnect events', async () => {
    const { manager, sockets } = makeManager({ reconnect: true });
    const sock = await manager.add('solo', { sessionId: 'solo' });
    assert.equal(await manager.stop('solo'), true);
    assert.equal(sock.ended, true);
    assert.equal(sock.ev.listenerCount('connection.update'), 0);
    assert.equal(manager.get('solo').state, 'stopped');
    sock.emit('connection.update', { connection: 'close', lastDisconnect: { error: { output: { statusCode: 408 } } } });
    assert.equal(manager.get('solo').state, 'stopped');
    const restarted = await manager.restart('solo');
    assert.notEqual(restarted, sock);
    assert.equal(manager.get('solo').attempts, 0);
    assert.equal(await manager.remove('solo'), true);
    assert.equal(manager.get('solo'), undefined);
    await manager.shutdown();
});

test('a second start while one is in flight returns the same socket', async () => {
    const { manager, sockets } = makeManager({ concurrency: 1 });
    const [a, b] = await Promise.all([
        manager.add('pair', { sessionId: 'pair' }),
        manager.start('pair').catch(() => undefined)
    ]);
    assert.ok(a);
    assert.equal(sockets.length, 1);
    assert.equal(b === undefined || b === a, true);
    await manager.shutdown();
});
