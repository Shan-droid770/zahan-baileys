import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { mkdtempSync, rmSync, writeFileSync, utimesSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bindViewOnceCache, bindViewOnceRetrieval, buildViewOncePayload, describeViewOnce, downloadViewOnceMedia, getViewOnceMediaType, hasDownloadableViewOnceMedia, hydrateQuotedViewOnce, isViewOnceMessage, makeViewOnceStore, normalizeViewOnceOptions, openViewOnceMedia, resolveViewOnceMessage, unwrapViewOnce } from '../src/Utils/view-once.js';
import { getMediaKeys } from '../src/Utils/messages-media.js';
import { downloadMediaMessage } from '../src/Utils/messages.js';
import { prepareStatusImage, prepareStatusMedia } from '../src/Utils/status-media.js';
import { expandStatusTargets, makeChannelStatusSender, makeStatusSender, resolveStatusTargets } from '../src/Utils/status-send.js';
import { bindResourceGuard, cleanupTempMedia, getStorageUsage, getTempMediaDirectory, getTempMediaUsage, trimMemory } from '../src/Utils/resource-guard.js';
import { DEFAULT_CONNECTION_CONFIG } from '../src/Defaults/index.js';
import { generateProfilePicture } from '../src/Utils/messages-media.js';
import { makeInMemoryStore } from '../src/Store/make-in-memory-store.js';
import { TTLCache } from '../src/Utils/ttl-cache.js';
import { hasOptionalMedia } from '../src/Utils/optional-media.js';

const logger = { debug() {}, info() {}, warn() {}, error() {}, trace() {}, child() { return logger; } };

const quietConfig = (viewOnceRetrieval) => ({ logger, viewOnceRetrieval });

const imageMedia = {
    url: 'https://mmg.whatsapp.net/d/fake',
    mediaKey: Buffer.from('0123456789abcdef0123456789abcdef'),
    mimetype: 'image/jpeg',
    caption: 'kept secret',
    fileLength: 5,
    viewOnce: true
};
const viewOnceWrapper = (media = imageMedia) => ({ viewOnceMessageV2: { message: { imageMessage: media } } });

const makeMessage = ({ chat = '94770000000@s.whatsapp.net', id = 'VO-1', message }) => ({
    key: { remoteJid: chat, id, fromMe: false },
    message,
    messageTimestamp: 1
});

const makeSocket = () => {
    const handlers = new Map();
    const sent = [];
    const sock = {
        authState: { creds: { me: { id: '94711111111@s.whatsapp.net' } } },
        ev: {
            on(event, handler) {
                handlers.set(event, handler);
            },
            off(event) {
                handlers.delete(event);
            },
            emit(event, payload) {
                return handlers.get(event)?.(payload);
            }
        },
        async sendMessage(jid, content, options) {
            sent.push({ jid, content, options });
            return { key: { remoteJid: jid, id: `sent-${sent.length}` }, message: content };
        },
        async updateMediaMessage(message) {
            return message;
        }
    };
    return { sock, sent, handlers };
};

const fakeDownload = (buffer = Buffer.from('decrypted-media')) => async (message, type) => (type === 'buffer' ? buffer : Readable.from(buffer));

test('view-once detection and unwrapping', () => {
    assert.equal(isViewOnceMessage(viewOnceWrapper()), true);
    assert.equal(isViewOnceMessage({ imageMessage: { url: 'x', viewOnce: true } }), true);
    assert.equal(isViewOnceMessage({ imageMessage: { url: 'x' } }), false);
    assert.equal(isViewOnceMessage(undefined), false);

    const inner = unwrapViewOnce(viewOnceWrapper());
    assert.equal(inner.imageMessage.caption, 'kept secret');
    assert.equal(getViewOnceMediaType(viewOnceWrapper()), 'image');
    assert.equal(getViewOnceMediaType({ viewOnceMessage: { message: { videoMessage: { viewOnce: true } } } }), 'video');
    assert.equal(getViewOnceMediaType({ conversation: 'hello' }), undefined);

    const described = describeViewOnce(viewOnceWrapper());
    assert.equal(described.type, 'image');
    assert.equal(described.caption, 'kept secret');
    assert.equal(described.mimetype, 'image/jpeg');
});

