import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getJob } from "@/lib/queries";
import { rankedApplicants } from "@/lib/ranking";
import { qualificationLabel, STATUS_LABELS, STATUS_ORDER } from "@/lib/constants";
import { formatDate, timeAgo } from "@/lib/format";
import { CRITERIA } from "@/lib/matching";
import { FitBar, ScoreNumber } from "@/components/fit-bar";
import { JobMeta } from "@/components/job-list";
import { StatusSelect } from "@/components/status-select";
import { PipelineBoard } from "@/components/pipeline-board";
import { Stars } from "@/components/star-rating";
import { setJobStatus } from "@/app/actions/employer";
import type { ApplicationStatus } from "@/db/schema";
import { ShareJob } from "@/components/share-job";
import { closedReason } from "@/lib/jobs";
import { googleJobsEnabled, siteUrl } from "@/lib/site";

export const metadata: Metadata = { title: "Applicants" };

const SORTS = { match: "Best match", rating: "Your rating", newest: "Newest" } as const;
type Sort = keyof typeof SORTS;

type Params = { status?: string; must?: string; posted?: string; saved?: string; view?: string; sort?: string };

export default async function ApplicantsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Params> }) {
  const { id } = await params;
  const { status, must, posted, saved, view, sort: sortParam } = await searchParams;
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
  const board = view === "board";
  const sort: Sort = sortParam === "rating" || sortParam === "newest" ? sortParam : "match";
  const weightTotal = Object.values(job.weights).reduce((x, y) => x + y, 0) || 1;
  const counts = Object.fromEntries(STATUS_ORDER.map((s) => [s, all.filter((a) => a.application.status === s).length]));
  const activeStatus = !board && STATUS_ORDER.includes(status as ApplicationStatus) ? (status as ApplicationStatus) : null;
  const onlyMeetsMust = must === "1";
  const shown = all.filter(
    (a) => (!activeStatus || a.application.status === activeStatus) && (!onlyMeetsMust || a.match.mustHavesMet !== false),
  );
  if (sort === "rating") shown.sort((a, b) => (b.application.rating ?? 0) - (a.application.rating ?? 0));
  if (sort === "newest") shown.sort((a, b) => b.application.createdAt.getTime() - a.application.createdAt.getTime());

  const href = (changes: Partial<Record<"status" | "must" | "view" | "sort", string | null>>) => {
    const current = { status: activeStatus, must: onlyMeetsMust ? "1" : null, view: board ? "board" : null, sort: sort === "match" ? null : sort };
    const next = { ...current, ...changes };
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, v);
    const q = p.toString();
    return `/employer/jobs/${job.id}${q ? `?${q}` : ""}`;
  };

  const meetsAll = all.filter((a) => a.match.mustHavesMet).length;
  const average = all.length ? Math.round(all.reduce((s, a) => s + a.match.total, 0) / all.length) : null;
  const applyRate = job.views > 0 ? Math.min(100, (all.length / job.views) * 100) : null;

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
          {closed !== "hidden" && (
            <form action={setJobStatus}>
              <input type="hidden" name="jobId" value={job.id} />
              <input type="hidden" name="status" value={job.status === "open" ? "closed" : "open"} />
              <button className="btn">{job.status === "open" ? "Close to applications" : "Reopen"}</button>
            </form>
          )}
        </div>
      </div>

      {(posted || saved) && (
        <p role="status" className="mt-4 rounded-md border border-good/30 bg-good/10 px-4 py-3 text-good">
          {posted ? "Your job is live on the job board. Applicants will appear here, ranked." : "Changes saved. Applicants have been re-ranked."}
        </p>
      )}
      {closed && (
        <p className={`mt-4 rounded-md border px-4 py-3 ${closed === "hidden" ? "border-bad/30 bg-bad/10 text-ink" : "border-line bg-sunken text-ink-2"}`}>
          {closed === "hidden"
            ? "This job is hidden from the job board because people reported it, and it's waiting for a review. Nobody can apply in the meantime."
            : closed === "deadline"
              ? `Applications closed on ${formatDate(job.closesOn)}. To take more, edit the job and move the closing date.`
              : "This job is closed. It's hidden from the job board and isn't taking new applications."}
        </p>
      )}

      <section aria-label="How the listing is doing" className="mt-6 flex flex-wrap gap-x-10 gap-y-4 border-y border-line py-4">
        <Stat value={job.views.toLocaleString("en-ZA")} label={job.views === 1 ? "view" : "views"} />
        <Stat value={String(all.length)} label={all.length === 1 ? "application" : "applications"} />
        <Stat
          value={applyRate === null ? "–" : `${applyRate < 10 ? applyRate.toFixed(1) : Math.round(applyRate)}%`}
          label="of viewers applied"
        />
        <Stat value={average === null ? "–" : `${average}%`} label="average match" />
        <Stat value={String(meetsAll)} label="meet every must-have" />
      </section>

      {!closed && (
        <section className="box mt-6 grid gap-x-8 gap-y-4 p-5 md:grid-cols-[1fr_18rem]">
          <ShareJob url={`${siteUrl()}/jobs/${job.id}`} title={job.title} company={employer.companyName} />
          <div className="space-y-4">
            <div>
              <p className="label">Find candidates</p>
              <p className="text-sm text-ink-2">See people in the talent pool who match this job, and invite them to apply.</p>
              <Link href={`/employer/jobs/${job.id}/candidates`} className="btn mt-2">
                Browse the talent pool
              </Link>
            </div>
            <div>
              <p className="label">Google for Jobs</p>
              <p className="text-sm text-ink-2">{googleStatus}</p>
            </div>
          </div>
        </section>
      )}

      <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-xl font-semibold">Applicants</h2>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <nav aria-label="Layout" className="flex rounded-md border border-line p-0.5">
            {[
              [false, "List"],
              [true, "Board"],
            ].map(([isBoard, label]) => (
              <Link
                key={String(label)}
                href={href({ view: isBoard ? "board" : null, status: null })}
                aria-current={board === isBoard ? "page" : undefined}
                className={`rounded px-3 py-1 font-semibold ${board === isBoard ? "bg-ink text-bg" : "text-ink-2 hover:text-ink"}`}
              >
                {label}
              </Link>
            ))}
          </nav>
          {all.length > 0 && (
            <a href={`/employer/jobs/${job.id}/export`} className="btn py-1.5" download>
              Download CSV
            </a>
          )}
        </div>
      </div>

      {board ? (
        all.length === 0 ? (
          <Empty all={all.length} />
        ) : (
          <div className="mt-4">
            <p className="mb-3 text-sm text-muted">Drag a card to another column, or use its menu, to move an applicant on.</p>
            <PipelineBoard
              cards={all.map((a, i) => ({
                id: a.application.id,
                rank: i + 1,
                name: a.candidate.fullName,
                href: `/employer/jobs/${job.id}/applicants/${a.application.id}`,
                total: a.match.total,
                criteria: a.match.criteria,
                mustHavesMet: a.match.mustHavesMet,
                rating: a.application.rating,
                status: a.application.status,
              }))}
            />
          </div>
        )
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-b border-line">
            <nav aria-label="Filter by status" className="-mb-px flex flex-wrap gap-x-5 text-sm font-semibold">
              {[null, ...STATUS_ORDER].map((s) => {
                const active = s === activeStatus;
                return (
                  <Link
                    key={s ?? "all"}
                    href={href({ status: s })}
                    aria-current={active ? "page" : undefined}
                    className={`border-b-2 py-2.5 ${active ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"}`}
                  >
                    {s ? STATUS_LABELS[s] : "All"} <span className="num font-normal">{s ? counts[s] : all.length}</span>
                  </Link>
                );
              })}
            </nav>
            <Link href={href({ must: onlyMeetsMust ? null : "1" })} className="pb-2 text-sm text-ink-2 hover:text-ink">
              <span
                aria-hidden
                className={`mr-1.5 inline-block size-3.5 translate-y-0.5 rounded-[3px] border ${onlyMeetsMust ? "border-ink bg-ink" : "border-muted"}`}
              />
              Only show applicants who meet every must-have
            </Link>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
              <span>Ranked by match, with everyone who meets all must-haves first.</span>
              {CRITERIA.map((c) => (
                <span key={c.key} className="flex items-center gap-1">
                  <span className="size-2 rounded-[2px]" style={{ background: `var(--fit-${c.key})` }} />
                  {c.label} {Math.round((job.weights[c.key] / weightTotal) * 100)}%
                </span>
              ))}
            </div>
            <nav aria-label="Sort" className="flex gap-3 text-sm">
              <span className="text-muted">Sort:</span>
              {(Object.keys(SORTS) as Sort[]).map((s) => (
                <Link
                  key={s}
                  href={href({ sort: s === "match" ? null : s })}
                  aria-current={sort === s ? "page" : undefined}
                  className={sort === s ? "font-semibold text-ink" : "text-ink-2 hover:text-ink"}
                >
                  {SORTS[s]}
                </Link>
              ))}
            </nav>
          </div>

          {shown.length === 0 ? (
            <Empty all={all.length} />
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
                      {a.application.rating && (
                        <span className="ml-2">
                          <Stars rating={a.application.rating} />
                        </span>
                      )}
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
        </>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="num text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}

function Empty({ all }: { all: number }) {
  return (
    <div className="box mt-4 p-8 text-center">
      <p className="font-semibold">{all === 0 ? "No applications yet." : "Nobody matches this filter."}</p>
      <p className="mt-1 text-ink-2">
        {all === 0
          ? "Share the listing link, invite people from the talent pool, or wait for candidates browsing the job board to find it."
          : "Pick another status above, or turn off the must-have filter."}
      </p>
    </div>
  );
}
