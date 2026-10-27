import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { applicationsForCandidate, getCandidate, listOpenJobs } from "@/lib/queries";
import { scoreMatch } from "@/lib/matching";
import { candidateForMatching, formatDate, jobForMatching, profileGaps } from "@/lib/format";
import { STATUS_LABELS } from "@/lib/constants";
import { FitBar, ScoreNumber } from "@/components/fit-bar";
import { JobList } from "@/components/job-list";
import { withdrawApplication } from "@/app/actions/candidate";

export const metadata: Metadata = { title: "My applications" };

const STATUS_TONE = {
  new: "text-ink-2 bg-sunken",
  shortlisted: "text-good bg-good/10",
  interview: "text-good bg-good/15",
  hired: "text-bg bg-good",
  declined: "text-muted bg-sunken",
} as const;

export default async function CandidateHome({ searchParams }: { searchParams: Promise<{ saved?: string; applied?: string }> }) {
  const session = await requireRole("candidate", "/candidate");
  const { saved, applied } = await searchParams;
  const candidate = (await getCandidate(session.userId))!;
  const me = candidateForMatching(candidate);
  const gaps = profileGaps(candidate);

  const apps = await applicationsForCandidate(session.userId);
  const appliedIds = new Set(apps.map((a) => a.job.id));
  const recommended = (await listOpenJobs())
    .filter((r) => !appliedIds.has(r.job.id))
    .map((r) => ({ ...r, match: scoreMatch(jobForMatching(r.job), me) }))
    .sort((a, b) => b.match.total - a.match.total)
    .slice(0, 3);

  const justApplied = applied ? apps.find((a) => a.job.id === applied) : null;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold sm:text-4xl">Hi {candidate.fullName.split(" ")[0]}</h1>
        {justApplied && (
          <p role="status" className="mt-4 rounded-md border border-good/30 bg-good/10 px-4 py-3 text-good">
            Application sent to {justApplied.companyName} for {justApplied.job.title}. You'll see its status change here.
          </p>
        )}
        {saved && !justApplied && (
          <p role="status" className="mt-4 rounded-md border border-good/30 bg-good/10 px-4 py-3 text-good">
            Profile saved. Your match scores have been updated.
          </p>
        )}
        {gaps.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-warn/30 bg-warn/10 px-4 py-3">
            <p className="text-ink">Add your {gaps.join(", ")} to start applying.</p>
            <Link href="/candidate/profile" className="btn btn-primary">
              Complete my profile
            </Link>
          </div>
        )}
      </div>

      <section>
        <h2 className="text-xl font-semibold">My applications</h2>
        {apps.length === 0 ? (
          <div className="panel mt-3 p-6">
            <p className="font-semibold">You haven't applied for anything yet.</p>
            <p className="mt-1 text-ink-2">
              Your best matches are below, or <Link href="/jobs" className="link">browse all jobs</Link>.
            </p>
          </div>
        ) : (
          <ul className="panel mt-3 divide-y divide-line">
            {apps.map(({ application: a, job, companyName }) => {
              const match = scoreMatch(jobForMatching(job), me, a.mustHaveAnswers);
              return (
                <li key={a.id} className="grid gap-4 p-5 sm:grid-cols-[1fr_9rem_auto] sm:items-center">
                  <div className="min-w-0">
                    <Link href={`/jobs/${job.id}`} className="text-lg font-semibold hover:underline">
                      {job.title}
                    </Link>
                    <p className="text-ink-2">
                      {companyName}
                      <span className="text-muted"> applied {formatDate(a.createdAt)}</span>
                    </p>
                    {match.mustHavesMet === false && (
                      <p className="mt-1 text-sm text-warn">You answered no to at least one must-have.</p>
                    )}
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-muted">Match</span>
                      <ScoreNumber total={match.total} className="text-xl" />
                    </div>
                    <FitBar criteria={match.criteria} size="sm" />
                  </div>
                  <div className="flex items-center gap-3 sm:justify-end">
                    <span className={`rounded px-2.5 py-1 text-sm font-semibold ${STATUS_TONE[a.status]}`}>
                      {STATUS_LABELS[a.status]}
                    </span>
                    {a.status === "new" && (
                      <form action={withdrawApplication}>
                        <input type="hidden" name="applicationId" value={a.id} />
                        <button className="text-sm text-muted underline-offset-2 hover:text-bad hover:underline">Withdraw</button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {recommended.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold">Your best matches</h2>
          <p className="mt-1 text-sm text-ink-2">Open jobs you haven't applied for, ranked against your profile.</p>
          <div className="mt-3">
            <JobList items={recommended} />
          </div>
        </section>
      )}
    </div>
  );
}
