"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, count, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/auth";
import { MAX_CV_BYTES } from "@/lib/constants";
import { parsePlace } from "@/lib/places";
import { parseList, QUALIFICATION_ORDER } from "@/lib/matching";
import { getApplication, getCandidate, getJob, isUuid } from "@/lib/queries";
import { profileGaps } from "@/lib/format";
import { isAcceptingApplications } from "@/lib/jobs";
import type { FormState } from "./auth";
import { PHONE_PATTERN, type CvSuggestions } from "@/lib/cv-extraction";
import { autofillEnabled, readCv } from "@/lib/cv-autofill";

/** Checks an uploaded CV is a PDF within the size limit. */
async function readPdfUpload(file: File): Promise<{ bytes: Buffer } | { error: string }> {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return { error: "Upload your CV as a PDF." };
  }
  if (file.size > MAX_CV_BYTES) return { error: "Your CV is over 2 MB. Export a smaller PDF and try again." };
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.subarray(0, 5).toString() !== "%PDF-") return { error: "That file isn't a valid PDF." };
  return { bytes };
}

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name"),
  phone: z
    .string()
    .trim()
    .regex(PHONE_PATTERN, "Enter a valid phone number, for example 082 123 4567"),
  willingToRelocate: z.boolean(),
  qualificationLevel: z.enum(QUALIFICATION_ORDER),
  fieldOfStudy: z.string().trim().max(120),
  yearsExperience: z.coerce.number().int().min(0).max(50),
  skills: z.array(z.string().max(60)).min(1, "Add at least one skill").max(30, "Keep it to your 30 strongest skills"),
  summary: z.string().trim().max(1200, "Keep your summary under 1 200 characters"),
  hasOwnTransport: z.boolean(),
  availableFrom: z.iso.date("Choose the date you can start"),
  consent: z.literal(true, "Tick the consent box so employers you apply to can see your details"),
});

