"use server";

import { after } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { getSession } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { jobSharedEmail } from "@/lib/emails";
import { isAcceptingApplications } from "@/lib/jobs";
import { displayName, getJob, sharesSentToday } from "@/lib/queries";
import { siteUrl } from "@/lib/site";
import { unsubscribeQuery } from "@/lib/unsubscribe";

export type ShareState = { error?: string; sentTo?: string; sentAt?: number } | undefined;

const SHARES_PER_DAY = 20;

/**
 * Sends a job to someone by email address. If they have an account it also shows on their
 * dashboard. The reply is the same either way, so this can't be used to find out who has an account.
 */
export async function shareJobWithUser(_: ShareState, form: FormData): Promise<ShareState> {
  const session = await getSession();
  if (!session) return { error: "Log in to send jobs to people." };
  const jobId = String(form.get("jobId") ?? "");
  const row = await getJob(jobId);
  if (!row || !isAcceptingApplications(row.job)) return { error: "This job isn't taking applications any more." };

  const email = z.email().safeParse(String(form.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { error: "Enter the email address of the person to send it to." };
  if (email.data === session.email) return { error: "That's your own address." };
  const note = String(form.get("note") ?? "").trim();
  if (note.length > 300) return { error: "Keep your note under 300 characters." };
  if ((await sharesSentToday(session.userId)) >= SHARES_PER_DAY) {
    return { error: `You can send ${SHARES_PER_DAY} jobs a day. Try again tomorrow, or use one of the other options below.` };
  }

  const recipient = await db.query.users.findFirst({ where: eq(schema.users.email, email.data) });
  await db.insert(schema.jobShares).values({
    jobId,
    senderId: session.userId,
    recipientEmail: email.data,
    recipientId: recipient?.id ?? null,
    note,
  });

  // Account holders who've turned off emails still see it on their dashboard.
  if (!recipient || recipient.emailUpdates) {
    const base = siteUrl();
    const q = recipient ? unsubscribeQuery(recipient.id, "updates") : null;
    const mail = jobSharedEmail({
      senderName: await displayName(session.userId),
      jobTitle: row.job.title,
      company: row.employer.companyName,
      note,
      jobUrl: `${base}/jobs/${jobId}`,
      signupUrl: recipient ? undefined : `${base}/signup?next=/jobs/${jobId}`,
      footer: q
        ? { settings: `${base}/settings`, unsubscribe: `${base}/unsubscribe?${q}`, reason: "You get these because you have a Shortlist account." }
        : undefined,
    });
    after(() =>
      sendEmail({ to: email.data, ...mail, ...(q ? { unsubscribeUrl: `${base}/api/unsubscribe?${q}` } : {}) }).catch((err) =>
        console.error("Share email failed:", err),
      ),
    );
  }
  return { sentTo: email.data, sentAt: Date.now() };
}
