import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSendRateLimiter, normalizeSendRateLimit, SEND_RATE_LIMIT_DEFAULTS, typingDelayMs } from '../src/Utils/send-rate-limit.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('the limiter is opt-in and normalises its options', () => {
    assert.equal(normalizeSendRateLimit(undefined), null);
    assert.equal(normalizeSendRateLimit(false), null);
    assert.equal(normalizeSendRateLimit({ enabled: false }), null);
    assert.deepEqual(normalizeSendRateLimit(true), { ...SEND_RATE_LIMIT_DEFAULTS });
    const custom = normalizeSendRateLimit({ perChatMs: 900, burst: 5, jitter: 100, simulateTyping: true });
    assert.equal(custom.perChatMs, 900);
    assert.equal(custom.burst, 5);
    assert.equal(custom.simulateTyping, true);
    const broken = normalizeSendRateLimit({ perChatMs: -5, burst: 0, maxQueue: 'x' });
    assert.equal(broken.perChatMs, SEND_RATE_LIMIT_DEFAULTS.perChatMs);
    assert.equal(broken.burst, SEND_RATE_LIMIT_DEFAULTS.burst);
    assert.equal(broken.maxQueue, SEND_RATE_LIMIT_DEFAULTS.maxQueue);
    assert.equal(typingDelayMs({ typingMs: 10, typingJitter: 0 }), 10);
});

test('a burst goes out immediately and the rest is spaced per chat', async () => {
    const limiter = createSendRateLimiter({ perChatMs: 40, burst: 2, jitter: 0, random: () => 0 });
    const stamps = [];
    const run = (index) => limiter.schedule('chat-a', async () => {
        stamps.push({ index, at: Date.now() });
        return index;
    });
    const started = Date.now();
    const results = await Promise.all([run(0), run(1), run(2), run(3)]);
    assert.deepEqual(results, [0, 1, 2, 3]);
    assert.deepEqual(stamps.map(entry => entry.index), [0, 1, 2, 3]);
    assert.ok(stamps[1].at - stamps[0].at < 20, 'the burst window should not wait');
    assert.ok(stamps[2].at - stamps[0].at >= 30, 'the third send waits for a token');
    assert.ok(Date.now() - started >= 60);
    const stats = limiter.stats();
    assert.equal(stats.sent, 4);
    assert.equal(stats.queued, 0);
});

test('chats are limited independently and errors reach the caller', async () => {
    const limiter = createSendRateLimiter({ perChatMs: 60, burst: 1, jitter: 0 });
    const failed = limiter.schedule('chat-a', async () => {
        throw new Error('send failed');
    });
    await assert.rejects(failed, /send failed/);
    const other = await limiter.schedule('chat-b', async () => 'ok');
    assert.equal(other, 'ok');
    await limiter.drain();
});

test('the queue is bounded per chat', async () => {
    const limiter = createSendRateLimiter({ perChatMs: 500, burst: 1, jitter: 0, maxQueue: 1 });
    const first = limiter.schedule('chat-a', () => sleep(5));
    const second = limiter.schedule('chat-a', () => sleep(5));
    await assert.rejects(() => limiter.schedule('chat-a', () => sleep(5)), (error) => {
        assert.equal(error.output?.statusCode, 429);
        assert.equal(error.data?.chat, 'chat-a');
        return true;
    });
    assert.equal(limiter.stats().rejected, 1);
    await limiter.drain();
    await Promise.all([first, second]);
});

test('drain flushes the queue without waiting for the tokens', async () => {
    const limiter = createSendRateLimiter({ perChatMs: 60_000, burst: 1, jitter: 0 });
    let done = 0;
    const tasks = [0, 1, 2].map(() => limiter.schedule('chat-a', () => { done += 1; }));
    assert.equal(limiter.pending('chat-a'), 2);
    await limiter.drain();
    await Promise.all(tasks);
    assert.equal(done, 3);
    assert.equal(limiter.stats().queued, 0);
    limiter.reset();
    assert.deepEqual(limiter.stats().sent, 0);
});
