import "server-only";
import { and, count, desc, eq, getTableColumns, gte, ilike, isNull, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { todayInSA } from "./jobs";

const { jobs, employers, candidates, applications } = schema;

// Every candidate column except the CV file itself, which is only loaded on download.
const { cvData: _cv, ...candidateColumns } = getTableColumns(candidates);
export type CandidateRow = Omit<typeof candidates.$inferSelect, "cvData">;

/** Jobs taking applications: open, and the closing date (if any) hasn't passed in South Africa. */
const acceptingApplications = () =>
  and(eq(jobs.status, "open"), or(isNull(jobs.closesOn), gte(jobs.closesOn, todayInSA())))!;

export async function listOpenJobs({ q, city }: { q?: string; city?: string } = {}) {
  const filters = [acceptingApplications()];
  if (q) {
    const term = `%${q.replace(/[%_]/g, "")}%`;
    filters.push(or(ilike(jobs.title, term), ilike(jobs.description, term), ilike(employers.companyName, term))!);
  }
  if (city) filters.push(eq(jobs.city, city));
  return db
    .select({ job: jobs, companyName: employers.companyName })
    .from(jobs)
    .innerJoin(employers, eq(employers.userId, jobs.employerId))
    .where(and(...filters))
    .orderBy(desc(jobs.createdAt));
}

/** Real (non-demo) jobs taking applications, for the sitemap. */
export async function listListableJobs() {
  return db
    .select({ id: jobs.id, updatedAt: jobs.updatedAt })
    .from(jobs)
    .innerJoin(employers, eq(employers.userId, jobs.employerId))
    .where(and(acceptingApplications(), eq(employers.isDemo, false)))
    .orderBy(desc(jobs.updatedAt));
}

export async function getJob(id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select({ job: jobs, employer: employers })
    .from(jobs)
    .innerJoin(employers, eq(employers.userId, jobs.employerId))
    .where(eq(jobs.id, id));
  return row ?? null;
}

export async function getCandidate(userId: string): Promise<CandidateRow | null> {
  const [row] = await db.select(candidateColumns).from(candidates).where(eq(candidates.userId, userId));
  return row ?? null;
}

export async function getEmployer(userId: string) {
  return (await db.query.employers.findFirst({ where: eq(employers.userId, userId) })) ?? null;
}

export async function getApplication(jobId: string, candidateId: string) {
  return (
    (await db.query.applications.findFirst({
      where: and(eq(applications.jobId, jobId), eq(applications.candidateId, candidateId)),
    })) ?? null
  );
}

export async function applicationsForCandidate(candidateId: string) {
  return db
    .select({ application: applications, job: jobs, companyName: employers.companyName })
    .from(applications)
    .innerJoin(jobs, eq(jobs.id, applications.jobId))
    .innerJoin(employers, eq(employers.userId, jobs.employerId))
    .where(eq(applications.candidateId, candidateId))
    .orderBy(desc(applications.createdAt));
}

export async function jobsForEmployer(employerId: string) {
  return db
    .select({ job: jobs, applicants: count(applications.id) })
    .from(jobs)
    .leftJoin(applications, eq(applications.jobId, jobs.id))
    .where(eq(jobs.employerId, employerId))
    .groupBy(jobs.id)
    .orderBy(desc(jobs.createdAt));
}

export async function applicantsForJob(jobId: string) {
  return db
    .select({ application: applications, candidate: candidateColumns, email: schema.users.email })
    .from(applications)
    .innerJoin(candidates, eq(candidates.userId, applications.candidateId))
    .innerJoin(schema.users, eq(schema.users.id, applications.candidateId))
    .where(eq(applications.jobId, jobId));
}

export function isUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
