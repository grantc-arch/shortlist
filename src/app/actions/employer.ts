"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/auth";
import { parsePlace } from "@/lib/places";
import { normaliseWeights, parseLines, parseList, QUALIFICATION_ORDER } from "@/lib/matching";
import { getJob, invitationsSentToday, isUuid, talentPoolFor } from "@/lib/queries";
import { isAcceptingApplications, todayInSA } from "@/lib/jobs";
import { BENEFIT_KEYS } from "@/lib/constants";
import { scoreMatch } from "@/lib/matching";
import { jobForMatching } from "@/lib/format";
import { sendEmail } from "@/lib/email";
import { invitationEmail } from "@/lib/emails";
import { siteUrl } from "@/lib/site";
import { unsubscribeQuery } from "@/lib/unsubscribe";
import type { FormState } from "./auth";

const optionalInt = z.preprocess(
  (v) => (v === "" || v == null ? null : v),
  z.coerce.number().int().min(0).max(10_000_000).nullable(),
);
const optionalDate = z.preprocess((v) => (v === "" || v == null ? null : v), z.iso.date().nullable());

const jobSchema = z
  .object({
    title: z.string().trim().min(3, "Give the job a title").max(100),
    workplace: z.enum(["on_site", "hybrid", "remote"]),
    employmentType: z.enum(["full_time", "part_time", "contract", "internship"]),
    salaryMin: optionalInt,
    salaryMax: optionalInt,
    startDate: optionalDate,
    closesOn: optionalDate,
    description: z.string().trim().min(40, "Describe the role in at least a couple of sentences").max(5000),
    responsibilities: z.array(z.string().max(200)).max(20),
    minQualification: z.enum(QUALIFICATION_ORDER),
    fieldKeywords: z.array(z.string().max(60)).max(10),
    minYearsExperience: z.coerce.number().int().min(0).max(30),
    skills: z.array(z.string().max(60)).max(25, "List at most 25 skills"),
    mustHaves: z.array(z.string().max(160)).max(8, "Keep must-haves to 8 or fewer"),
    benefits: z.array(z.enum(BENEFIT_KEYS)),
  })
  .refine((j) => !j.salaryMin || !j.salaryMax || j.salaryMax >= j.salaryMin, {
    message: "The top of the salary range is lower than the bottom",
  })
  .refine((j) => !j.closesOn || j.closesOn >= todayInSA(), {
    message: "Choose a closing date from today onwards. To stop applications now, use “Close to applications”.",
  });

function parseJobForm(form: FormData) {
  const lines = (k: string) => parseLines(String(form.get(k) ?? ""));
  const parsed = jobSchema.safeParse({
    title: form.get("title"),
    workplace: form.get("workplace"),
    employmentType: form.get("employmentType"),
    salaryMin: form.get("salaryMin"),
    salaryMax: form.get("salaryMax"),
    startDate: form.get("startDate"),
    closesOn: form.get("closesOn"),
    description: form.get("description"),
    // Responsibilities and must-haves are one per line (they can contain commas).
    responsibilities: lines("responsibilities"),
    minQualification: form.get("minQualification"),
    fieldKeywords: parseList(String(form.get("fieldKeywords") ?? "")),
    minYearsExperience: form.get("minYearsExperience") || 0,
    skills: parseList(String(form.get("skills") ?? "")),
    mustHaves: lines("mustHaves"),
    benefits: [...new Set(form.getAll("benefits").map(String))].filter((b) => (BENEFIT_KEYS as string[]).includes(b)),
  });
  const weights = normaliseWeights({
    qualification: Number(form.get("w_qualification")),
    experience: Number(form.get("w_experience")),
    skills: Number(form.get("w_skills")),
    location: Number(form.get("w_location")),
    availability: Number(form.get("w_availability")),
  });
  return { parsed, weights };
}

export async function saveJob(_: FormState, form: FormData): Promise<FormState> {
  const session = await requireRole("employer");
  const { parsed, weights } = parseJobForm(form);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const location = parsePlace(form, "city", "Enter where the job is based");
  if ("error" in location) return { error: location.error };
  const place = { city: location.place.label, lat: location.place.lat, lng: location.place.lng };

  const jobId = String(form.get("jobId") ?? "");
  let id: string;
  if (jobId) {
    if (!isUuid(jobId)) return { error: "That job doesn't exist." };
    const [updated] = await db
      .update(schema.jobs)
      .set({ ...parsed.data, ...place, weights, updatedAt: new Date() })
      .where(and(eq(schema.jobs.id, jobId), eq(schema.jobs.employerId, session.userId)))
      .returning({ id: schema.jobs.id });
    if (!updated) return { error: "That job doesn't exist or isn't yours." };
    id = updated.id;
  } else {
    const [created] = await db
      .insert(schema.jobs)
      .values({ ...parsed.data, ...place, weights, employerId: session.userId })
      .returning({ id: schema.jobs.id });
    id = created.id;
  }
  revalidatePath("/", "layout");
  redirect(`/employer/jobs/${id}${jobId ? "?saved=1" : "?posted=1"}`);
}

export async function setJobStatus(form: FormData) {
  const session = await requireRole("employer");
  const id = String(form.get("jobId") ?? "");
  const status = form.get("status") === "closed" ? "closed" : "open";
  if (!isUuid(id)) return;
  await db
    .update(schema.jobs)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(schema.jobs.id, id), eq(schema.jobs.employerId, session.userId)));
  revalidatePath("/", "layout");
}

