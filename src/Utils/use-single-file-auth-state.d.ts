/* Zahan Baileys maintained distribution. Upstream notices and license are preserved in LICENSE and NOTICE.md. */
import type { AuthVault, AuthVaultKdfOptions, AuthVaultSecret } from './auth-vault.js';
export interface SingleFileAuthStateOptions {
    vault?: AuthVault;
    secret?: AuthVaultSecret;
    passphrase?: string;
    allowPlaintext?: boolean;
    requireVault?: boolean;
    kdf?: AuthVaultKdfOptions;
    salt?: string | Buffer | Uint8Array;
    flushTimeoutMs?: number;
}
export function useSingleFileAuthState(fileName: string, options?: SingleFileAuthStateOptions): Promise<{
    state: {
        creds: any;
        keys: {
            get: (type: any, ids: any) => {};
            set: (data: any) => void;
        };
    };
    saveCreds: () => void;
    vault: AuthVault | null;
}>;
