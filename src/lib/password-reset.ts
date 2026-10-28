import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, count, eq, gt, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { hashPassword } from "./auth";
import { escapeHtml } from "./job-posting";
import { sendEmail } from "./email";
import { siteUrl } from "./site";

const { passwordResetTokens, users } = schema;

export const RESET_LINK_MINUTES = 60;
const MAX_REQUESTS_PER_HOUR = 3;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/**
 * Emails a reset link if an account exists for this address. Says nothing either way,
 * so the form can't be used to find out who has an account.
 */
export async function requestPasswordReset(rawEmail: string): Promise<void> {
  const email = rawEmail.trim().toLowerCase();
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) return;

  // Cap how many links one account can be sent, so the form can't be used to spam someone.
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const [{ recent }] = await db
    .select({ recent: count() })
    .from(passwordResetTokens)
    .where(and(eq(passwordResetTokens.userId, user.id), gt(passwordResetTokens.createdAt, since)));
  if (recent >= MAX_REQUESTS_PER_HOUR) return;

  const token = randomBytes(32).toString("base64url");
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + RESET_LINK_MINUTES * 60 * 1000),
  });

  const link = `${siteUrl()}/reset-password?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: "Reset your Shortlist password",
    text: [
      "Someone asked to reset the password for your Shortlist account.",
      "",
      `Choose a new password here (the link works once, for ${RESET_LINK_MINUTES} minutes):`,
      link,
      "",
      "If this wasn't you, ignore this email. Your password won't change.",
    ].join("\n"),
    html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#171717;max-width:480px">
<p>Someone asked to reset the password for your Shortlist account.</p>
<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#171717;color:#ffffff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:bold">Choose a new password</a></p>
<p style="color:#6b6b6b;font-size:13px">The link works once, for ${RESET_LINK_MINUTES} minutes. If this wasn't you, ignore this email. Your password won't change.</p>
</div>`,
  });
}

/** The token's row, if it exists, hasn't been used and hasn't expired. */
export async function findValidResetToken(token: string) {
  if (!token || token.length > 100) return null;
  const row = await db.query.passwordResetTokens.findFirst({
    where: and(
      eq(passwordResetTokens.tokenHash, hashToken(token)),
      isNull(passwordResetTokens.usedAt),
      gt(passwordResetTokens.expiresAt, new Date()),
    ),
  });
  return row ?? null;
}

/**
 * Sets the new password, uses up the link, cancels any other links, and signs the
 * account out everywhere. Returns the user so the caller can start a fresh session.
 */
export async function resetPassword(token: string, newPassword: string) {
  const row = await findValidResetToken(token);
  if (!row) return null;

  // Claim the token first, so the same link can't be used twice at once.
  const claimed = await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResetTokens.id, row.id), isNull(passwordResetTokens.usedAt)))
    .returning({ id: passwordResetTokens.id });
  if (claimed.length === 0) return null;

  const [user] = await db
    .update(users)
    .set({ passwordHash: await hashPassword(newPassword), passwordChangedAt: new Date() })
    .where(eq(users.id, row.userId))
    .returning();
  await db
    .delete(passwordResetTokens)
    .where(and(eq(passwordResetTokens.userId, row.userId), isNull(passwordResetTokens.usedAt)));
  return user ?? null;
}
