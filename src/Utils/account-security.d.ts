/* Zahan Baileys maintained distribution. Upstream notices and license are preserved in LICENSE and NOTICE.md. */
import type { AuthVault } from './auth-vault.js';
export const SecuritySeverity: {
    readonly critical: 'critical';
    readonly high: 'high';
    readonly medium: 'medium';
    readonly low: 'low';
    readonly info: 'info';
};
export type SecuritySeverityValue = 'critical' | 'high' | 'medium' | 'low' | 'info';
export interface AccountSecurityFinding {
    id: string;
    severity: SecuritySeverityValue;
    title: string;
    detail: string;
    fix: string | null;
}
export interface AccountSecurityReport {
    generatedAt: string;
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    safe: boolean;
    vault: {
        enabled: boolean;
        algorithm?: string;
        fingerprint?: string;
        shortFingerprint?: string;
    };
    counts: Record<SecuritySeverityValue, number>;
    findings: AccountSecurityFinding[];
    scanned: {
        sessionPath: string | null;
        files: number;
        preKeyCount: number | null;
    };
}
export interface AccountSecurityAuditOptions {
    authState?: {
        creds?: any;
        keys?: any;
    };
    vault?: AuthVault | null;
    sessionPath?: string;
    preKeyCount?: number;
    now?: number;
}
export class AccountSecurityError extends Error {
    code: 'ACCOUNT_SECURITY_UNSAFE';
    report: AccountSecurityReport;
}
export function auditAccountSecurity(options?: AccountSecurityAuditOptions): Promise<AccountSecurityReport>;
export function assertAccountSecurity(options?: AccountSecurityAuditOptions | AccountSecurityReport): Promise<AccountSecurityReport>;
export function formatAccountSecurityReport(report: AccountSecurityReport): string;
export function restrictSessionPermissions(sessionPath: string, options?: {
    fileMode?: number;
    directoryMode?: number;
}): Promise<{
    path: string;
    updated: number;
    directory?: boolean;
    skipped?: boolean;
    reason?: string;
}>;
