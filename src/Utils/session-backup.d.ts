/* Zahan Baileys maintained distribution. Upstream notices and license are preserved in LICENSE and NOTICE.md. */
export const SESSION_BACKUP_FORMAT: string;
export const SESSION_BACKUP_VERSION: number;
export const SESSION_BACKUP_PREFIX: string;
export const SESSION_BACKUP_RECORD: string;
export const DEFAULT_SESSION_KEY_TYPES: readonly string[];
export interface SessionBackupOptions {
    secret?: string | Buffer;
    passphrase?: string | Buffer;
    vault?: any;
    kdf?: any;
    salt?: Buffer | Uint8Array | string;
    allowWeakSecret?: boolean;
    types?: readonly string[];
    keyIds?: Record<string, string[]>;
}
export interface SessionBackupPayload {
    format: string;
    version: number;
    createdAt: string;
    creds: any;
    keys: Record<string, Record<string, any>>;
    missing: string[];
}
export function collectSessionKeys(authState: any, options?: SessionBackupOptions): Promise<{
    keys: Record<string, Record<string, any>>;
    missing: string[];
}>;
export function serializeSession(authState: any, options?: SessionBackupOptions): Promise<SessionBackupPayload>;
export function exportSession(authState: any, options?: SessionBackupOptions): Promise<string>;
export function importSession(blob: string, options?: SessionBackupOptions): Promise<SessionBackupPayload>;
export function restoreSession(authState: any, blob: string, options?: SessionBackupOptions & {
    replaceCreds?: boolean;
}): Promise<{
    creds: boolean;
    types: string[];
    keyCount: number;
    missing: string[];
}>;
export function sessionBackupFingerprint(blob: string): string | undefined;