test('view-once store is bounded and keyed per chat', () => {
    const store = makeViewOnceStore({ max: 2, ttlMs: 60000 });
    assert.equal(store.remember(makeMessage({ message: viewOnceWrapper() })), true);
    assert.equal(store.remember(makeMessage({ id: 'VO-2', message: viewOnceWrapper() })), true);
    assert.equal(store.remember(makeMessage({ id: 'VO-3', message: viewOnceWrapper() })), true);
    assert.equal(store.size, 2);
    assert.equal(store.get('94770000000@s.whatsapp.net', 'VO-3').key.id, 'VO-3');
    store.delete('94770000000@s.whatsapp.net', 'VO-3');
    assert.equal(store.get('94770000000@s.whatsapp.net', 'VO-3'), undefined);
    store.clear();
    assert.equal(store.size, 0);
});

test('view-once payload keeps the caption and media type', () => {
    const image = buildViewOncePayload({ type: 'image', buffer: Buffer.from('x'), mimetype: 'image/jpeg', caption: 'hi' });
    assert.ok(Buffer.isBuffer(image.image));
    assert.equal(image.caption, 'hi');
    assert.equal(image.mimetype, 'image/jpeg');

    const document = buildViewOncePayload({ type: 'video', buffer: Buffer.from('x'), mimetype: 'video/mp4' }, { asDocument: true });
    assert.ok(Buffer.isBuffer(document.document));
    assert.equal(document.fileName, 'view-once.mp4');

    const voice = buildViewOncePayload({ type: 'audio', buffer: Buffer.from('x'), ptt: true });
    assert.equal(voice.ptt, true);
});

test('openViewOnceMedia can stream or buffer and enforces the size limit', async () => {
    const buffered = await downloadViewOnceMedia({ key: { id: 'VO-1' }, message: viewOnceWrapper() }, { download: fakeDownload() });
    assert.equal(buffered.type, 'image');
    assert.equal(buffered.buffer.toString(), 'decrypted-media');
    assert.equal(buffered.caption, 'kept secret');

    const streamed = await openViewOnceMedia({ key: { id: 'VO-1' }, message: viewOnceWrapper() }, { download: fakeDownload() });
    assert.ok(streamed.stream);
    assert.equal(await new Promise((resolve, reject) => {
        const chunks = [];
        streamed.stream.on('data', chunk => chunks.push(chunk));
        streamed.stream.on('end', () => resolve(Buffer.concat(chunks).toString()));
        streamed.stream.on('error', reject);
    }), 'decrypted-media');

    await assert.rejects(
        () => downloadViewOnceMedia({ key: { id: 'VO-1' }, message: viewOnceWrapper() }, { download: fakeDownload(), maxBytes: 2 }),
        error => error.output?.statusCode === 413
    );
    await assert.rejects(
        () => downloadViewOnceMedia({ key: { id: 'x' }, message: { conversation: 'not media' } }, { download: fakeDownload() }),
        error => error.output?.statusCode === 400
    );
});

test('a reaction with the unlock emoji resends the view-once media', async () => {
    const { sock, sent, handlers } = makeSocket();
    const stop = bindViewOnceRetrieval(sock, {
        logger,
        viewOnceRetrieval: { emojis: ['🔓'], ackEmoji: null, mode: 'buffer', download: fakeDownload() }
    });
    assert.ok(handlers.has('messages.upsert'));

    const chat = '94770000000@s.whatsapp.net';
    await sock.ev.emit('messages.upsert', { type: 'notify', messages: [makeMessage({ message: viewOnceWrapper() })] });
    await sock.ev.emit('messages.upsert', {
        type: 'notify',
        messages: [{
            key: { remoteJid: chat, id: 'reaction-1', fromMe: false },
            message: { reactionMessage: { text: '🔓', key: { remoteJid: chat, id: 'VO-1' } } }
        }]
    });
    assert.equal(sent.length, 1);
    assert.equal(sent[0].jid, chat);
    assert.equal(sent[0].content.image.toString(), 'decrypted-media');
    assert.equal(sent[0].content.caption, 'kept secret');
    assert.equal(sent[0].options.quoted.key.id, 'reaction-1');
    stop();
    assert.equal(handlers.has('messages.upsert'), false);
});

