"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { REPORTS_TO_HIDE, reportReasonLabel } from "@/lib/constants";
import { sendEmail } from "@/lib/email";
import { reportEmail } from "@/lib/emails";
import { getJob, openReportCount } from "@/lib/queries";
import { adminEmails, siteUrl } from "@/lib/site";
import type { FormState } from "./auth";

const reportSchema = z.object({
  reason: z.enum(schema.reportReasonEnum.enumValues, "Choose what's wrong with the job"),
  details: z.string().trim().max(1000, "Keep the details under 1 000 characters"),
});

export async function reportJob(_: FormState, form: FormData): Promise<FormState> {
  const jobId = String(form.get("jobId") ?? "");
  const session = await requireUser(`/jobs/${jobId}/report`);
  const row = await getJob(jobId);
  if (!row) return { error: "That job doesn't exist." };
  if (row.job.employerId === session.userId) return { error: "You can't report your own job." };
  const parsed = reportSchema.safeParse({ reason: form.get("reason"), details: form.get("details") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const inserted = await db
    .insert(schema.jobReports)
    .values({ jobId, reporterId: session.userId, ...parsed.data })
    .onConflictDoNothing()
    .returning({ id: schema.jobReports.id });

  if (inserted.length > 0) {
    // Enough different people reporting it hides the job until an admin looks at it.
    const open = await openReportCount(jobId);
    let hidden = !!row.job.hiddenAt;
    if (!hidden && open >= REPORTS_TO_HIDE) {
      const done = await db
        .update(schema.jobs)
        .set({ hiddenAt: new Date() })
        .where(and(eq(schema.jobs.id, jobId), isNull(schema.jobs.hiddenAt)))
        .returning({ id: schema.jobs.id });
      hidden = done.length > 0;
    }
    const admins = adminEmails();
    if (admins.length > 0) {
      const mail = reportEmail({
        jobTitle: row.job.title,
        company: row.employer.companyName,
        reason: reportReasonLabel(parsed.data.reason),
        details: parsed.data.details,
        openReports: open,
        hidden,
        reviewUrl: `${siteUrl()}/admin`,
        jobUrl: `${siteUrl()}/jobs/${jobId}`,
      });
      after(() =>
        Promise.all(admins.map((to) => sendEmail({ to, ...mail }))).catch((err) => console.error("Report email failed:", err)),
      );
    }
    revalidatePath("/", "layout");
  }
  redirect(`/jobs/${jobId}/report?done=1`);
}
