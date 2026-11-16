import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeContactCheckCache, normalizeContactCheckCache, normalizePhoneDigits, phoneToJid, resolveContactChecks } from '../src/Utils/contact-check.js';
import { makeMediaDownloadCache, normalizeMediaDownloadCache } from '../src/Utils/media-download-cache.js';

test('phone numbers are normalised the way the server expects them', () => {
    assert.equal(normalizePhoneDigits('+94 77-000 0000'), '94770000000');
    assert.equal(normalizePhoneDigits('94770000000@s.whatsapp.net'), '94770000000');
    assert.equal(normalizePhoneDigits('94770000000:12@s.whatsapp.net'), '94770000000');
    assert.equal(normalizePhoneDigits(94770000000), '94770000000');
    assert.equal(normalizePhoneDigits('not a number'), undefined);
    assert.equal(phoneToJid('+94 77 000 0000'), '94770000000@s.whatsapp.net');
    assert.equal(phoneToJid(''), undefined);
});

test('the contact cache can be disabled or sized', () => {
    assert.equal(normalizeContactCheckCache(false), null);
    assert.equal(normalizeContactCheckCache({ enabled: false }), null);
    assert.deepEqual(normalizeContactCheckCache({ ttlMs: 1000, max: 10 }), { ttlMs: 1000, max: 10 });
    const cache = makeContactCheckCache(true);
    cache.set('94770000000@s.whatsapp.net', true);
    assert.equal(cache.get('94770000000@s.whatsapp.net'), true);
    assert.equal(cache.stats().keys, 1);
    cache.clear();
    assert.equal(cache.get('94770000000@s.whatsapp.net'), undefined);
});

test('checks are cached, chunked, and reported in input order', async () => {
    const cache = makeContactCheckCache({ ttlMs: 60_000, max: 100 });
    const calls = [];
    const query = async (jids) => {
        calls.push([...jids]);
        return jids.map(jid => ({ jid, exists: jid !== '94799999999@s.whatsapp.net' }));
    };
    const first = await resolveContactChecks({
        inputs: ['94711111111', '+94722222222', '94799999999', '94711111111', 'status@broadcast'],
        cache,
        query,
        chunkSize: 2,
        concurrency: 1,
        delayMs: 0
    });
    assert.deepEqual(first.map(entry => entry.jid), [
        '94711111111@s.whatsapp.net',
        '94722222222@s.whatsapp.net',
        '94799999999@s.whatsapp.net'
    ]);
    assert.deepEqual(first.map(entry => entry.exists), [true, true, false]);
    assert.deepEqual(calls.length, 2);

    const second = await resolveContactChecks({
        inputs: ['94711111111', '94799999999'],
        cache,
        query,
        chunkSize: 2,
        delayMs: 0
    });
    assert.deepEqual(second.map(entry => entry.cached), [true, true]);
    assert.equal(calls.length, 2, 'a cached answer must not hit the server');
});

test('a query that forgets an id reports it as missing', async () => {
    const results = await resolveContactChecks({
        inputs: ['94711111111', '94722222222'],
        cache: null,
        query: async ([jid]) => [{ jid, exists: true }],
        chunkSize: 10,
        delayMs: 0
    });
    assert.deepEqual(results.map(entry => entry.exists), [true, false]);
});

test('the media download cache is bounded by entry size and bytes', () => {
    assert.equal(normalizeMediaDownloadCache(false), null);
    const settings = normalizeMediaDownloadCache({ ttlMs: 1000, max: 2, maxBytes: 6, maxEntryBytes: 4 });
    assert.deepEqual(settings, { ttlMs: 1000, max: 2, maxBytes: 6, maxEntryBytes: 4 });
    const cache = makeMediaDownloadCache({ ttlMs: 1000, max: 2, maxBytes: 6, maxEntryBytes: 4 });
    assert.equal(cache.set('a', Buffer.alloc(3, 1)), true);
    assert.equal(cache.set('b', Buffer.alloc(5, 2)), false, 'oversized entries are skipped');
    assert.equal(cache.set('c', Buffer.alloc(3, 3)), true);
    assert.equal(cache.set('d', Buffer.alloc(3, 4)), true);
    assert.equal(cache.stats().entries, 2, 'the byte budget evicts the oldest entry');
    assert.equal(cache.stats().bytes, 6);
    assert.equal(cache.get('a'), undefined);
    assert.equal(cache.get('d').length, 3);
    cache.clear();
    assert.equal(cache.stats().entries, 0);
});
