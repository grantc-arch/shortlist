import "server-only";
import { and, eq, getTableColumns, gt, inArray, isNull, lt, lte, ne, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { emailConfigured, sendEmail } from "./email";
import { applicantDigestEmail, jobAlertEmail, statusUpdateEmail, type ApplicantSummary, type StatusUpdate } from "./emails";
import { candidateForMatching, formatSalary, jobForMatching } from "./format";
import { scoreMatch } from "./matching";
import { listOpenJobs } from "./queries";
import { siteUrl } from "./site";
import { unsubscribeQuery, type EmailKind } from "./unsubscribe";

/**
 * The once-a-day emails, run by Vercel Cron (see vercel.json):
 * application status changes for candidates, new-applicant summaries for employers,
 * and job alerts. Each piece of work is claimed in the database before its email is
 * sent, so a run that's repeated or overlaps another never sends the same email twice.
 */

const { applications, jobs, employers, candidates, users } = schema;
const { cvData: _cv, ...candidateColumns } = getTableColumns(candidates);

const DAY = 86_400_000;
const HOUR = 3_600_000;
// Gmail allows about 500 a day; leave room for password resets and invitations.
export const MAX_EMAILS_PER_RUN = 300;

export interface DigestResult {
  statusEmails: number;
  applicantEmails: number;
  alertEmails: number;
  skipped?: string;
}

function links(userId: string, kind: EmailKind, reason: string) {
  const base = siteUrl();
  const q = unsubscribeQuery(userId, kind);
  return {
    footer: { settings: `${base}/settings`, unsubscribe: `${base}/unsubscribe?${q}`, reason },
    oneClick: `${base}/api/unsubscribe?${q}`,
  };
}

// Map.groupBy needs Node 21+, and the README promises Node 20.
function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}

const firstName = (fullName: string) => fullName.trim().split(/\s+/)[0] || "there";

export async function runDailyEmails(now = new Date()): Promise<DigestResult> {
  const result: DigestResult = { statusEmails: 0, applicantEmails: 0, alertEmails: 0 };
  if (!emailConfigured() && process.env.NODE_ENV === "production") {
    return { ...result, skipped: "Email isn't set up (the SMTP_ settings), so nothing was sent." };
  }
  let budget = MAX_EMAILS_PER_RUN;
  result.statusEmails = await sendStatusUpdates(budget);
  budget -= result.statusEmails;
  result.applicantEmails = await sendApplicantDigests(budget, now);
  budget -= result.applicantEmails;
  result.alertEmails = await sendJobAlerts(budget, now);
  return result;
}

/** Candidates hear about every application whose status changed since they were last told. */
async function sendStatusUpdates(budget: number): Promise<number> {
  const rows = await db
    .select({
      id: applications.id,
      candidateId: applications.candidateId,
      jobId: jobs.id,
      jobTitle: jobs.title,
      hidden: sql<boolean>`${jobs.hiddenAt} is not null`,
      company: employers.companyName,
      email: users.email,
      emailUpdates: users.emailUpdates,
      fullName: candidates.fullName,
    })
    .from(applications)
    .innerJoin(jobs, eq(jobs.id, applications.jobId))
    .innerJoin(employers, eq(employers.userId, jobs.employerId))
    .innerJoin(users, eq(users.id, applications.candidateId))
    .innerJoin(candidates, eq(candidates.userId, applications.candidateId))
    .where(ne(applications.status, applications.notifiedStatus));

  const byCandidate = groupBy(rows, (r) => r.candidateId);
  let sent = 0;
  for (const [candidateId, apps] of byCandidate) {
    if (sent >= budget) break;
    // Claim: record the current status as told. Only rows this run changes are reported.
    const claimed = await db
      .update(applications)
      .set({ notifiedStatus: sql`${applications.status}` })
      .where(and(inArray(applications.id, apps.map((a) => a.id)), ne(applications.status, applications.notifiedStatus)))
      .returning({ id: applications.id, status: applications.status });
    const { email, emailUpdates, fullName } = apps[0];
    const updates: StatusUpdate[] = claimed.flatMap((c) => {
      const app = apps.find((a) => a.id === c.id)!;
      // Moving someone back to "New" isn't news, and hidden (reported) jobs stay quiet.
      if (c.status === "new" || app.hidden) return [];
      return [{ jobTitle: app.jobTitle, company: app.company, status: c.status, url: `${siteUrl()}/jobs/${app.jobId}` }];
    });
    if (!emailUpdates || updates.length === 0) continue;
    const { footer, oneClick } = links(candidateId, "updates", "You get these because you applied for jobs on Shortlist.");
    const mail = statusUpdateEmail({ firstName: firstName(fullName), updates, dashboardUrl: `${siteUrl()}/candidate`, footer });
    if (await trySend({ to: email, ...mail, unsubscribeUrl: oneClick })) sent++;
  }
  return sent;
}

