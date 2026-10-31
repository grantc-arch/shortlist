import "server-only";
import { and, count, desc, eq, getTableColumns, gt, gte, ilike, inArray, isNotNull, isNull, ne, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { todayInSA } from "./jobs";
import { COMMUTE_KM, coordsFor, distanceKm } from "./places";
import type { Job } from "@/db/schema";

const { jobs, employers, candidates, applications, savedJobs, invitations, jobReports, users, jobShares } = schema;

// Every candidate column except the CV file itself, which is only loaded on download.
const { cvData: _cv, ...candidateColumns } = getTableColumns(candidates);
export type CandidateRow = Omit<typeof candidates.$inferSelect, "cvData">;

/** Jobs taking applications: open, not hidden, and the closing date (if any) hasn't passed in South Africa. */
const acceptingApplications = () =>
  and(eq(jobs.status, "open"), isNull(jobs.hiddenAt), or(isNull(jobs.closesOn), gte(jobs.closesOn, todayInSA())))!;

export interface JobFilters {
  q?: string;
  city?: string;
  workplace?: Job["workplace"];
  type?: Job["employmentType"];
  /** Monthly rand: jobs whose pay reaches at least this. Jobs without a salary are left out. */
  minSalary?: number;
  /** Only jobs posted in the last this many days. */
  postedDays?: number;
  employerId?: string;
}

export async function listOpenJobs({ q, city, workplace, type, minSalary, postedDays, employerId }: JobFilters = {}) {
  const filters = [acceptingApplications()];
  if (q) {
    const term = `%${q.replace(/[%_]/g, "")}%`;
    filters.push(or(ilike(jobs.title, term), ilike(jobs.description, term), ilike(employers.companyName, term))!);
  }
  if (workplace) filters.push(eq(jobs.workplace, workplace));
  if (type) filters.push(eq(jobs.employmentType, type));
  if (minSalary) filters.push(sql`greatest(coalesce(${jobs.salaryMin}, 0), coalesce(${jobs.salaryMax}, 0)) >= ${minSalary}`);
  if (postedDays) filters.push(gt(jobs.createdAt, new Date(Date.now() - postedDays * 86_400_000)));
  if (employerId) filters.push(eq(jobs.employerId, employerId));
  const rows = await db
    .select({ job: jobs, companyName: employers.companyName })
    .from(jobs)
    .innerJoin(employers, eq(employers.userId, jobs.employerId))
    .where(and(...filters))
    .orderBy(desc(jobs.createdAt));
  if (!city) return rows;
  // "Near Cape Town": within commuting distance, or naming the city if a job has no coordinates.
  const centre = coordsFor({ city });
  return rows.filter(({ job }) => {
    const at = coordsFor(job);
    if (centre && at) return distanceKm(centre, at) <= COMMUTE_KM;
    return job.city.toLowerCase().includes(city.toLowerCase());
  });
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

export async function getUser(userId: string) {
  return (await db.query.users.findFirst({ where: eq(users.id, userId) })) ?? null;
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

export async function applicationCount(jobId: string): Promise<number> {
  const [{ n }] = await db.select({ n: count() }).from(applications).where(eq(applications.jobId, jobId));
  return n;
}

export async function getCompany(employerId: string) {
  if (!isUuid(employerId)) return null;
  return (await db.query.employers.findFirst({ where: eq(employers.userId, employerId) })) ?? null;
}

/** Companies with at least one job taking applications, for the sitemap. */
export async function listListableCompanies() {
  return db
    .selectDistinct({ id: employers.userId })
    .from(employers)
    .innerJoin(jobs, eq(jobs.employerId, employers.userId))
    .where(and(acceptingApplications(), eq(employers.isDemo, false)));
}

// ── Jobs shared between users ───────────────────────────────────────────────

/** The name to show for someone: a candidate's name, a company's name, or the start of their email. */
export async function displayName(userId: string): Promise<string> {
  const [row] = await db
    .select({ email: users.email, fullName: candidates.fullName, companyName: employers.companyName })
    .from(users)
    .leftJoin(candidates, eq(candidates.userId, users.id))
    .leftJoin(employers, eq(employers.userId, users.id))
    .where(eq(users.id, userId));
  return row?.fullName || row?.companyName || row?.email.split("@")[0] || "Someone";
}

/** Open jobs other people have sent to this user, newest first. */
export async function sharesForUser(userId: string) {
  return db
    .select({
      share: jobShares,
      job: jobs,
      companyName: employers.companyName,
      senderName: sql<string>`coalesce(${candidates.fullName}, sender_company.company_name, split_part(${users.email}, '@', 1))`,
    })
    .from(jobShares)
    .innerJoin(jobs, eq(jobs.id, jobShares.jobId))
    .innerJoin(employers, eq(employers.userId, jobs.employerId))
    .innerJoin(users, eq(users.id, jobShares.senderId))
    .leftJoin(candidates, eq(candidates.userId, jobShares.senderId))
    .leftJoin(sql`${employers} as sender_company`, sql`sender_company.user_id = ${jobShares.senderId}`)
    .where(and(eq(jobShares.recipientId, userId), acceptingApplications()))
    .orderBy(desc(jobShares.createdAt))
    .limit(20);
}

/** The last few addresses this user sent jobs to, for quick picking. */
export async function recentShareRecipients(senderId: string): Promise<string[]> {
  const rows = await db
    .select({ email: jobShares.recipientEmail, last: sql<Date>`max(${jobShares.createdAt})` })
    .from(jobShares)
    .where(eq(jobShares.senderId, senderId))
    .groupBy(jobShares.recipientEmail)
    .orderBy(desc(sql`max(${jobShares.createdAt})`))
    .limit(5);
  return rows.map((r) => r.email);
}

export async function sharesSentToday(senderId: string): Promise<number> {
  const [{ n }] = await db
    .select({ n: count() })
    .from(jobShares)
    .where(and(eq(jobShares.senderId, senderId), gt(jobShares.createdAt, new Date(Date.now() - 86_400_000))));
  return n;
}

// ── Saved jobs ──────────────────────────────────────────────────────────────

export async function savedJobIds(userId: string): Promise<Set<string>> {
  const rows = await db.select({ jobId: savedJobs.jobId }).from(savedJobs).where(eq(savedJobs.userId, userId));
  return new Set(rows.map((r) => r.jobId));
}

/** Saved jobs, newest save first. Includes closed ones so candidates can see what happened. */
export async function savedJobsFor(userId: string) {
  return db
    .select({ job: jobs, companyName: employers.companyName, savedAt: savedJobs.createdAt })
    .from(savedJobs)
    .innerJoin(jobs, eq(jobs.id, savedJobs.jobId))
    .innerJoin(employers, eq(employers.userId, jobs.employerId))
    .where(and(eq(savedJobs.userId, userId), isNull(jobs.hiddenAt)))
    .orderBy(desc(savedJobs.createdAt));
}

// ── Invitations and the talent pool ─────────────────────────────────────────

/** Invitations to jobs still taking applications that the candidate hasn't applied for. */
export async function invitationsForCandidate(candidateId: string) {
  return db
    .select({ invitation: invitations, job: jobs, companyName: employers.companyName })
    .from(invitations)
    .innerJoin(jobs, eq(jobs.id, invitations.jobId))
    .innerJoin(employers, eq(employers.userId, jobs.employerId))
    .leftJoin(applications, and(eq(applications.jobId, jobs.id), eq(applications.candidateId, candidateId)))
    .where(and(eq(invitations.candidateId, candidateId), acceptingApplications(), isNull(applications.id)))
    .orderBy(desc(invitations.createdAt));
}

export async function getInvitation(jobId: string, candidateId: string) {
  return (
    (await db.query.invitations.findFirst({
      where: and(eq(invitations.jobId, jobId), eq(invitations.candidateId, candidateId)),
    })) ?? null
  );
}

/**
 * Candidates who opted in to being found, with a complete profile, who haven't applied for this job.
 * Contact details and the CV are never selected here.
 */
export async function talentPoolFor(jobId: string) {
  const rows = await db
    .select({
      userId: candidates.userId,
      city: candidates.city,
      lat: candidates.lat,
      lng: candidates.lng,
      willingToRelocate: candidates.willingToRelocate,
      qualificationLevel: candidates.qualificationLevel,
      fieldOfStudy: candidates.fieldOfStudy,
      yearsExperience: candidates.yearsExperience,
      skills: candidates.skills,
      hasOwnTransport: candidates.hasOwnTransport,
      availableFrom: candidates.availableFrom,
      invitedAt: invitations.createdAt,
    })
    .from(candidates)
    .leftJoin(applications, and(eq(applications.candidateId, candidates.userId), eq(applications.jobId, jobId)))
    .leftJoin(invitations, and(eq(invitations.candidateId, candidates.userId), eq(invitations.jobId, jobId)))
    .where(
      and(
        eq(candidates.openToOffers, true),
        isNotNull(candidates.popiaConsentAt),
        isNotNull(candidates.availableFrom),
        isNotNull(candidates.cvFileName),
        ne(candidates.city, ""),
        sql`cardinality(${candidates.skills}) > 0`,
        isNull(applications.id),
      ),
    );
  return rows;
}

export async function invitationsSentToday(employerId: string) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(invitations)
    .innerJoin(jobs, eq(jobs.id, invitations.jobId))
    .where(and(eq(jobs.employerId, employerId), gt(invitations.createdAt, new Date(Date.now() - 86_400_000))));
  return n;
}

// ── Reports ─────────────────────────────────────────────────────────────────

export async function getReport(jobId: string, reporterId: string) {
  return (
    (await db.query.jobReports.findFirst({
      where: and(eq(jobReports.jobId, jobId), eq(jobReports.reporterId, reporterId)),
    })) ?? null
  );
}

export async function openReportCount(jobId: string) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(jobReports)
    .where(and(eq(jobReports.jobId, jobId), isNull(jobReports.resolvedAt)));
  return n;
}

/** Every report waiting for review, with its job and reporter, for the admin page. */
export async function openReports() {
  return db
    .select({
      report: jobReports,
      reporterEmail: users.email,
      job: { id: jobs.id, title: jobs.title, hiddenAt: jobs.hiddenAt, status: jobs.status },
      companyName: employers.companyName,
    })
    .from(jobReports)
    .innerJoin(jobs, eq(jobs.id, jobReports.jobId))
    .innerJoin(employers, eq(employers.userId, jobs.employerId))
    .innerJoin(users, eq(users.id, jobReports.reporterId))
    .where(isNull(jobReports.resolvedAt))
    .orderBy(desc(jobReports.createdAt));
}

/** Jobs an admin took down after review (hidden, with no open reports). */
export async function removedJobs() {
  return db
    .select({ job: { id: jobs.id, title: jobs.title, hiddenAt: jobs.hiddenAt }, companyName: employers.companyName })
    .from(jobs)
    .innerJoin(employers, eq(employers.userId, jobs.employerId))
    .where(
      and(
        isNotNull(jobs.hiddenAt),
        sql`not exists (select 1 from ${jobReports} where ${jobReports.jobId} = ${jobs.id} and ${jobReports.resolvedAt} is null)`,
      ),
    )
    .orderBy(desc(jobs.hiddenAt));
}

export async function usersByIds(ids: string[]) {
  if (ids.length === 0) return [];
  return db.select().from(users).where(inArray(users.id, ids));
}

export function isUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
