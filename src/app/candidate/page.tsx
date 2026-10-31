import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { applicationsForCandidate, getCandidate, invitationsForCandidate, listOpenJobs, savedJobsFor, sharesForUser } from "@/lib/queries";
import { scoreMatch } from "@/lib/matching";
import { candidateForMatching, formatDate, jobForMatching, profileGaps } from "@/lib/format";
import { STATUS_LABELS } from "@/lib/constants";
import { FitBar, ScoreNumber } from "@/components/fit-bar";
import { ClosingSoon, JobList } from "@/components/job-list";
import { SaveJobButton } from "@/components/save-job";
import { closedReason } from "@/lib/jobs";
import { withdrawApplication } from "@/app/actions/candidate";

export const metadata: Metadata = { title: "My applications" };

const STATUS_TONE = {
  new: "text-ink-2 bg-sunken",
  shortlisted: "text-good bg-good/10",
  interview: "text-good bg-good/15",
  hired: "text-bg bg-good",
  declined: "text-muted bg-sunken",
} as const;

export default async function CandidateHome({ searchParams }: { searchParams: Promise<{ saved?: string; applied?: string; passwordReset?: string }> }) {
  const session = await requireRole("candidate", "/candidate");
  const { saved, applied, passwordReset } = await searchParams;
  const candidate = (await getCandidate(session.userId))!;
  const me = candidateForMatching(candidate);
  const gaps = profileGaps(candidate);

  const apps = await applicationsForCandidate(session.userId);
  const appliedIds = new Set(apps.map((a) => a.job.id));
  const savedList = await savedJobsFor(session.userId);
  const savedIds = new Set(savedList.map((s) => s.job.id));
  const invitations = await invitationsForCandidate(session.userId);
  // Jobs others sent, leaving out ones already applied for. Until the live database has the
  // job_shares table (npm run db:migrate), this is simply empty rather than breaking the page.
  const shared = (await sharesForUser(session.userId).catch(() => [])).filter((s) => !appliedIds.has(s.job.id));
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
        {passwordReset && (
          <p role="status" className="mt-4 rounded-md border border-good/30 bg-good/10 px-4 py-3 text-good">
            Password changed. You've been logged out on any other devices.
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

      {invitations.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold">Invited to apply</h2>
          <p className="mt-1 text-sm text-ink-2">
            These employers found your anonymous profile and asked you to apply. They can't see who you are unless you do.
          </p>
          <ul className="list mt-3 divide-y divide-line">
            {invitations.map(({ invitation, job, companyName }) => {
              const match = scoreMatch(jobForMatching(job), me);
              return (
                <li key={invitation.id} className="relative grid gap-4 p-5 sm:grid-cols-[1fr_9rem] sm:items-center">
                  <div className="min-w-0">
                    <Link href={`/jobs/${job.id}`} className="text-lg font-semibold after:absolute after:inset-0 hover:underline">
                      {job.title}
                    </Link>
                    <p className="text-ink-2">
                      {companyName}
                      <span className="text-muted"> invited you {formatDate(invitation.createdAt)}</span>
                    </p>
                    {invitation.message && <p className="mt-1 whitespace-pre-line text-sm text-ink-2">“{invitation.message}”</p>}
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-muted">Match</span>
                      <ScoreNumber total={match.total} className="text-xl" />
                    </div>
                    <FitBar criteria={match.criteria} size="sm" />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {shared.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold">Shared with you</h2>
          <ul className="list mt-3 divide-y divide-line">
            {shared.map(({ share, job, companyName, senderName }) => {
              const match = scoreMatch(jobForMatching(job), me);
              return (
                <li key={share.id} className="relative grid gap-4 p-5 sm:grid-cols-[1fr_9rem] sm:items-center">
                  <div className="min-w-0">
                    <Link href={`/jobs/${job.id}`} className="text-lg font-semibold after:absolute after:inset-0 hover:underline">
                      {job.title}
                    </Link>
                    <p className="text-ink-2">
                      {companyName}
                      <span className="text-muted">
                        {" "}
                        sent by {senderName}, {formatDate(share.createdAt)}
                      </span>
                    </p>
                    {share.note && <p className="mt-1 whitespace-pre-line text-sm text-ink-2">“{share.note}”</p>}
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-muted">Match</span>
                      <ScoreNumber total={match.total} className="text-xl" />
                    </div>
                    <FitBar criteria={match.criteria} size="sm" />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-xl font-semibold">My applications</h2>
        {apps.length === 0 ? (
          <div className="box mt-3 p-6">
            <p className="font-semibold">You haven't applied for anything yet.</p>
            <p className="mt-1 text-ink-2">
              Your best matches are below, or <Link href="/jobs" className="link">browse all jobs</Link>.
            </p>
          </div>
        ) : (
          <ul className="list mt-3 divide-y divide-line">
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

      <section>
        <h2 className="text-xl font-semibold">Saved jobs</h2>
        {savedList.length === 0 ? (
          <p className="mt-1 text-sm text-ink-2">Press Save on any job to keep it here until you're ready to apply.</p>
        ) : (
          <ul className="list mt-3 divide-y divide-line">
            {savedList.map(({ job, companyName, savedAt }) => {
              const closed = closedReason(job);
              const match = scoreMatch(jobForMatching(job), me);
              return (
                <li key={job.id} className="relative grid gap-4 p-5 sm:grid-cols-[1fr_9rem_auto] sm:items-center">
                  <div className="min-w-0">
                    <Link href={`/jobs/${job.id}`} className="text-lg font-semibold hover:underline">
                      {job.title}
                    </Link>
                    <p className="text-ink-2">
                      {companyName}
                      <span className="text-muted"> saved {formatDate(savedAt)}</span>
                    </p>
                    <p className="mt-1 text-sm">
                      {closed ? <span className="text-muted">No longer taking applications</span> : <ClosingSoon closesOn={job.closesOn} />}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-muted">Match</span>
                      <ScoreNumber total={match.total} className="text-xl" />
                    </div>
                    <FitBar criteria={match.criteria} size="sm" />
                  </div>
                  <div className="flex items-center gap-2 sm:justify-end">
                    {!closed && gaps.length === 0 && (
                      <Link href={`/jobs/${job.id}/apply`} className="btn btn-primary py-1.5">
                        Apply
                      </Link>
                    )}
                    <SaveJobButton jobId={job.id} saved signedInAsCandidate compact />
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
            <JobList items={recommended} savedIds={savedIds} signedInAsCandidate />
          </div>
        </section>
      )}

      {(!candidate.openToOffers || candidate.alertFrequency === "off") && (
        <section className="grid gap-4 md:grid-cols-2">
          {candidate.alertFrequency === "off" && (
            <div className="box p-5">
              <h2 className="font-semibold">Get new matches by email</h2>
              <p className="mt-1 text-sm text-ink-2">
                A daily or weekly email with new jobs that score well against your profile. Nothing is sent when there's
                nothing new.
              </p>
              <Link href="/settings#alerts" className="btn mt-3">
                Set up job alerts
              </Link>
            </div>
          )}
          {!candidate.openToOffers && (
            <div className="box p-5">
              <h2 className="font-semibold">Let employers find you</h2>
              <p className="mt-1 text-sm text-ink-2">
                Join the talent pool and employers can invite you to apply. They see your qualification, experience and
                skills, never your name, contact details or CV.
              </p>
              <Link href="/settings#talent-pool" className="btn mt-3">
                Join the talent pool
              </Link>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
