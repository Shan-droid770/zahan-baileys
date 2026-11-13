/* Zahan Baileys maintained distribution. Upstream notices and license are preserved in LICENSE and NOTICE.md. */
export const STATUS_BROADCAST_JID: "status@broadcast";
export type StatusSendOptions = {
    quality?: 'original' | 'high' | 'medium' | number;
    maxBytes?: number;
    maxEdge?: number;
    statusJidList?: string[];
} & Record<string, any>;
export function resolveStatusTargets(target: string | string[], options?: {
    statusJidList?: string[];
}): string[];
export function expandStatusTargets(sock: any, targets: string[]): Promise<string[]>;
export function makeStatusSender(sock: any): (target: string | string[], content: any, options?: StatusSendOptions) => Promise<any>;
export function makeChannelStatusSender(sock: any): (jid: string, content: any, options?: StatusSendOptions) => Promise<any>;
