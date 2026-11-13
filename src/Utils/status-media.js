/* Zahan Baileys maintained distribution. Upstream notices and license are preserved in LICENSE and NOTICE.md. */
import { Boom } from '@hapi/boom';
import { getImageDimensions, getImageProcessingLibrary, readMediaBuffer } from './messages-media.js';

export const STATUS_QUALITIES = Object.freeze(['original', 'high', 'medium']);
export const STATUS_IMAGE_MAX_QUALITY = 95;
export const STATUS_IMAGE_MIN_QUALITY = 45;

const resolveQuality = (quality) => {
    if (quality === undefined || quality === null) {
        return { mode: 'original' };
    }
    if (typeof quality === 'number') {
        if (!Number.isFinite(quality) || quality < 1 || quality > 100) {
            throw new Boom('Status quality as a number must be between 1 and 100', { statusCode: 400 });
        }
        return { mode: 'encode', jpegQuality: Math.round(quality) };
    }
    const value = String(quality).toLowerCase();
    if (value === 'original') {
        return { mode: 'original' };
    }
    if (value === 'high') {
        return { mode: 'encode', jpegQuality: STATUS_IMAGE_MAX_QUALITY };
    }
    if (value === 'medium') {
        return { mode: 'encode', jpegQuality: 80 };
    }
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 100) {
        return { mode: 'encode', jpegQuality: Math.round(parsed) };
    }
    throw new Boom(`Unsupported status quality: ${quality}. Use original, high, medium, or a number from 1 to 100`, { statusCode: 400 });
};

const encodeJpeg = async (buffer, { quality, maxEdge }) => {
    const lib = await getImageProcessingLibrary();
    if ('sharp' in lib && lib.sharp?.default) {
        let pipeline = lib.sharp.default(buffer).rotate();
        if (maxEdge && maxEdge > 0) {
            pipeline = pipeline.resize({ width: maxEdge, height: maxEdge, fit: 'inside', withoutEnlargement: true });
        }
        return pipeline.jpeg({ quality, chromaSubsampling: quality >= 90 ? '4:4:4' : '4:2:0' }).toBuffer();
    }
    if ('image' in lib && lib.image?.Transformer) {
        const transformer = new lib.image.Transformer(buffer);
        if (maxEdge && maxEdge > 0) {
            return transformer.resize(maxEdge, maxEdge, 1).jpeg(quality);
        }
        return transformer.jpeg(quality);
    }
    if ('jimp' in lib && lib.jimp?.Jimp) {
        const jimpLib = lib.jimp;
        let jimp = await jimpLib.Jimp.read(buffer);
        if (maxEdge && maxEdge > 0 && Math.max(jimp.width, jimp.height) > maxEdge) {
            const scale = maxEdge / Math.max(jimp.width, jimp.height);
            jimp = jimp.resize({ w: Math.round(jimp.width * scale), h: Math.round(jimp.height * scale), mode: jimpLib.ResizeStrategy.BILINEAR });
        }
        return jimp.getBuffer('image/jpeg', { quality });
    }
    throw new Boom('Status re-encoding needs an image processing library. Install sharp with: npm i sharp', { statusCode: 400 });
};

const compressUnderLimit = async (buffer, { jpegQuality, maxBytes, maxEdge }) => {
    let quality = jpegQuality;
    let output = await encodeJpeg(buffer, { quality, maxEdge });
    while (output.length > maxBytes && quality > STATUS_IMAGE_MIN_QUALITY) {
        quality = quality <= 60 ? STATUS_IMAGE_MIN_QUALITY : Math.max(STATUS_IMAGE_MIN_QUALITY, quality - 10);
        output = await encodeJpeg(buffer, { quality, maxEdge });
    }
    return { buffer: output, quality };
};

export const prepareStatusImage = async (media, options = {}) => {
    const { maxBytes, maxEdge = 0, quality, forceReencode = false } = options;
    const requested = resolveQuality(quality);
    if (requested.mode === 'original') {
        const dimensions = Buffer.isBuffer(media) || media instanceof Uint8Array
            ? await getImageDimensions(media).catch(() => undefined)
            : undefined;
        return {
            media,
            buffer: Buffer.isBuffer(media) ? media : undefined,
            ...(dimensions || {}),
            reencoded: false,
            quality: 'original'
        };
    }
    const buffer = await readMediaBuffer(media);
    const dimensions = await getImageDimensions(buffer).catch(() => undefined);
    const overBytes = !!maxBytes && buffer.length > maxBytes;
    const overEdge = !!maxEdge && !!dimensions && Math.max(dimensions.width, dimensions.height) > maxEdge;
    if (!overBytes && !overEdge && !forceReencode) {
        return {
            media: buffer,
            buffer,
            ...(dimensions || {}),
            reencoded: false,
            quality: 'original'
        };
    }
    const { buffer: encoded, quality: applied } = await compressUnderLimit(buffer, {
        jpegQuality: requested.jpegQuality,
        maxBytes: maxBytes ?? Number.POSITIVE_INFINITY,
        maxEdge
    });
    const encodedDimensions = await getImageDimensions(encoded).catch(() => dimensions);
    return {
        media: encoded,
        buffer: encoded,
        ...(encodedDimensions || {}),
        reencoded: true,
        quality: applied
    };
};

export const prepareStatusMedia = async (content, options = {}) => {
    if (!content || typeof content !== 'object') {
        return content;
    }
    const { quality, maxBytes, maxEdge } = options;
    if (content.image) {
        const prepared = await prepareStatusImage(content.image, { quality, maxBytes, maxEdge });
        const next = { ...content, image: prepared.media };
        if (prepared.width && prepared.height) {
            next.width = content.width ?? prepared.width;
            next.height = content.height ?? prepared.height;
        }
        if (prepared.reencoded) {
            next.mimetype = 'image/jpeg';
        }
        return next;
    }
    if (content.video) {
        if (maxBytes) {
            const declared = Number(content.video?.fileLength ?? content.fileLength);
            if (Number.isFinite(declared) && declared > maxBytes) {
                throw new Boom(`Status video is ${declared} bytes, over the ${maxBytes} byte limit`, { statusCode: 400 });
            }
        }
        return content;
    }
    return content;
};
