/**
 * Signed one-click unsubscribe links, so people can turn off an email without logging in.
 * The signature ties the link to one account and one kind of email.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { authSecret } from "./secret";

export const EMAIL_KINDS = ["alerts", "updates", "invites"] as const;
export type EmailKind = (typeof EMAIL_KINDS)[number];

export const EMAIL_KIND_LABELS: Record<EmailKind, string> = {
  alerts: "job alert emails",
  updates: "application update emails",
  invites: "invitations from employers (this also takes you out of the talent pool)",
};

export function unsubscribeSignature(userId: string, kind: EmailKind, secret = authSecret()): string {
  return createHmac("sha256", secret).update(`unsubscribe:${userId}:${kind}`).digest("base64url").slice(0, 32);
}

export function unsubscribeQuery(userId: string, kind: EmailKind, secret?: string): string {
  return new URLSearchParams({ u: userId, k: kind, t: unsubscribeSignature(userId, kind, secret) }).toString();
}

export function unsubscribeUrl(baseUrl: string, userId: string, kind: EmailKind): string {
  return `${baseUrl}/unsubscribe?${unsubscribeQuery(userId, kind)}`;
}

/** The account and email kind a link is for, or null if it's been tampered with. */
export function verifyUnsubscribe(
  params: { u?: string | null; k?: string | null; t?: string | null },
  secret?: string,
): { userId: string; kind: EmailKind } | null {
  const { u, k, t } = params;
  if (!u || !k || !t || !(EMAIL_KINDS as readonly string[]).includes(k)) return null;
  const expected = Buffer.from(unsubscribeSignature(u, k as EmailKind, secret));
  const given = Buffer.from(t);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return { userId: u, kind: k as EmailKind };
}