test('any emoji opens a view-once message by default', async () => {
    const { sock, sent } = makeSocket();
    bindViewOnceRetrieval(sock, {
        logger,
        viewOnceRetrieval: { ackEmoji: null, mode: 'buffer', download: fakeDownload() }
    });
    const chat = '94770000000@s.whatsapp.net';
    await sock.ev.emit('messages.upsert', { type: 'notify', messages: [makeMessage({ message: viewOnceWrapper() })] });
    for (const [index, emoji] of ['❤️', '👍', '😂', '🎉'].entries()) {
        await sock.ev.emit('messages.upsert', {
            type: 'notify',
            messages: [{
                key: { remoteJid: chat, id: `reaction-any-${index}`, fromMe: false },
                message: { reactionMessage: { text: emoji, key: { remoteJid: chat, id: 'VO-1' } } }
            }]
        });
    }
    assert.equal(sent.length, 4);
    assert.equal(normalizeViewOnceOptions(undefined).emojis, null);
    assert.equal(normalizeViewOnceOptions({ emojis: ['🔓'] }).emojis[0], '🔓');
});

test('unrelated emoji reactions are ignored', async () => {
    const { sock, sent } = makeSocket();
    bindViewOnceRetrieval(sock, {
        logger,
        viewOnceRetrieval: { emojis: ['🔓'], ackEmoji: null, mode: 'buffer', download: fakeDownload() }
    });
    const chat = '94770000000@s.whatsapp.net';
    await sock.ev.emit('messages.upsert', { type: 'notify', messages: [makeMessage({ message: viewOnceWrapper() })] });
    await sock.ev.emit('messages.upsert', {
        type: 'notify',
        messages: [{
            key: { remoteJid: chat, id: 'reaction-2', fromMe: false },
            message: { reactionMessage: { text: '❤️', key: { remoteJid: chat, id: 'VO-1' } } }
        }]
    });
    assert.equal(sent.length, 0);
});

test('replying to a view-once message sends the original media', async () => {
    const { sock, sent } = makeSocket();
    bindViewOnceRetrieval(sock, {
        logger,
        viewOnceRetrieval: { reply: true, react: false, ackEmoji: null, mode: 'buffer', download: fakeDownload() }
    });
    const chat = '94770000000@s.whatsapp.net';
    await sock.ev.emit('messages.upsert', {
        type: 'notify',
        messages: [{
            key: { remoteJid: chat, id: 'reply-1', fromMe: false },
            message: {
                extendedTextMessage: {
                    text: 'open it',
                    contextInfo: {
                        stanzaId: 'VO-EXTERNAL',
                        quotedMessage: viewOnceWrapper({
                            url: 'https://mmg.whatsapp.net/d/fake',
                            mediaKey: Buffer.from('0123456789abcdef0123456789abcdef'),
                            mimetype: 'image/jpeg',
                            caption: 'quoted'
                        })
                    }
                }
            }
        }]
    });
    assert.equal(sent.length, 1);
    assert.equal(sent[0].content.caption, 'quoted');
});

test('view-once retrieval can be disabled', async () => {
    const { sock, sent, handlers } = makeSocket();
    const stop = bindViewOnceRetrieval(sock, quietConfig(false));
    assert.equal(handlers.size, 0);
    await sock.ev.emit('messages.upsert', { type: 'notify', messages: [makeMessage({ message: viewOnceWrapper() })] });
    assert.equal(sent.length, 0);
    stop();
    assert.equal(normalizeViewOnceOptions(undefined).enabled, true);
});

