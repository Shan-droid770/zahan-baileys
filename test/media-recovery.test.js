import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Boom } from '@hapi/boom';
import { downloadMediaMessage, isReuploadRequiredError, mediaErrorStatus, withAiLabel } from '../src/Utils/messages.js';
import { openViewOnceMedia } from '../src/Utils/view-once.js';

const jid = '94770000000@s.whatsapp.net';
const logger = { debug() {}, info() {}, warn() {}, error() {}, trace() {} };

const mediaMessage = (url = 'https://mmg.whatsapp.net/d/fake') => ({
    key: { remoteJid: jid, id: 'MEDIA-1' },
    message: {
        imageMessage: {
            url,
            directPath: '/d/fake',
            mediaKey: Buffer.alloc(32, 1),
            fileLength: 128,
            mimetype: 'image/jpeg'
        }
    }
});

const withFetch = async (handler, work) => {
    const original = globalThis.fetch;
    globalThis.fetch = handler;
    try {
        return await work();
    }
    finally {
        globalThis.fetch = original;
    }
};

test('an expired media response is recognised however the status is carried', () => {
    assert.equal(isReuploadRequiredError(new Boom('gone', { statusCode: 410 })), true);
    assert.equal(isReuploadRequiredError(new Boom('gone', { statusCode: 404 })), true);
    assert.equal(isReuploadRequiredError({ status: 404 }), true);
    assert.equal(isReuploadRequiredError({ statusCode: 410 }), true);
    assert.equal(isReuploadRequiredError({ output: { statusCode: 404 } }), true);
    assert.equal(isReuploadRequiredError(new Boom('bad request', { statusCode: 400 })), false);
    assert.equal(isReuploadRequiredError(new Error('network down')), false);
    assert.equal(isReuploadRequiredError(undefined), false);
    assert.equal(mediaErrorStatus(new Boom('gone', { statusCode: 404 })), 404);
    assert.equal(mediaErrorStatus(new Error('network down')), undefined);
});

test('a 404 on an expired media URL triggers one re-upload and a second download', async () => {
    const urls = [];
    let reuploads = 0;
    const response = await withFetch(async (url) => {
        urls.push(String(url));
        return urls.length === 1
            ? { ok: false, status: 404 }
            : { ok: false, status: 500 };
    }, async () => {
        try {
            await downloadMediaMessage(mediaMessage(), 'buffer', {}, {
                logger,
                reuploadRequest: async (message) => {
                    reuploads += 1;
                    return {
                        ...message,
                        message: {
                            imageMessage: {
                                ...message.message.imageMessage,
                                url: 'https://mmg.whatsapp.net/d/reuploaded',
                                directPath: '/d/reuploaded'
                            }
                        }
                    };
                }
            });
            return undefined;
        }
        catch (error) {
            return error;
        }
    });

    assert.equal(reuploads, 1, 'the expired media should be re-uploaded exactly once');
    assert.equal(urls.length, 2, 'the media should be fetched again after the re-upload');
    assert.match(urls[1], /reuploaded/);
    assert.equal(response.output.statusCode, 500, 'the second failure surfaces instead of the original 404');
});

test('a non-recoverable status is not retried', async () => {
    let reuploads = 0;
    const error = await withFetch(async () => ({ ok: false, status: 403 }), async () => {
        try {
            await downloadMediaMessage(mediaMessage(), 'buffer', {}, {
                logger,
                reuploadRequest: async () => {
                    reuploads += 1;
                    return mediaMessage();
                }
            });
            return undefined;
        }
        catch (caught) {
            return caught;
        }
    });

    assert.equal(reuploads, 0);
    assert.equal(error.output.statusCode, 403);
});

test('a failed re-upload surfaces the device error', async () => {
    const error = await withFetch(async () => ({ ok: false, status: 404 }), async () => {
        try {
            await downloadMediaMessage(mediaMessage(), 'buffer', {}, {
                logger,
                reuploadRequest: async () => {
                    throw new Boom('Media re-upload failed by device (NOT_FOUND)', { statusCode: 404 });
                }
            });
            return undefined;
        }
        catch (caught) {
            return caught;
        }
    });

    assert.match(error.message, /re-upload failed by device/);
    assert.equal(error.output.statusCode, 404);
});

test('an empty re-upload response keeps the original download error', async () => {
    const error = await withFetch(async () => ({ ok: false, status: 410 }), async () => {
        try {
            await downloadMediaMessage(mediaMessage(), 'buffer', {}, {
                logger,
                reuploadRequest: async () => undefined
            });
            return undefined;
        }
        catch (caught) {
            return caught;
        }
    });

    assert.equal(error.output.statusCode, 410);
});

test('the view-once downloader forwards download options and the recovery hook', async () => {
    const calls = [];
    const download = async (message, type, options, ctx) => {
        calls.push({ message, type, options, ctx });
        return Buffer.from('media');
    };
    const wrapper = {
        key: { remoteJid: jid, id: 'VO-1' },
        message: { viewOnceMessageV2: { message: { imageMessage: { url: 'https://mmg.whatsapp.net/d/vo', mediaKey: Buffer.alloc(32, 2), fileLength: 5, mimetype: 'image/jpeg', viewOnce: true, caption: 'secret' } } } }
    };
    const sock = { updateMediaMessage: async (message) => message };

    const result = await openViewOnceMedia(wrapper, {
        sock,
        logger,
        mode: 'buffer',
        download,
        downloadOptions: { startByte: 16 }
    });
    assert.equal(result.buffer.toString(), 'media');
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].options, { startByte: 16 });
    assert.equal(typeof calls[0].ctx.reuploadRequest, 'function');

    await openViewOnceMedia(wrapper, { sock, logger, mode: 'buffer', download, recover: false });
    assert.equal(calls[1].ctx.reuploadRequest, undefined);
});

test('the AI label node is a biz bot stanza node', () => {
    const nodes = withAiLabel(jid, { messageContextInfo: {} }, [{ tag: 'meta', attrs: {} }]);
    assert.equal(nodes.length, 2);
    assert.deepEqual(nodes[1], { tag: 'bot', attrs: { biz_bot: '1' }, content: undefined });
    assert.throws(() => withAiLabel('123456789-987654@g.us', {}, []), (error) => error.output?.statusCode === 400);
});
