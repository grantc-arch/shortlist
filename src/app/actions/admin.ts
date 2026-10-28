"use server";

import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSession } from "@/lib/auth";
import { isUuid } from "@/lib/queries";
import { isAdmin } from "@/lib/site";

async function requireAdmin() {
  const session = await getSession();
  if (!session || !isAdmin(session.email)) notFound();
  return session;
}

async function resolveReports(jobId: string) {
  await db
    .update(schema.jobReports)
    .set({ resolvedAt: new Date() })
    .where(and(eq(schema.jobReports.jobId, jobId), isNull(schema.jobReports.resolvedAt)));
}

/** The reports were wrong: show the job again. */
export async function restoreJob(form: FormData) {
  await requireAdmin();
  const jobId = String(form.get("jobId") ?? "");
  if (!isUuid(jobId)) return;
  await db.update(schema.jobs).set({ hiddenAt: null }).where(eq(schema.jobs.id, jobId));
  await resolveReports(jobId);
  revalidatePath("/", "layout");
}

/** The reports were right: keep the job hidden for good (an admin can still restore it later). */
export async function removeJob(form: FormData) {
  await requireAdmin();
  const jobId = String(form.get("jobId") ?? "");
  if (!isUuid(jobId)) return;
  await db
    .update(schema.jobs)
    .set({ hiddenAt: sql`coalesce(${schema.jobs.hiddenAt}, now())` })
    .where(eq(schema.jobs.id, jobId));
  await resolveReports(jobId);
  revalidatePath("/", "layout");
}
