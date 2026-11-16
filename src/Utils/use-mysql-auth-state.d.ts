/* Zahan Baileys maintained distribution. Upstream notices and license are preserved in LICENSE and NOTICE.md. */
export interface MySQLAuthStateOptions {
    pool?: any;
    uri?: string;
    config?: any;
    table?: string;
    session?: string;
    vault?: import('./auth-vault.js').AuthVault;
    secret?: import('./auth-vault.js').AuthVaultSecret;
    passphrase?: string;
    allowPlaintext?: boolean;
    requireVault?: boolean;
    kdf?: import('./auth-vault.js').AuthVaultKdfOptions;
    salt?: string | Buffer | Uint8Array;
}
export function useMySQLAuthState(opts?: MySQLAuthStateOptions): Promise<{
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
    vault: import('./auth-vault.js').AuthVault | null;
}>;