export async function saveProfile(_: FormState, form: FormData): Promise<FormState> {
  const session = await requireRole("candidate");
  const parsed = profileSchema.safeParse({
    fullName: form.get("fullName"),
    phone: form.get("phone"),
    willingToRelocate: form.get("willingToRelocate") === "on",
    qualificationLevel: form.get("qualificationLevel"),
    fieldOfStudy: form.get("fieldOfStudy") ?? "",
    yearsExperience: form.get("yearsExperience"),
    skills: parseList(String(form.get("skills") ?? "")),
    summary: form.get("summary") ?? "",
    hasOwnTransport: form.get("hasOwnTransport") === "on",
    availableFrom: form.get("availableFrom"),
    consent: form.get("consent") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { consent: _consent, ...data } = parsed.data;
  const location = parsePlace(form, "city", "Enter where you're based");
  if ("error" in location) return { error: location.error };

  const existing = await getCandidate(session.userId);
  const cv = form.get("cv");
  let cvUpdate: { cvFileName: string; cvData: Buffer } | null = null;
  if (cv instanceof File && cv.size > 0) {
    const pdf = await readPdfUpload(cv);
    if ("error" in pdf) return pdf;
    cvUpdate = { cvFileName: cv.name.slice(0, 120), cvData: pdf.bytes };
  } else if (!existing?.cvFileName) {
    return { error: "Upload your CV as a PDF." };
  }

  await db
    .update(schema.candidates)
    .set({
      ...data,
      city: location.place.label,
      lat: location.place.lat,
      lng: location.place.lng,
      ...(cvUpdate ?? {}),
      popiaConsentAt: existing?.popiaConsentAt ?? new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.candidates.userId, session.userId));

  const next = String(form.get("next") ?? "");
  revalidatePath("/", "layout");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/candidate?saved=1");
}

export async function applyForJob(_: FormState, form: FormData): Promise<FormState> {
  const session = await requireRole("candidate");
  const jobId = String(form.get("jobId") ?? "");
  const row = await getJob(jobId);
  if (!row || !isAcceptingApplications(row.job)) return { error: "This job is no longer taking applications." };

  const candidate = await getCandidate(session.userId);
  const gaps = profileGaps(candidate);
  if (gaps.length > 0) return { error: `Add your ${gaps.join(", ")} to your profile before applying.` };
  if (await getApplication(jobId, session.userId)) redirect(`/jobs/${jobId}`);

  const answers = row.job.mustHaves.map((_, i) => form.get(`mustHave${i}`));
  if (answers.some((a) => a !== "yes" && a !== "no")) return { error: "Answer yes or no to every must-have." };

  const coverNote = String(form.get("coverNote") ?? "").trim();
  if (coverNote.length > 2000) return { error: "Keep your note under 2 000 characters." };

  await db.insert(schema.applications).values({
    jobId,
    candidateId: session.userId,
    mustHaveAnswers: answers.map((a) => a === "yes"),
    coverNote,
  });
  // It's in their applications now, so it no longer needs to be saved.
  await db
    .delete(schema.savedJobs)
    .where(and(eq(schema.savedJobs.userId, session.userId), eq(schema.savedJobs.jobId, jobId)));
  revalidatePath("/candidate");
  redirect(`/candidate?applied=${jobId}`);
}

export async function withdrawApplication(form: FormData) {
  const session = await requireRole("candidate");
  const id = String(form.get("applicationId") ?? "");
  if (!isUuid(id)) return;
  await db
    .delete(schema.applications)
    .where(
      and(
        eq(schema.applications.id, id),
        eq(schema.applications.candidateId, session.userId),
        // Once an employer has acted on an application it stays on their record.
        eq(schema.applications.status, "new"),
      ),
    );
  revalidatePath("/candidate");
}

/** Saves or un-saves a job for the signed-in candidate. */
export async function setJobSaved(jobId: string, saved: boolean): Promise<{ saved: boolean } | { error: string }> {
  const session = await requireRole("candidate", `/jobs/${jobId}`);
  if (!isUuid(jobId)) return { error: "That job doesn't exist." };
  const where = and(eq(schema.savedJobs.userId, session.userId), eq(schema.savedJobs.jobId, jobId));
  if (!saved) {
    await db.delete(schema.savedJobs).where(where);
  } else {
    const row = await getJob(jobId);
    if (!row || !isAcceptingApplications(row.job)) return { error: "This job is no longer taking applications." };
    await db.insert(schema.savedJobs).values({ userId: session.userId, jobId }).onConflictDoNothing();
  }
  // Refresh whichever page the button is on, so it keeps showing the new state.
  revalidatePath("/", "layout");
  return { saved };
}

const AUTOFILL_DAILY_LIMIT = 10;

export type AutofillResult = { ok: true; suggestions: CvSuggestions } | { ok: false; error: string };

/**
 * Reads an uploaded CV with Claude and returns suggested profile values.
 * Nothing is saved here: the candidate reviews the suggestions and saves the form themselves.
 */
export async function autofillFromCv(form: FormData): Promise<AutofillResult> {
  const session = await requireRole("candidate");
  if (!autofillEnabled()) return { ok: false, error: "CV auto-fill isn't switched on for this site." };

  const file = form.get("cv");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose your CV first." };
  const pdf = await readPdfUpload(file);
  if ("error" in pdf) return { ok: false, error: pdf.error };

  // Each read costs money, so cap it per person per day.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [{ used }] = await db
    .select({ used: count() })
    .from(schema.cvAutofillRuns)
    .where(and(eq(schema.cvAutofillRuns.userId, session.userId), gt(schema.cvAutofillRuns.createdAt, since)));
  if (used >= AUTOFILL_DAILY_LIMIT) {
    return { ok: false, error: "You've used CV auto-fill the maximum number of times today. Fill in the rest by hand, or try again tomorrow." };
  }
  await db.insert(schema.cvAutofillRuns).values({ userId: session.userId });

  try {
    return { ok: true, suggestions: await readCv(pdf.bytes) };
  } catch (err) {
    console.error("CV auto-fill failed:", err);
    return {
      ok: false,
      error: "We couldn't read that CV just now. Try again in a minute, or fill in the form by hand.",
    };
  }
}