/** Employers get one email a day listing new applicants per job. */
async function sendApplicantDigests(budget: number, now: Date): Promise<number> {
  const rows = await db
    .select({
      employerId: employers.userId,
      digestAt: employers.applicantsDigestAt,
      company: employers.companyName,
      email: users.email,
      emailUpdates: users.emailUpdates,
      job: jobs,
      mustHaveAnswers: applications.mustHaveAnswers,
      candidate: candidateColumns,
    })
    .from(applications)
    .innerJoin(jobs, eq(jobs.id, applications.jobId))
    .innerJoin(employers, eq(employers.userId, jobs.employerId))
    .innerJoin(users, eq(users.id, employers.userId))
    .innerJoin(candidates, eq(candidates.userId, applications.candidateId))
    .where(and(gt(applications.createdAt, employers.applicantsDigestAt), lte(applications.createdAt, now)));

  let sent = 0;
  for (const [employerId, apps] of groupBy(rows, (r) => r.employerId)) {
    if (sent >= budget) break;
    // Claim the window: only if nobody else moved it on since we read it (compared to the
    // millisecond, which is as precise as JavaScript dates are).
    const claimed = await db
      .update(employers)
      .set({ applicantsDigestAt: now })
      .where(
        and(
          eq(employers.userId, employerId),
          sql`date_trunc('milliseconds', ${employers.applicantsDigestAt}) = ${apps[0].digestAt.toISOString()}::timestamptz`,
        ),
      )
      .returning({ id: employers.userId });
    if (claimed.length === 0 || !apps[0].emailUpdates) continue;

    const jobsSummary: ApplicantSummary[] = [...groupBy(apps, (a) => a.job.id).values()].map((forJob) => {
      const job = forJob[0].job;
      const scores = forJob.map((a) => scoreMatch(jobForMatching(job), candidateForMatching(a.candidate), a.mustHaveAnswers).total);
      return {
        jobTitle: job.title,
        count: forJob.length,
        bestScore: Math.max(...scores),
        url: `${siteUrl()}/employer/jobs/${job.id}?status=new`,
      };
    });
    const { footer, oneClick } = links(employerId, "updates", "You get this because you post jobs on Shortlist.");
    const mail = applicantDigestEmail({ company: apps[0].company, jobs: jobsSummary, dashboardUrl: `${siteUrl()}/employer`, footer });
    if (await trySend({ to: apps[0].email, ...mail, unsubscribeUrl: oneClick })) sent++;
  }
  return sent;
}

/** New jobs that score at least the candidate's chosen match, daily or weekly. No email when there's nothing new. */
async function sendJobAlerts(budget: number, now: Date): Promise<number> {
  // Two hours' slack, because Vercel's free plan runs the job at any time within the hour.
  const dailyCutoff = new Date(now.getTime() - DAY + 2 * HOUR);
  const weeklyCutoff = new Date(now.getTime() - 7 * DAY + 2 * HOUR);
  const dueWhere = or(
    and(eq(candidates.alertFrequency, "daily"), or(isNull(candidates.alertsCheckedAt), lt(candidates.alertsCheckedAt, dailyCutoff))),
    and(eq(candidates.alertFrequency, "weekly"), or(isNull(candidates.alertsCheckedAt), lt(candidates.alertsCheckedAt, weeklyCutoff))),
  )!;
  const due = await db
    .select({ candidate: candidateColumns, email: users.email })
    .from(candidates)
    .innerJoin(users, eq(users.id, candidates.userId))
    .where(dueWhere);
  if (due.length === 0) return 0;

  const open = await listOpenJobs();
  const applied = await db
    .select({ jobId: applications.jobId, candidateId: applications.candidateId })
    .from(applications)
    .where(inArray(applications.candidateId, due.map((d) => d.candidate.userId)));
  const appliedBy = groupBy(applied, (a) => a.candidateId);

  let sent = 0;
  for (const { candidate: c, email } of due) {
    if (sent >= budget) break;
    const claimed = await db
      .update(candidates)
      .set({ alertsCheckedAt: now })
      .where(and(eq(candidates.userId, c.userId), dueWhere))
      .returning({ id: candidates.userId });
    if (claimed.length === 0) continue;
    // Scores mean little until the profile has skills and a location.
    if (c.skills.length === 0 || !c.city) continue;

    const frequency = c.alertFrequency === "weekly" ? "weekly" : "daily";
    const since = c.alertsCheckedAt ?? new Date(now.getTime() - (frequency === "weekly" ? 7 : 1) * DAY);
    const skip = new Set((appliedBy.get(c.userId) ?? []).map((a) => a.jobId));
    const me = candidateForMatching(c);
    const matches = open
      .filter(({ job }) => job.createdAt > since && job.createdAt <= now && !skip.has(job.id))
      .map(({ job, companyName }) => ({ job, companyName, score: scoreMatch(jobForMatching(job), me).total }))
      .filter((m) => m.score >= c.alertMinScore)
      .sort((a, b) => b.score - a.score);
    if (matches.length === 0) continue;

    const { footer, oneClick } = links(c.userId, "alerts", `You get these because you turned on ${frequency} job alerts.`);
    const mail = jobAlertEmail({
      firstName: firstName(c.fullName),
      frequency,
      minScore: c.alertMinScore,
      allJobsUrl: `${siteUrl()}/jobs`,
      footer,
      jobs: matches.map((m) => ({
        title: m.job.title,
        company: m.companyName,
        place: m.job.workplace === "remote" ? "Remote" : m.job.city,
        salary: formatSalary(m.job.salaryMin, m.job.salaryMax),
        score: m.score,
        url: `${siteUrl()}/jobs/${m.job.id}`,
      })),
    });
    if (await trySend({ to: email, ...mail, unsubscribeUrl: oneClick })) sent++;
  }
  return sent;
}

async function trySend(email: Parameters<typeof sendEmail>[0]): Promise<boolean> {
  try {
    // Demo addresses are skipped and don't count.
    return (await sendEmail(email)) !== "skipped";
  } catch (err) {
    console.error(`Daily email to ${email.to} failed:`, err);
    return false;
  }
}
