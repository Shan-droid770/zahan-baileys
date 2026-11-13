/* Zahan Baileys maintained distribution. Upstream notices and license are preserved in LICENSE and NOTICE.md. */
export const MEGABYTE: number;
export const RESOURCE_GUARD_DEFAULTS: Readonly<{
    enabled: boolean;
    intervalMs: number;
    staleTempFileMs: number;
    heapUsageRatio: number;
    cleanTempFiles: boolean;
    trimCaches: boolean;
}>;
export function getTempMediaDirectory(): string;
export function listTempMediaFiles(directory?: string): Promise<Array<{
    size: number;
    age: number;
    path: string;
}>>;
export function getTempMediaUsage(directory?: string): Promise<{
    directory: string;
    files: number;
    bytes: number;
}>;
export function cleanupTempMedia(options?: {
    directory?: string;
    maxAgeMs?: number;
    keepActiveMs?: number;
}): Promise<{
    directory: string;
    removed: number;
    bytes: number;
}>;
export function getStorageUsage(directory?: string): Promise<{
    tempDir: string;
    tempFiles: number;
    tempBytes: number;
    tempMb: number;
    freeBytes?: number;
    freeMb?: number;
    totalMb?: number;
}>;
export function getMemoryUsage(): {
    rssBytes: number;
    rssMb: number;
    heapTotalMb: number;
    heapUsedMb: number;
    externalMb: number;
    arrayBuffersMb: number;
    heapLimitMb: number;
    heapUsedRatio: number;
};
export function getCacheUsage(sock: any, config?: any): Record<string, number>;
export function trimSocketCaches(sock: any, config?: any): string[];
export function getResourceUsage(sock: any, config?: any, options?: any): Promise<{
    memory: ReturnType<typeof getMemoryUsage>;
    storage: Awaited<ReturnType<typeof getStorageUsage>>;
    caches: Record<string, number>;
    uptimeSeconds: number;
}>;
export function trimMemory(sock: any, config?: any, options?: any): Promise<{
    clearedCaches: string[];
    removedTempFiles: number;
    freedTempBytes: number;
    garbageCollected: boolean;
}>;
export function normalizeResourceGuardOptions(value?: boolean | object): any;
export function bindResourceGuard(sock: any, config?: any): {
    stop(): void;
    runNow(): Promise<any>;
};
