"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/auth";
import { CITIES, MAX_CV_BYTES } from "@/lib/constants";
import { parseList, QUALIFICATION_ORDER } from "@/lib/matching";
import { getApplication, getCandidate, getJob, isUuid } from "@/lib/queries";
import { profileGaps } from "@/lib/format";
import type { FormState } from "./auth";

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name"),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{9,16}$/, "Enter a valid phone number, for example 082 123 4567"),
  city: z.enum(CITIES, "Choose the city you're based in"),
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
    city: form.get("city"),
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

  const existing = await getCandidate(session.userId);
  const cv = form.get("cv");
  let cvUpdate: { cvFileName: string; cvData: Buffer } | null = null;
  if (cv instanceof File && cv.size > 0) {
    if (cv.type !== "application/pdf" && !cv.name.toLowerCase().endsWith(".pdf")) {
      return { error: "Upload your CV as a PDF." };
    }
    if (cv.size > MAX_CV_BYTES) return { error: "Your CV is over 2 MB. Export a smaller PDF and try again." };
    const bytes = Buffer.from(await cv.arrayBuffer());
    if (bytes.subarray(0, 5).toString() !== "%PDF-") return { error: "That file isn't a valid PDF." };
    cvUpdate = { cvFileName: cv.name.slice(0, 120), cvData: bytes };
  } else if (!existing?.cvFileName) {
    return { error: "Upload your CV as a PDF." };
  }

  await db
    .update(schema.candidates)
    .set({
      ...data,
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
  if (!row || row.job.status !== "open") return { error: "This job is no longer taking applications." };

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
