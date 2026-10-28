import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getJob } from "@/lib/queries";
import { rankedApplicants } from "@/lib/ranking";
import { qualificationLabel, STATUS_LABELS, STATUS_ORDER } from "@/lib/constants";
import { timeAgo } from "@/lib/format";
import { CRITERIA } from "@/lib/matching";
import { FitBar, ScoreNumber } from "@/components/fit-bar";
import { JobMeta } from "@/components/job-list";
import { StatusSelect } from "@/components/status-select";
import { setJobStatus } from "@/app/actions/employer";
import type { ApplicationStatus } from "@/db/schema";
import { ShareJob } from "@/components/share-job";
import { closedReason } from "@/lib/jobs";
import { formatDate } from "@/lib/format";
import { googleJobsEnabled, siteUrl } from "@/lib/site";

export const metadata: Metadata = { title: "Applicants" };

export default async function ApplicantsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; must?: string; posted?: string; saved?: string }>;
}) {
  const { id } = await params;
  const { status, must, posted, saved } = await searchParams;
  const session = await requireRole("employer", `/employer/jobs/${id}`);
  const row = await getJob(id);
  if (!row || row.job.employerId !== session.userId) notFound();
  const { job, employer } = row;
  const closed = closedReason(job);
  const googleStatus = employer.isDemo
    ? "Not listed on Google, because this is a demo account."
    : !googleJobsEnabled()
      ? "Not listed on Google. Listing is switched off for this site."
      : closed
        ? "Not listed on Google while the job is closed."
        : "Offered to Google for Jobs. Google usually picks up new jobs within a few days, but doesn't guarantee to show them.";

  const all = await rankedApplicants(job);
  const weightTotal = Object.values(job.weights).reduce((x, y) => x + y, 0) || 1;
  const counts = Object.fromEntries(STATUS_ORDER.map((s) => [s, all.filter((a) => a.application.status === s).length]));
  const activeStatus = STATUS_ORDER.includes(status as ApplicationStatus) ? (status as ApplicationStatus) : null;
  const onlyMeetsMust = must === "1";
  const shown = all.filter(
    (a) => (!activeStatus || a.application.status === activeStatus) && (!onlyMeetsMust || a.match.mustHavesMet !== false),
  );
  const href = (s: string | null, m = onlyMeetsMust) => {
    const p = new URLSearchParams();
    if (s) p.set("status", s);
    if (m) p.set("must", "1");
    const q = p.toString();
    return `/employer/jobs/${job.id}${q ? `?${q}` : ""}`;
  };

  return (
    <div>
      <Link href="/employer" className="text-sm text-muted hover:text-ink">
        Dashboard
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold sm:text-4xl">{job.title}</h1>
          <div className="mt-2">
            <JobMeta job={job} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/jobs/${job.id}`} className="btn">
            View listing
          </Link>
          <Link href={`/employer/jobs/${job.id}/edit`} className="btn">
            Edit job
          </Link>
          <form action={setJobStatus}>
            <input type="hidden" name="jobId" value={job.id} />
            <input type="hidden" name="status" value={job.status === "open" ? "closed" : "open"} />
            <button className="btn">{job.status === "open" ? "Close to applications" : "Reopen"}</button>
          </form>
        </div>
      </div>

      {(posted || saved) && (
        <p role="status" className="mt-4 rounded-md border border-good/30 bg-good/10 px-4 py-3 text-good">
          {posted ? "Your job is live on the job board. Applicants will appear here, ranked." : "Changes saved. Applicants have been re-ranked."}
        </p>
      )}
      {closed && (
        <p className="mt-4 rounded-md border border-line bg-sunken px-4 py-3 text-ink-2">
          {closed === "deadline"
            ? `Applications closed on ${formatDate(job.closesOn)}. To take more, edit the job and move the closing date.`
            : "This job is closed. It's hidden from the job board and isn't taking new applications."}
        </p>
      )}

      {!closed && (
        <section className="box mt-6 grid gap-x-8 gap-y-4 p-5 md:grid-cols-[1fr_18rem]">
          <ShareJob url={`${siteUrl()}/jobs/${job.id}`} title={job.title} company={employer.companyName} />
          <div>
            <p className="label">Google for Jobs</p>
            <p className="text-sm text-ink-2">{googleStatus}</p>
          </div>
        </section>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-b border-line">
        <nav aria-label="Filter by status" className="-mb-px flex flex-wrap gap-x-5 text-sm font-semibold">
          {[null, ...STATUS_ORDER].map((s) => {
            const active = s === activeStatus;
            return (
              <Link
                key={s ?? "all"}
                href={href(s)}
                aria-current={active ? "page" : undefined}
                className={`border-b-2 py-2.5 ${active ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"}`}
              >
                {s ? STATUS_LABELS[s] : "All"} <span className="num font-normal">{s ? counts[s] : all.length}</span>
              </Link>
            );
          })}
        </nav>
        <Link href={href(activeStatus, !onlyMeetsMust)} className="pb-2 text-sm text-ink-2 hover:text-ink">
          <span
            aria-hidden
            className={`mr-1.5 inline-block size-3.5 translate-y-0.5 rounded-[3px] border ${onlyMeetsMust ? "border-ink bg-ink" : "border-muted"}`}
          />
          Only show applicants who meet every must-have
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span>Ranked by match, with everyone who meets all must-haves first.</span>
        {CRITERIA.map((c) => (
          <span key={c.key} className="flex items-center gap-1">
            <span className="size-2 rounded-[2px]" style={{ background: `var(--fit-${c.key})` }} />
            {c.label} {Math.round((job.weights[c.key] / weightTotal) * 100)}%
          </span>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="box mt-4 p-8 text-center">
          <p className="font-semibold">{all.length === 0 ? "No applications yet." : "Nobody matches this filter."}</p>
          <p className="mt-1 text-ink-2">
            {all.length === 0
              ? "Share the listing link, or wait for candidates browsing the job board to find it."
              : "Pick another status above, or turn off the must-have filter."}
          </p>
        </div>
      ) : (
        <ol className="list mt-4 divide-y divide-line">
          {shown.map((a) => {
            const rank = all.indexOf(a) + 1;
            const c = a.candidate;
            return (
              <li key={a.application.id} className="relative grid gap-x-5 gap-y-3 p-5 md:grid-cols-[2.5rem_1fr_13rem_auto] md:items-center">
                <span className="num hidden text-2xl font-bold text-muted md:block">{rank}</span>
                <div className="min-w-0">
                  <Link
                    href={`/employer/jobs/${job.id}/applicants/${a.application.id}`}
                    className="text-lg font-semibold after:absolute after:inset-0 hover:underline"
                  >
                    <span className="num mr-2 text-muted md:hidden">{rank}.</span>
                    {c.fullName}
                  </Link>
                  <p className="text-sm text-ink-2">
                    {qualificationLabel(c.qualificationLevel)}
                    {c.fieldOfStudy && `, ${c.fieldOfStudy}`}. {c.yearsExperience} yr experience. {c.city}.
                  </p>
                  <p className="mt-1 text-sm">
                    {a.match.mustHavesMet ? (
                      <span className="text-good">Meets every must-have</span>
                    ) : (
                      <span className="text-warn">
                        Answered no to: {a.match.mustHaves.filter((m) => !m.answer).map((m) => m.question).join("; ")}
                      </span>
                    )}
                    <span className="text-muted"> Applied {timeAgo(a.application.createdAt)}</span>
                  </p>
                </div>
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-muted">Match</span>
                    <ScoreNumber total={a.match.total} className="text-2xl" />
                  </div>
                  <FitBar criteria={a.match.criteria} />
                </div>
                <StatusSelect applicationId={a.application.id} status={a.application.status} label={`Status for ${c.fullName}`} />
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
