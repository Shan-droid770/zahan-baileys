/* Zahan Baileys maintained distribution. Upstream notices and license are preserved in LICENSE and NOTICE.md. */
import { chmod, readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';

export const SecuritySeverity = Object.freeze({
    critical: 'critical',
    high: 'high',
    medium: 'medium',
    low: 'low',
    info: 'info'
});

const SEVERITY_WEIGHT = { critical: 40, high: 20, medium: 8, low: 3, info: 0 };
const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'];
const PLAINTEXT_MARKERS = ['"noiseKey"', '"signedIdentityKey"', '"identityKey"', '"advSecretKey"'];
const MAX_SCANNED_FILES = 300;

export class AccountSecurityError extends Error {
    constructor(report) {
        const blockers = report.findings
            .filter((finding) => finding.severity === SecuritySeverity.critical || finding.severity === SecuritySeverity.high)
            .map((finding) => finding.id);
        super(`the WhatsApp session is not safely stored: ${blockers.join(', ')}`);
        this.name = 'AccountSecurityError';
        this.code = 'ACCOUNT_SECURITY_UNSAFE';
        this.report = report;
    }
}

const gradeFor = (score) => {
    if (score >= 90) {
        return 'A';
    }
    if (score >= 75) {
        return 'B';
    }
    if (score >= 60) {
        return 'C';
    }
    if (score >= 40) {
        return 'D';
    }
    return 'F';
};

const listSessionFiles = async (folder) => {
    const names = await readdir(folder);
    return names.filter((name) => name.endsWith('.json'));
};

const inspectPermissions = async (path, add) => {
    if (process.platform === 'win32') {
        return;
    }
    const info = await stat(path);
    const mode = info.mode & 0o777;
    if ((mode & 0o077) !== 0) {
        add(SecuritySeverity.high, 'session-permissions', 'The session is readable by other users on this machine', `${path} is mode 0${mode.toString(8)}; every account that can read it can clone the WhatsApp session.`, `await restrictSessionPermissions(${JSON.stringify(path)})`);
    }
};

const scanForPlaintext = async (folder, files, add) => {
    let scanned = 0;
    for (const name of files.slice(0, MAX_SCANNED_FILES)) {
        const path = join(folder, name);
        const raw = await readFile(path, 'utf-8').catch(() => null);
        if (raw === null) {
            continue;
        }
        scanned += 1;
        if (PLAINTEXT_MARKERS.some((marker) => raw.includes(marker))) {
            add(SecuritySeverity.critical, 'session-plaintext', 'A session record is stored in plaintext', `${path} contains Signal keys that anyone with file or database access can use to impersonate the account.`, `const vault = await createAuthVault({ secret: process.env.SESSION_SECRET }); await migrateMultiFileSession(folder, { vault })`);
            return scanned;
        }
    }
    return scanned;
};

export const auditAccountSecurity = async (options = {}) => {
    const findings = [];
    const add = (severity, id, title, detail, fix = null) => findings.push({ id, severity, title, detail, fix });
    const { authState, vault, sessionPath, preKeyCount, now = Date.now() } = options;
    const creds = authState?.creds ?? null;
    let scannedFiles = 0;

    if (vault) {
        add(SecuritySeverity.info, 'session-vault', 'The session is sealed with an authenticated vault', `Records are encrypted with ${vault.algorithm} under key fingerprint ${vault.fingerprint.slice(0, 16)}.`);
    }
    else {
        add(SecuritySeverity.high, 'session-vault-missing', 'The session is stored without encryption', 'Credentials and Signal keys are written as readable JSON, so a stolen file or database row is a hijacked WhatsApp account.', 'const vault = await createAuthVault({ secret: process.env.SESSION_SECRET }); await useMultiFileAuthState(folder, { vault })');
    }

    if (creds) {
        const hasKeys = Boolean(creds.noiseKey?.private && creds.signedIdentityKey?.private && creds.signedPreKey?.keyPair?.private && creds.advSecretKey);
        if (!hasKeys) {
            add(SecuritySeverity.critical, 'creds-keys-missing', 'The credentials are incomplete', 'A session without a noise key, a signed identity key, a signed pre-key, and an adv secret cannot authenticate; pair again instead of copying a partial session.');
        }
        if (creds.registered && !creds.me?.id) {
            add(SecuritySeverity.high, 'creds-me-missing', 'The account identifier is missing', 'The session claims to be registered but has no `creds.me.id`; messages will be attributed to the wrong account.');
        }
        if (!creds.registered) {
            add(SecuritySeverity.info, 'session-not-paired', 'The session is not paired yet', 'This is expected before the first QR scan or pairing code.');
        }
        if (creds.pairingCode && creds.me?.name === '~') {
            add(SecuritySeverity.high, 'pairing-incomplete', 'A pairing code was requested but never finished', 'The stored `creds.me` is the placeholder written when a pairing code is requested; pairing again or removing the session avoids logging in as the wrong account.');
        }
    }

    if (typeof preKeyCount === 'number' && preKeyCount < 5) {
        add(SecuritySeverity.medium, 'prekey-low', 'Few Signal pre-keys remain', `Only ${preKeyCount} pre-key(s) are stored; a new device may not find one to start a session, which delays first messages.`, 'Let the socket run through one connection cycle, or upload a fresh batch with the pre-key helpers.');
    }

    if (sessionPath) {
        const info = await stat(sessionPath).catch(() => null);
        if (!info) {
            add(SecuritySeverity.medium, 'session-path-missing', 'The session path does not exist', `Nothing was found at ${sessionPath}; pass the folder or file the auth state actually writes to.`);
        }
        else if (info.isDirectory()) {
            await inspectPermissions(sessionPath, add);
            const files = await listSessionFiles(sessionPath);
            scannedFiles = await scanForPlaintext(sessionPath, files, add);
            const loose = [];
            for (const name of files.slice(0, MAX_SCANNED_FILES)) {
                if (process.platform === 'win32') {
                    break;
                }
                const fileInfo = await stat(join(sessionPath, name)).catch(() => null);
                if (fileInfo && (fileInfo.mode & 0o077) !== 0) {
                    loose.push(name);
                }
            }
            if (loose.length) {
                add(SecuritySeverity.high, 'session-file-permissions', 'Session files are readable by other users', `${loose.length} file(s) under ${sessionPath} are group- or world-readable, for example ${loose.slice(0, 3).join(', ')}.`, `await restrictSessionPermissions(${JSON.stringify(sessionPath)})`);
            }
        }
        else {
            await inspectPermissions(sessionPath, add);
            const raw = await readFile(sessionPath, 'utf-8').catch(() => null);
            if (raw !== null) {
                scannedFiles = 1;
                const sealed = raw.startsWith('zvault1.');
                if (!sealed && PLAINTEXT_MARKERS.some((marker) => raw.includes(marker))) {
                    add(SecuritySeverity.critical, 'session-plaintext', 'The session file is stored in plaintext', `${sessionPath} contains Signal keys that anyone who can read the file can use to impersonate the account.`, `const vault = await createAuthVault({ secret: process.env.SESSION_SECRET }); await useSingleFileAuthState(sessionPath, { vault })`);
                }
            }
        }
    }

    const penalty = findings.reduce((total, finding) => total + SEVERITY_WEIGHT[finding.severity], 0);
    const score = Math.max(0, 100 - penalty);
    const counts = Object.fromEntries(SEVERITY_ORDER.map((severity) => [severity, findings.filter((finding) => finding.severity === severity).length]));
    const safe = counts.critical === 0 && counts.high === 0;

    return {
        generatedAt: new Date(now).toISOString(),
        score,
        grade: gradeFor(score),
        safe,
        vault: vault
            ? { enabled: true, algorithm: vault.algorithm, fingerprint: vault.fingerprint, shortFingerprint: vault.shortFingerprint }
            : { enabled: false },
        counts,
        findings: findings.sort((left, right) => SEVERITY_ORDER.indexOf(left.severity) - SEVERITY_ORDER.indexOf(right.severity)),
        scanned: { sessionPath: sessionPath ?? null, files: scannedFiles, preKeyCount: typeof preKeyCount === 'number' ? preKeyCount : null }
    };
};

export const assertAccountSecurity = async (options = {}) => {
    const report = Array.isArray(options.findings) ? options : await auditAccountSecurity(options);
    if (!report.safe) {
        throw new AccountSecurityError(report);
    }
    return report;
};

export const formatAccountSecurityReport = (report) => {
    const verdict = report.safe ? 'SAFE' : 'ACTION REQUIRED';
    const lines = [`Account security: grade ${report.grade} (score ${report.score}/100) - ${verdict}`];
    for (const finding of report.findings) {
        lines.push(`  [${finding.severity}] ${finding.id}: ${finding.title}`);
        if (finding.detail) {
            lines.push(`    ${finding.detail}`);
        }
        if (finding.fix) {
            lines.push(`    fix: ${finding.fix}`);
        }
    }
    return lines.join('\n');
};

export const restrictSessionPermissions = async (sessionPath, options = {}) => {
    if (process.platform === 'win32') {
        return { path: sessionPath, updated: 0, skipped: true, reason: 'POSIX file modes are not available on Windows' };
    }
    const fileMode = options.fileMode ?? 0o600;
    const directoryMode = options.directoryMode ?? 0o700;
    const info = await stat(sessionPath);
    if (info.isDirectory()) {
        await chmod(sessionPath, directoryMode);
        const names = await readdir(sessionPath);
        let updated = 0;
        for (const name of names) {
            const entry = await stat(join(sessionPath, name)).catch(() => null);
            if (entry?.isFile()) {
                await chmod(join(sessionPath, name), fileMode);
                updated += 1;
            }
        }
        return { path: sessionPath, updated, directory: true };
    }
    await chmod(sessionPath, fileMode);
    return { path: sessionPath, updated: 1, directory: false };
};
