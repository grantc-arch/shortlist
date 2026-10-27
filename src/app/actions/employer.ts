"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/auth";
import { CITIES } from "@/lib/constants";
import { normaliseWeights, parseLines, parseList, QUALIFICATION_ORDER } from "@/lib/matching";
import { isUuid } from "@/lib/queries";
import type { FormState } from "./auth";

const optionalInt = z.preprocess(
  (v) => (v === "" || v == null ? null : v),
  z.coerce.number().int().min(0).max(10_000_000).nullable(),
);
const optionalDate = z.preprocess((v) => (v === "" || v == null ? null : v), z.iso.date().nullable());

const jobSchema = z
  .object({
    title: z.string().trim().min(3, "Give the job a title").max(100),
    city: z.enum(CITIES, "Choose where the job is based"),
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
  })
  .refine((j) => !j.salaryMin || !j.salaryMax || j.salaryMax >= j.salaryMin, {
    message: "The top of the salary range is lower than the bottom",
  });

function parseJobForm(form: FormData) {
  const lines = (k: string) => parseLines(String(form.get(k) ?? ""));
  const parsed = jobSchema.safeParse({
    title: form.get("title"),
    city: form.get("city"),
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

  const jobId = String(form.get("jobId") ?? "");
  let id: string;
  if (jobId) {
    if (!isUuid(jobId)) return { error: "That job doesn't exist." };
    const [updated] = await db
      .update(schema.jobs)
      .set({ ...parsed.data, weights })
      .where(and(eq(schema.jobs.id, jobId), eq(schema.jobs.employerId, session.userId)))
      .returning({ id: schema.jobs.id });
    if (!updated) return { error: "That job doesn't exist or isn't yours." };
    id = updated.id;
  } else {
    const [created] = await db
      .insert(schema.jobs)
      .values({ ...parsed.data, weights, employerId: session.userId })
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
    .set({ status })
    .where(and(eq(schema.jobs.id, id), eq(schema.jobs.employerId, session.userId)));
  revalidatePath("/", "layout");
}

const STATUSES = ["new", "shortlisted", "interview", "declined", "hired"] as const;

export async function updateApplication(form: FormData) {
  const session = await requireRole("employer");
  const id = String(form.get("applicationId") ?? "");
  if (!isUuid(id)) return;

  // Confirm the application belongs to one of this employer's jobs.
  const [owned] = await db
    .select({ id: schema.applications.id, jobId: schema.applications.jobId })
    .from(schema.applications)
    .innerJoin(schema.jobs, eq(schema.jobs.id, schema.applications.jobId))
    .where(and(eq(schema.applications.id, id), eq(schema.jobs.employerId, session.userId)));
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

const employerSchema = z.object({
  companyName: z.string().trim().min(2, "Enter your company name").max(100),
  city: z.enum(CITIES),
  about: z.string().trim().max(1500, "Keep the description under 1 500 characters"),
  website: z.preprocess((v) => (v === "" ? null : v), z.url("Enter a full website address, starting with https://").nullable()),
});

export async function saveEmployerProfile(_: FormState, form: FormData): Promise<FormState> {
  const session = await requireRole("employer");
  const parsed = employerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await db.update(schema.employers).set(parsed.data).where(eq(schema.employers.userId, session.userId));
  revalidatePath("/", "layout");
  redirect("/employer?saved=1");
}
