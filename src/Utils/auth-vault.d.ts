/* Zahan Baileys maintained distribution. Upstream notices and license are preserved in LICENSE and NOTICE.md. */
import type { AuthStore } from './auth-store.js';
export const AUTH_VAULT_PREFIX: string;
export const AUTH_VAULT_AAD_NAMESPACE: string;
export const AUTH_VAULT_MIN_SECRET_LENGTH: number;
export const AuthVaultErrorCode: {
    readonly invalidSecret: 'AUTH_VAULT_INVALID_SECRET';
    readonly invalidRecord: 'AUTH_VAULT_INVALID_RECORD';
    readonly damaged: 'AUTH_VAULT_DAMAGED';
    readonly plaintext: 'AUTH_VAULT_PLAINTEXT';
    readonly format: 'AUTH_VAULT_FORMAT';
};
export class AuthVaultError extends Error {
    code: string;
    record?: string;
    type?: string;
    id?: string;
    path?: string;
    cause?: unknown;
}
export interface AuthVaultKdfOptions {
    N?: number;
    r?: number;
    p?: number;
    maxmem?: number;
}
export type AuthVaultSecret = string | Buffer | Uint8Array;
export interface AuthVaultOptions {
    secret?: AuthVaultSecret;
    passphrase?: string;
    salt?: string | Buffer | Uint8Array;
    kdf?: AuthVaultKdfOptions;
    allowWeakSecret?: boolean;
    requireVault?: boolean;
    vault?: AuthVault;
}
export interface AuthVault {
    algorithm: string;
    prefix: string;
    fingerprint: string;
    shortFingerprint: string;
    readonly kdf: AuthVaultKdfOptions;
    isSealed: (value: unknown) => boolean;
    seal: (record: string, plaintext: string | Buffer | Uint8Array) => Promise<string>;
    open: (record: string, envelope: string) => Promise<string>;
    rotate: (nextSecret: AuthVaultSecret, options?: { kdf?: AuthVaultKdfOptions; allowWeakSecret?: boolean }) => Promise<AuthVault>;
}
export function isAuthVaultRecord(value: unknown): boolean;
export function createAuthVault(options?: AuthVaultOptions): Promise<AuthVault>;
export function resolveAuthVault(options?: AuthVaultOptions, factoryName?: string): Promise<AuthVault | null>;
export function vaultRecordName(type: string, id: string): string;
export function encryptAuthStore(store: AuthStore, vault: AuthVault, options?: {
    allowPlaintext?: boolean;
}): AuthStore;
export interface SessionMigrationResult {
    total: number;
    migrated: number;
    rotated: number;
    skipped: number;
    failed: {
        file: string;
        error: string;
    }[];
    fingerprint: string;
}
export function migrateMultiFileSession(folder: string, options?: AuthVaultOptions & {
    from?: AuthVault | null;
    allowPlaintext?: boolean;
}): Promise<SessionMigrationResult>;