test('stripped quoted view-once replies recover mediaKey and urls from store, LID/PN alt jids, fromMe originals, and getMessage', async () => {
    const store = makeViewOnceStore();
    const chatPn = '94770000001@s.whatsapp.net';
    const chatLid = '123456789012345@lid';
    const fullMedia = {
        directPath: '/v/t62.7118-24/fake-path',
        mediaKey: Buffer.from('0123456789abcdef0123456789abcdef'),
        fileSha256: Buffer.from('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),
        fileEncSha256: Buffer.from('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'),
        fileLength: 42,
        mimetype: 'image/jpeg',
        caption: 'from updated client',
        viewOnce: true
    };
    const originalFromMe = {
        key: { remoteJid: chatPn, remoteJidAlt: chatLid, id: 'VO-STRIPPED-1', fromMe: true },
        message: viewOnceWrapper(fullMedia)
    };
    store.remember(originalFromMe);
    assert.equal(store.get(chatLid, 'VO-STRIPPED-1')?.key?.id, 'VO-STRIPPED-1');

    const replyWithStrippedQuote = {
        key: { remoteJid: chatLid, id: 'VV-CMD-1', fromMe: false },
        message: {
            extendedTextMessage: {
                text: '.vv',
                contextInfo: {
                    stanzaId: 'VO-STRIPPED-1',
                    quotedMessage: {
                        viewOnceMessageV2: {
                            message: {
                                imageMessage: {
                                    mimetype: 'image/jpeg',
                                    mediaKey: Buffer.alloc(0),
                                    viewOnce: true
                                }
                            }
                        }
                    }
                }
            }
        }
    };

    assert.equal(hasDownloadableViewOnceMedia(replyWithStrippedQuote.message.extendedTextMessage.contextInfo.quotedMessage), false);
    const hydrated = await hydrateQuotedViewOnce(replyWithStrippedQuote, { store });
    assert.equal(hydrated, true);
    const hydratedQuoted = replyWithStrippedQuote.message.extendedTextMessage.contextInfo.quotedMessage;
    assert.equal(hasDownloadableViewOnceMedia(hydratedQuoted), true);
    assert.equal(hydratedQuoted.viewOnceMessageV2.message.imageMessage.directPath, fullMedia.directPath);
    assert.equal(hydratedQuoted.viewOnceMessageV2.message.imageMessage.url, 'https://mmg.whatsapp.net/v/t62.7118-24/fake-path');
    assert.equal(hydratedQuoted.viewOnceMessageV2.message.imageMessage.caption, 'from updated client');

    const { sock, sent } = makeSocket();
    sock.viewOnceStore = makeViewOnceStore();
    const stopCache = bindViewOnceCache(sock, { store: sock.viewOnceStore });
    const stopRetrieval = bindViewOnceRetrieval(sock, {
        logger,
        viewOnceRetrieval: {
            reply: true,
            react: false,
            ackEmoji: null,
            download: async (target) => {
                assert.equal(hasDownloadableViewOnceMedia(target.message), true);
                return Readable.from(Buffer.from('ok'));
            }
        }
    });

    await sock.ev.emit('messages.upsert', { type: 'notify', messages: [originalFromMe] });
    await sock.ev.emit('messages.upsert', {
        type: 'notify',
        messages: [{
            key: { remoteJid: chatLid, id: 'VV-CMD-2', fromMe: false },
            message: {
                extendedTextMessage: {
                    text: '.vv',
                    contextInfo: {
                        stanzaId: 'VO-STRIPPED-1',
                        quotedMessage: {
                            viewOnceMessageV2: {
                                message: {
                                    imageMessage: { mimetype: 'image/jpeg', viewOnce: true }
                                }
                            }
                        }
                    }
                }
            }
        }]
    });
    assert.equal(sent.length, 1);
    assert.equal(sent[0].content.caption, 'from updated client');
    stopRetrieval();
    stopCache();

    const getMessageHit = await resolveViewOnceMessage({
        key: { remoteJid: chatPn, id: 'VV-CMD-3', fromMe: false },
        message: {
            extendedTextMessage: {
                text: '.vv',
                contextInfo: {
                    stanzaId: 'VO-FROM-DB',
                    quotedMessage: {
                        viewOnceMessageV2: {
                            message: { imageMessage: { mimetype: 'image/jpeg', viewOnce: true } }
                        }
                    }
                }
            }
        }
    }, {
        getMessage: async ({ id }) => (id === 'VO-FROM-DB' ? { key: { remoteJid: chatPn, id }, message: viewOnceWrapper(fullMedia) } : undefined)
    });
    assert.equal(getMessageHit?.key?.id, 'VO-FROM-DB');
    assert.equal(hasDownloadableViewOnceMedia(getMessageHit), true);
});

test('stripped view-once stubs never overwrite cached originals, honor group isolation, and fail clearly when unrecoverable', async () => {
    const store = makeViewOnceStore();
    const groupA = '120363000000000001@g.us';
    const groupB = '120363000000000002@g.us';
    store.remember(makeMessage({ chat: groupA, id: 'SHARED-VO', message: viewOnceWrapper() }));
    assert.equal(store.remember(makeMessage({
        chat: groupA,
        id: 'SHARED-VO',
        message: viewOnceWrapper({ mimetype: 'image/jpeg', viewOnce: true })
    })), false);
    assert.equal(hasDownloadableViewOnceMedia(store.get(groupA, 'SHARED-VO')), true);
    assert.equal(store.getById('SHARED-VO', groupA)?.key?.id, 'SHARED-VO');
    assert.equal(store.getById('SHARED-VO', groupB), undefined);

    assert.equal(isViewOnceMessage({ spoilerMessage: { message: viewOnceWrapper() } }), true);
    assert.equal(getViewOnceMediaType({ viewOnceMessageV2: { message: { instantImageMessage: { mediaKey: Buffer.from('1234'), directPath: '/v/1' } } } }), 'image');
    assert.equal(getViewOnceMediaType({ ptvMessage: { viewOnce: true, mediaKey: Buffer.from('1234'), directPath: '/v/2' } }), 'video');

    await assert.rejects(
        () => openViewOnceMedia(makeMessage({
            id: 'VO-NO-KEY',
            message: viewOnceWrapper({ mimetype: 'image/jpeg', viewOnce: true })
        })),
        (err) => err?.output?.statusCode === 422
    );
});

test('getMediaKeys rejects empty buffers and downloadMediaMessage supports directPath-only media', async () => {
    await assert.rejects(() => getMediaKeys(Buffer.alloc(0), 'image'), /empty media key/i);
    await assert.rejects(() => getMediaKeys(new Uint8Array(0), 'image'), /empty media key/i);
    await assert.rejects(() => getMediaKeys({ type: 'Buffer', data: [] }, 'image'), /empty media key/i);

    await assert.rejects(
        () => downloadMediaMessage({ message: { imageMessage: { url: undefined } } }, 'buffer'),
        /not a media message/i
    );
    await assert.rejects(
        () => downloadMediaMessage({
            message: {
                imageMessage: {
                    directPath: '/v/t62.7118-24/no-key',
                    thumbnailDirectPath: '/v/thumb'
                }
            }
        }, 'buffer'),
        (err) => !String(err?.message || '').includes('not a media message')
    );
});

const hasSharp = await hasOptionalMedia('sharp').catch(() => false);
const sharp = hasSharp ? (await import('sharp')).default : undefined;

const rawImage = async ({ width, height, bands }) => {
    const channels = 3;
    const data = Buffer.alloc(width * height * channels);
    for (let y = 0; y < height; y++) {
        const band = bands[Math.min(bands.length - 1, Math.floor((y / height) * bands.length))];
        for (let x = 0; x < width; x++) {
            const index = (y * width + x) * channels;
            data[index] = band[0];
            data[index + 1] = band[1];
            data[index + 2] = band[2];
        }
    }
    return sharp(data, { raw: { width, height, channels } }).jpeg({ quality: 100 }).toBuffer();
};

const pixelAt = async (buffer, x, y) => {
    const { data, info } = await sharp(buffer).raw().toBuffer({ resolveWithObject: true });
    const index = (y * info.width + x) * info.channels;
    return [data[index], data[index + 1], data[index + 2]];
};

test('optimized status images never drop below the original resolution', { skip: !hasSharp }, async () => {
    const source = await rawImage({ width: 2000, height: 3000, bands: [[220, 30, 30], [30, 200, 30], [30, 30, 220]] });
    const original = await prepareStatusImage(source, { quality: 'original' });
    assert.equal(original.reencoded, false);
    assert.equal(original.media, source, 'the original bytes are uploaded untouched');
    assert.equal(original.width, 2000);
    assert.equal(original.height, 3000);

    const limited = await prepareStatusImage(source, { quality: 'high', maxBytes: Math.floor(source.length / 2) });
    assert.equal(limited.reencoded, true);
    assert.ok(limited.media.length < source.length);
    const meta = await sharp(limited.media).metadata();
    assert.equal(meta.width, 2000);
    assert.equal(meta.height, 3000);

    const preparedContent = await prepareStatusMedia({ image: source, caption: 'hello' }, { quality: 'original' });
    assert.equal(preparedContent.image, source);
    assert.equal(preparedContent.width, 2000);
    assert.equal(preparedContent.height, 3000);
});

test('status target resolution dedupes and normalizes jids', () => {
    assert.deepEqual(
        resolveStatusTargets(['94770000000:12@s.whatsapp.net', '94770000000@s.whatsapp.net']),
        ['94770000000@s.whatsapp.net']
    );
    assert.deepEqual(resolveStatusTargets('94770000000@s.whatsapp.net'), ['94770000000@s.whatsapp.net']);
    assert.deepEqual(resolveStatusTargets('status@broadcast', { statusJidList: ['94770000000@s.whatsapp.net'] }), ['94770000000@s.whatsapp.net']);
    assert.deepEqual(resolveStatusTargets('status@broadcast'), []);
    assert.throws(() => resolveStatusTargets([42]), TypeError);
});

test('group targets are expanded to their participants', async () => {
    const sock = {
        async groupMetadata(jid) {
            if (jid === '120363000000000001@g.us') {
                return { participants: [{ id: '94770000001@s.whatsapp.net' }, { id: '94770000002@s.whatsapp.net' }] };
            }
            throw new Error('not found');
        },
        logger
    };
    const expanded = await expandStatusTargets(sock, ['94770000000@s.whatsapp.net', '120363000000000001@g.us', '120363000000000002@g.us']);
    assert.deepEqual(expanded, ['94770000000@s.whatsapp.net', '94770000001@s.whatsapp.net', '94770000002@s.whatsapp.net']);
});

test('sendStatus publishes to status@broadcast without touching original bytes', async () => {
    const calls = [];
    const sock = {
        async sendMessage(jid, content, options) {
            calls.push({ jid, content, options });
            return { key: { id: 'status-1' } };
        }
    };
    const sendStatus = makeStatusSender(sock);
    await sendStatus('status@broadcast', { text: 'hello' }, { statusJidList: ['94770000000@s.whatsapp.net'] });
    assert.equal(calls[0].jid, 'status@broadcast');
    assert.equal(calls[0].content.text, 'hello');
    assert.deepEqual(calls[0].options.statusJidList, ['94770000000@s.whatsapp.net']);

    const image = Buffer.from('original-image-bytes');
    await sendStatus(['94770000000@s.whatsapp.net'], { image, caption: 'hi' });
    assert.equal(calls[1].jid, 'status@broadcast');
    assert.equal(calls[1].content.image, image);
    assert.deepEqual(calls[1].options.statusJidList, ['94770000000@s.whatsapp.net']);

    await assert.rejects(() => sendStatus('status@broadcast', { text: 'x' }), error => error.output?.statusCode === 400);
    await assert.rejects(() => sendStatus('status@broadcast', null), error => error.output?.statusCode === 400);
});

test('sendStatus routes @newsletter targets to channel status', async () => {
    const calls = [];
    const sock = {
        async sendMessage() {
            throw new Error('a channel status must not be sent as a chat message');
        },
        async sendNewsletterStatus(jid, content, options) {
            calls.push({ jid, content, options });
            return { jid, messageId: 'm-1' };
        }
    };
    await makeStatusSender(sock)('120363000000000001@newsletter', { text: 'channel update' }, { quality: 'original' });
    assert.equal(calls[0].jid, '120363000000000001@newsletter');
    assert.equal(calls[0].content.text, 'channel update');

    await makeChannelStatusSender(sock)('120363000000000001@newsletter', { image: Buffer.from('x') });
    assert.equal(calls[1].content.image.toString(), 'x');

    await assert.rejects(() => makeChannelStatusSender(sock)('94770000000@s.whatsapp.net', { text: 'x' }), error => error.output?.statusCode === 400);
});

test('profile pictures keep a vertical frame when crop is disabled', { skip: !hasSharp }, async () => {
    const white = [245, 245, 245];
    const red = [200, 20, 20];
    const source = await rawImage({ width: 300, height: 600, bands: [white, red, red, red, red, white] });

    const cover = await generateProfilePicture(source, { width: 720, height: 720 });
    const coverMeta = await sharp(cover.img).metadata();
    assert.equal(cover.fit, 'cover');
    assert.equal(coverMeta.width, 720);
    assert.equal(coverMeta.height, 720);
    const coverTop = await pixelAt(cover.img, 360, 20);
    assert.ok(coverTop[0] > 150 && coverTop[1] < 90, `a square cover crops the white top marker away: ${coverTop}`);

    const contained = await generateProfilePicture(source, { width: 720, height: 720 }, { crop: false });
    const containedMeta = await sharp(contained.img).metadata();
    assert.equal(contained.fit, 'contain');
    assert.equal(containedMeta.width, 720);
    assert.equal(containedMeta.height, 720);
    const top = await pixelAt(contained.img, 360, 20);
    const middle = await pixelAt(contained.img, 360, 360);
    const bottom = await pixelAt(contained.img, 360, 700);
    assert.ok(top[0] > 200 && top[1] > 200 && top[2] > 200, `the top marker survives: ${top}`);
    assert.ok(middle[0] > 150 && middle[1] < 90, `the middle of the frame survives: ${middle}`);
    assert.ok(bottom[0] > 200 && bottom[1] > 200 && bottom[2] > 200, `the bottom marker survives: ${bottom}`);

    const raw = await generateProfilePicture(source, { fit: 'none' });
    const rawMeta = await sharp(raw.img).metadata();
    assert.equal(raw.fit, 'none');
    assert.equal(rawMeta.width, 300);
    assert.equal(rawMeta.height, 600);
});

test('temp media cleanup only removes stale files', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'zahan-guard-'));
    try {
        const stale = join(directory, 'image-stale-enc');
        const fresh = join(directory, 'image-fresh-enc');
        writeFileSync(stale, Buffer.alloc(2048));
        writeFileSync(fresh, Buffer.alloc(1024));
        const old = new Date(Date.now() - 10 * 60 * 1000);
        utimesSync(stale, old, old);

        const before = await getTempMediaUsage(directory);
        assert.equal(before.files, 2);
        assert.equal(before.bytes, 3072);
        const storage = await getStorageUsage(directory);
        assert.equal(storage.tempFiles, 2);
        assert.ok(storage.tempMb >= 0);

        const cleaned = await cleanupTempMedia({ directory, maxAgeMs: 60 * 1000, keepActiveMs: 0 });
        assert.equal(cleaned.removed, 1);
        assert.deepEqual(readdirSync(directory), ['image-fresh-enc']);

        const caches = { devices: new TTLCache({ stdTTL: 60 }), retries: new TTLCache({ stdTTL: 60 }) };
        caches.devices.set('a', 1);
        caches.retries.set('b', 2);
        const result = await trimMemory({ userDevicesCache: caches.devices, outboundResendCache: caches.retries }, {}, {
            directory,
            staleTempFileMs: 60 * 1000,
            gc: false
        });
        assert.deepEqual(result.clearedCaches.sort(), ['outboundResendCache', 'userDevicesCache']);
        assert.equal(caches.devices.size, 0);
        assert.equal(caches.retries.size, 0);
    }
    finally {
        rmSync(directory, { recursive: true, force: true });
    }
});