const STATUSES = ["new", "shortlisted", "interview", "declined", "hired"] as const;

export async function updateApplication(form: FormData) {
  const session = await requireRole("employer");
  const id = String(form.get("applicationId") ?? "");
  // Confirm the application belongs to one of this employer's jobs.
  const owned = await ownedApplication(id, session.userId);
  if (!owned) return;

  const status = form.get("status");
  const notes = form.get("employerNotes");
  await db
    .update(schema.applications)
    .set({
      ...(STATUSES.includes(status as (typeof STATUSES)[number]) ? { status: status as (typeof STATUSES)[number] } : {}),
      ...(typeof notes === "string" ? { employerNotes: notes.slice(0, 4000) } : {}),
      updatedAt: new Date(),
    })
    .where(eq(schema.applications.id, id));
  revalidatePath(`/employer/jobs/${owned.jobId}`, "layout");
}

async function ownedApplication(applicationId: string, employerId: string) {
  if (!isUuid(applicationId)) return null;
  const [owned] = await db
    .select({ id: schema.applications.id, jobId: schema.applications.jobId })
    .from(schema.applications)
    .innerJoin(schema.jobs, eq(schema.jobs.id, schema.applications.jobId))
    .where(and(eq(schema.applications.id, applicationId), eq(schema.jobs.employerId, employerId)));
  return owned ?? null;
}

/** The employer's private 1 to 5 star rating; 0 clears it. */
export async function rateApplication(applicationId: string, rating: number) {
  const session = await requireRole("employer");
  const owned = await ownedApplication(applicationId, session.userId);
  if (!owned || !Number.isInteger(rating) || rating < 0 || rating > 5) return;
  await db
    .update(schema.applications)
    .set({ rating: rating === 0 ? null : rating, updatedAt: new Date() })
    .where(eq(schema.applications.id, applicationId));
  revalidatePath(`/employer/jobs/${owned.jobId}`, "layout");
}

const INVITES_PER_DAY = 25;

export type InviteState = { error?: string; invited?: boolean } | undefined;

/** Invites a talent-pool candidate to apply, and emails them. Their identity stays hidden until they apply. */
export async function inviteCandidate(_: InviteState, form: FormData): Promise<InviteState> {
  const session = await requireRole("employer");
  const jobId = String(form.get("jobId") ?? "");
  const candidateId = String(form.get("candidateId") ?? "");
  const message = String(form.get("message") ?? "").trim();
  if (message.length > 500) return { error: "Keep your message under 500 characters." };
  const row = await getJob(jobId);
  if (!row || row.job.employerId !== session.userId) return { error: "That job doesn't exist." };
  if (!isAcceptingApplications(row.job)) return { error: "This job isn't taking applications, so you can't invite anyone to it." };

  const person = (await talentPoolFor(jobId)).find((p) => p.userId === candidateId);
  if (!person) return { error: "This candidate is no longer in the talent pool." };
  if (person.invitedAt) return { invited: true };
  if ((await invitationsSentToday(session.userId)) >= INVITES_PER_DAY) {
    return { error: `You can send ${INVITES_PER_DAY} invitations a day. Try again tomorrow.` };
  }

  const inserted = await db
    .insert(schema.invitations)
    .values({ jobId, candidateId, message })
    .onConflictDoNothing()
    .returning({ id: schema.invitations.id });
  if (inserted.length > 0) {
    const [to] = await db
      .select({ email: schema.users.email, fullName: schema.candidates.fullName })
      .from(schema.users)
      .innerJoin(schema.candidates, eq(schema.candidates.userId, schema.users.id))
      .where(eq(schema.users.id, candidateId));
    const base = siteUrl();
    const q = unsubscribeQuery(candidateId, "invites");
    const mail = invitationEmail({
      firstName: to.fullName.trim().split(/\s+/)[0] || "there",
      company: row.employer.companyName,
      jobTitle: row.job.title,
      message,
      score: scoreMatch(jobForMatching(row.job), person).total,
      jobUrl: `${base}/jobs/${jobId}`,
      footer: {
        settings: `${base}/settings`,
        unsubscribe: `${base}/unsubscribe?${q}`,
        reason: "You get these because you're open to opportunities on Shortlist.",
      },
    });
    after(() =>
      sendEmail({ to: to.email, ...mail, unsubscribeUrl: `${base}/api/unsubscribe?${q}` }).catch((err) =>
        console.error("Invitation email failed:", err),
      ),
    );
  }
  revalidatePath(`/employer/jobs/${jobId}`, "layout");
  return { invited: true };
}

const employerSchema = z.object({
  companyName: z.string().trim().min(2, "Enter your company name").max(100),
  about: z.string().trim().max(1500, "Keep the description under 1 500 characters"),
  website: z.preprocess((v) => (v === "" ? null : v), z.url("Enter a full website address, starting with https://").nullable()),
});

export async function saveEmployerProfile(_: FormState, form: FormData): Promise<FormState> {
  const session = await requireRole("employer");
  const parsed = employerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const location = parsePlace(form, "city", "Enter where you're based");
  if ("error" in location) return { error: location.error };
  const { label, lat, lng } = location.place;
  await db
    .update(schema.employers)
    .set({ ...parsed.data, city: label, lat, lng })
    .where(eq(schema.employers.userId, session.userId));
  revalidatePath("/", "layout");
  redirect("/employer?saved=1");
}
