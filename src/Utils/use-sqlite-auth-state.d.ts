/* Zahan Baileys maintained distribution. Upstream notices and license are preserved in LICENSE and NOTICE.md. */
import type { AuthVault, AuthVaultKdfOptions, AuthVaultSecret } from './auth-vault.js';
export interface SqliteAuthStateOptions {
    database?: any;
    dbPath?: string;
    vault?: AuthVault;
    secret?: AuthVaultSecret;
    passphrase?: string;
    allowPlaintext?: boolean;
    requireVault?: boolean;
    kdf?: AuthVaultKdfOptions;
    salt?: string | Buffer | Uint8Array;
}
export function useSqliteAuthState(opts?: SqliteAuthStateOptions): Promise<{
    state: {
        creds: any;
        keys: {
            get: (type: any, ids: any) => Promise<{}>;
            set: (data: any) => Promise<void>;
        };
    };
    saveCreds: () => Promise<void>;
    clearAuth: () => Promise<void>;
    close: () => Promise<void>;
    vault: AuthVault | null;
}>;