test('the in-memory store can cap messages per chat', () => {
    const directory = mkdtempSync(join(tmpdir(), 'zahan-store-'));
    try {
        const store = makeInMemoryStore({ logger, maxMessagesPerChat: 2 });
        const handlers = new Map();
        store.bind({
            on(event, handler) {
                handlers.set(event, handler);
            },
            emit() {}
        });
        const chat = '94770000000@s.whatsapp.net';
        const messages = [1, 2, 3, 4].map(index => ({
            key: { remoteJid: chat, id: `m-${index}`, fromMe: false },
            message: { conversation: `message ${index}` },
            messageTimestamp: index
        }));
        handlers.get('messages.upsert')({ messages, type: 'notify' });
        assert.equal(store.messages[chat].array.length, 2);
        assert.deepEqual(store.messages[chat].array.map(message => message.key.id), ['m-3', 'm-4']);
    }
    finally {
        rmSync(directory, { recursive: true, force: true });
    }
});

test('the temp media directory is dedicated and configurable', () => {
    const previous = process.env.ZAHAN_TMP_DIR;
    process.env.ZAHAN_TMP_DIR = join(tmpdir(), 'zahan-custom-tmp');
    assert.equal(getTempMediaDirectory(), join(tmpdir(), 'zahan-custom-tmp'));
    if (previous === undefined) {
        delete process.env.ZAHAN_TMP_DIR;
    }
    else {
        process.env.ZAHAN_TMP_DIR = previous;
    }
    assert.ok(getTempMediaDirectory().endsWith('zahan-baileys'));
});

