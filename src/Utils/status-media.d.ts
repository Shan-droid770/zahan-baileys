/* Zahan Baileys maintained distribution. Upstream notices and license are preserved in LICENSE and NOTICE.md. */
export const STATUS_QUALITIES: readonly string[];
export const STATUS_IMAGE_MAX_QUALITY: number;
export const STATUS_IMAGE_MIN_QUALITY: number;
export type StatusQuality = 'original' | 'high' | 'medium' | number;
export type StatusMediaOptions = {
    quality?: StatusQuality;
    maxBytes?: number;
    maxEdge?: number;
    forceReencode?: boolean;
};
export function prepareStatusImage(media: any, options?: StatusMediaOptions): Promise<{
    media: any;
    buffer: Buffer | undefined;
    width: number | undefined;
    height: number | undefined;
    reencoded: boolean;
    quality: string | number;
}>;
export function prepareStatusMedia(content: any, options?: StatusMediaOptions): Promise<any>;