test('the resource guard exposes socket helpers and can be turned off', async () => {
    assert.equal(DEFAULT_CONNECTION_CONFIG.viewOnceRetrieval, true);
    assert.equal(DEFAULT_CONNECTION_CONFIG.resourceGuard, true);
    assert.equal(DEFAULT_CONNECTION_CONFIG.syncFullHistory, false);

    const directory = mkdtempSync(join(tmpdir(), 'zahan-guard-sock-'));
    const endHandlers = [];
    try {
        const sock = {
            userDevicesCache: new TTLCache({ stdTTL: 60 }),
            registerSocketEndHandler(handler) {
                endHandlers.push(handler);
            }
        };
        const guard = bindResourceGuard(sock, {
            logger,
            resourceGuard: { enabled: true, intervalMs: 0, staleTempFileMs: 60 * 1000, directory }
        });
        assert.equal(typeof sock.getResourceUsage, 'function');
        assert.equal(typeof sock.trimMemory, 'function');
        const usage = await sock.getResourceUsage();
        assert.ok(usage.memory.rssMb > 0);
        assert.equal(usage.storage.tempDir, directory);
        const trimmed = await sock.trimMemory({ gc: false });
        assert.deepEqual(trimmed.clearedCaches, ['userDevicesCache']);
        assert.equal(endHandlers.length, 1);
        guard.stop();

        const disabled = bindResourceGuard({}, { logger, resourceGuard: false });
        assert.equal(typeof disabled.stop, 'function');
    }
    finally {
        rmSync(directory, { recursive: true, force: true });
    }
});
