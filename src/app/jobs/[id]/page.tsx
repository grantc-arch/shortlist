import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { applicationCount, getApplication, getCandidate, getInvitation, getJob, getReport, listOpenJobs, savedJobIds } from "@/lib/queries";
import { BackToJobs } from "@/components/back-to-jobs";
import { ShareButton } from "@/components/share-button";
import type { Employer, Job } from "@/db/schema";
import { scoreMatch } from "@/lib/matching";
import { candidateForMatching, formatDate, jobForMatching, profileGaps } from "@/lib/format";
import { benefitLabels, qualificationLabel, STATUS_LABELS } from "@/lib/constants";
import { FitBar, FitBreakdown, ScoreNumber } from "@/components/fit-bar";
import { ClosingSoon, JobList, JobMeta } from "@/components/job-list";
import { SaveJobButton } from "@/components/save-job";
import { ViewTracker } from "@/components/view-tracker";
import { similarJobs } from "@/lib/similar";
import { closedReason } from "@/lib/jobs";
import { buildJobPosting, isListableOnGoogle, jsonLdScript } from "@/lib/job-posting";
import { googleJobsEnabled, isAdmin, siteUrl } from "@/lib/site";
import { formatSalary } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const row = await getJob((await params).id);
  if (!row) return { title: "Job not found" };
  const { job, employer } = row;
  const title = `${job.title} at ${employer.companyName}`;
  const description = [job.city, formatSalary(job.salaryMin, job.salaryMax), job.description.replace(/\s+/g, " ")]
    .filter(Boolean)
    .join(". ")
    .slice(0, 200);
  return {
    title,
    description,
    alternates: { canonical: `/jobs/${job.id}` },
    // Only real, open jobs should appear in search; demo and closed listings are kept out.
    robots: isListableOnGoogle(job, employer, googleJobsEnabled()) ? undefined : { index: false, follow: true },
    openGraph: { title, description, type: "website", siteName: "Shortlist", url: `/jobs/${job.id}` },
  };
}

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getJob(id);
  if (!row) notFound();
  const { job, employer } = row;

  const session = await getSession();
  const isOwner = session?.role === "employer" && session.userId === job.employerId;
  const closed = closedReason(job);
  if (closed && !isOwner && !isAdmin(session?.email)) {
    // Closed jobs stay visible to people who applied, so their application history makes sense.
    const applied = session?.role === "candidate" && (await getApplication(job.id, session.userId));
    if (!applied) {
      // Reported jobs vanish. Closed ones get a page pointing to open jobs, because old links keep being shared.
      if (closed === "hidden") notFound();
      const open = await listOpenJobs();
      return (
        <ClosedJob
          job={job}
          employer={employer}
          similar={similarJobs(job, open)}
          companyOpen={open.filter((r) => r.job.employerId === job.employerId).length}
        />
      );
    }
  }

  const candidate = session?.role === "candidate" ? await getCandidate(session.userId) : null;
  const application = candidate ? await getApplication(job.id, candidate.userId) : null;
  const invitation = candidate && !application && !closed ? await getInvitation(job.id, candidate.userId) : null;
  const saved = candidate ? (await savedJobIds(candidate.userId)).has(job.id) : false;
  const reported = session ? !!(await getReport(job.id, session.userId)) : false;
  const benefits = benefitLabels(job.benefits);
  const similar = similarJobs(job, await listOpenJobs()).map((r) => ({
    ...r,
    match: candidate ? scoreMatch(jobForMatching(r.job), candidateForMatching(candidate)) : null,
  }));
  const match = candidate
    ? scoreMatch(jobForMatching(job), candidateForMatching(candidate), application?.mustHaveAnswers ?? null)
    : null;
  const gaps = candidate ? profileGaps(candidate) : [];
  const applicants = !closed && !isOwner && !application ? await applicationCount(job.id) : null;
  const jobPosting = isListableOnGoogle(job, employer, googleJobsEnabled())
    ? jsonLdScript(buildJobPosting(job, employer, siteUrl()))
    : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      {jobPosting && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jobPosting }} />}
      {!isOwner && !closed && <ViewTracker jobId={job.id} />}
      <article className="min-w-0">
        {closed === "hidden" && (
          <p className="mb-5 rounded-md border border-bad/30 bg-bad/10 px-4 py-3 text-sm text-ink">
            {isOwner
              ? "This job is hidden from the job board because several people reported it. It's waiting for a review, and nobody can apply in the meantime."
              : "This job was reported by several people and is hidden while it's reviewed. Be careful: don't pay anything or share your bank details or ID number with this employer."}
          </p>
        )}
        {invitation && (
          <div className="mb-5 rounded-md border border-good/30 bg-good/10 px-4 py-3 text-sm text-ink">
            <p className="font-semibold">{employer.companyName} invited you to apply for this job.</p>
            {invitation.message && <p className="mt-1 whitespace-pre-line text-ink-2">“{invitation.message}”</p>}
          </div>
        )}
        {employer.isDemo && (
          <p className="mb-5 rounded-md border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-ink">
            This is a demo listing for a fictional company, there to show how Shortlist works. It isn't a real job.
          </p>
        )}
        <BackToJobs className="text-sm text-muted hover:text-ink" />
        <h1 className="mt-2 text-4xl font-bold sm:text-5xl">{job.title}</h1>
        <p className="mt-2 text-lg text-ink-2">
          <Link href={`/companies/${employer.userId}`} className="link">
            {employer.companyName}
          </Link>
          {closed && <span className="ml-2 text-bad">Closed to new applications</span>}
        </p>
        <div className="mt-4">
          <JobMeta job={job} />
        </div>
        {job.closesOn && (
          <p className="mt-1 text-sm text-muted">
            {closed === "deadline" ? "Applications closed" : "Applications close"} {formatDate(job.closesOn)}
            {!closed && (
              <>
                {" "}
                <ClosingSoon closesOn={job.closesOn} />
              </>
            )}
          </p>
        )}

        {applicants !== null && (
          <p className="mt-2 text-sm font-semibold text-good">
            {applicants < FIRST_APPLICANTS
              ? `Be one of the first ${FIRST_APPLICANTS} applicants`
              : `${applicants} people have applied`}
          </p>
        )}

        {match && (
          // On small screens the full breakdown sits below the description, so show the headline score here.
          <a href="#match" className="box mt-5 block p-4 lg:hidden">
            <span className="flex items-baseline justify-between">
              <span className="font-semibold">Your match</span>
              <ScoreNumber total={match.total} className="text-2xl" />
            </span>
            <span className="mt-2 block">
              <FitBar criteria={match.criteria} />
            </span>
            <span className="mt-2 block text-sm text-ink-2">See the breakdown{application ? "" : " and apply"} below</span>
          </a>
        )}

        <section className="mt-8 max-w-prose">
          <h2 className="text-xl font-semibold">About the role</h2>
          <div className="mt-2 space-y-3 whitespace-pre-line text-ink-2">{job.description}</div>
        </section>

        {job.responsibilities.length > 0 && (
          <section className="mt-8 max-w-prose">
            <h2 className="text-xl font-semibold">What you'll do</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-2 marker:text-muted">
              {job.responsibilities.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-8 max-w-prose">
          <h2 className="text-xl font-semibold">What they're looking for</h2>
          <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-[11rem_1fr]">
            <dt className="font-semibold">Qualification</dt>
            <dd className="text-ink-2">
              {qualificationLabel(job.minQualification)} or higher
              {job.fieldKeywords.length > 0 && <>, in {job.fieldKeywords.join(" or ")} or a related field</>}
            </dd>
            <dt className="font-semibold">Experience</dt>
            <dd className="text-ink-2">
              {job.minYearsExperience > 0
                ? `At least ${job.minYearsExperience} year${job.minYearsExperience === 1 ? "" : "s"}`
                : "None required"}
            </dd>
            {job.skills.length > 0 && (
              <>
                <dt className="font-semibold">Skills</dt>
                <dd>
                  <ul className="flex flex-wrap gap-1.5">
                    {job.skills.map((s) => (
                      <li key={s} className="rounded bg-sunken px-2 py-0.5 text-sm text-ink-2">
                        {s}
                      </li>
                    ))}
                  </ul>
                </dd>
              </>
            )}
          </dl>
        </section>

        {job.mustHaves.length > 0 && (
          <section className="mt-8 max-w-prose">
            <h2 className="text-xl font-semibold">Must-haves</h2>
            <p className="mt-1 text-sm text-muted">You'll be asked to confirm each of these when you apply.</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-2 marker:text-accent">
              {job.mustHaves.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </section>
        )}

        {benefits.length > 0 && (
          <section className="mt-8 max-w-prose">
            <h2 className="text-xl font-semibold">Benefits</h2>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {benefits.map((b) => (
                <li key={b} className="rounded bg-sunken px-2 py-0.5 text-sm text-ink-2">
                  {b}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-8 max-w-prose">
          <h2 className="text-xl font-semibold">About {employer.companyName}</h2>
          {employer.about && <p className="mt-2 text-ink-2">{employer.about}</p>}
          <p className="mt-2">
            <Link href={`/companies/${employer.userId}`} className="link text-sm">
              See the company and all its jobs
            </Link>
          </p>
        </section>

        {similar.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-semibold">Similar jobs</h2>
            <div className="mt-3">
              <JobList items={similar} />
            </div>
          </section>
        )}
      </article>

      <aside id="match" className="scroll-mt-4 lg:sticky lg:top-6 lg:self-start">
        <div className="box p-5">
          {isOwner ? (
            <>
              <h2 className="font-semibold">This is your listing</h2>
              <p className="mt-1 text-sm text-ink-2">See everyone who applied, ranked by match.</p>
              <Link href={`/employer/jobs/${job.id}`} className="btn btn-primary mt-4 w-full">
                View applicants
              </Link>
            </>
          ) : candidate && match ? (
            <>
              <FitBreakdown match={match} heading="Your match" />
              <div className="mt-5 border-t border-line pt-4">
                {application ? (
                  <>
                    <p className="font-semibold">You applied {formatDate(application.createdAt)}</p>
                    <p className="text-sm text-ink-2">Status: {STATUS_LABELS[application.status]}</p>
                    <Link href="/candidate" className="btn mt-3 w-full">
                      See my applications
                    </Link>
                  </>
                ) : gaps.length > 0 ? (
                  <>
                    <p className="text-sm text-ink-2">
                      Before you can apply, add your {gaps.join(", ")}. A complete profile also makes your match score
                      accurate.
                    </p>
                    <Link href={`/candidate/profile?next=/jobs/${job.id}`} className="btn btn-primary mt-3 w-full">
                      Complete my profile
                    </Link>
                  </>
                ) : (
                  <Link href={`/jobs/${job.id}/apply`} className="btn btn-primary w-full">
                    Apply for this job
                  </Link>
                )}
                {!application && !closed && (
                  <div className="mt-2">
                    <SaveJobButton jobId={job.id} saved={saved} signedInAsCandidate />
                  </div>
                )}
              </div>
            </>
          ) : session?.role === "employer" ? (
            <p className="text-sm text-ink-2">You're signed in as an employer, so you can't apply for jobs.</p>
          ) : (
            <>
              <h2 className="font-semibold">See how well you match</h2>
              <p className="mt-1 text-sm text-ink-2">
                Create a free profile and every job shows your score, broken down by qualification, experience, skills,
                location and availability.
              </p>
              <Link href={`/signup?next=/jobs/${job.id}`} className="btn btn-primary mt-4 w-full">
                Create a profile
              </Link>
              <Link href={`/login?next=/jobs/${job.id}`} className="btn mt-2 w-full">
                Log in
              </Link>
            </>
          )}
          {!closed && (
            <div className="mt-2">
              <ShareButton url={`${siteUrl()}/jobs/${job.id}`} title={job.title} company={employer.companyName} />
            </div>
          )}
        </div>
        {!isOwner && (
          <div className="mt-4 px-1 text-sm text-ink-2">
            <h2 className="font-semibold text-ink">Stay safe</h2>
            <p className="mt-1">
              Shortlist never charges to apply. Don't pay for a job, training or a “placement fee”, and don't share your
              bank details or ID number before you've signed an offer.
            </p>
            <p className="mt-2">
              {reported ? (
                <span className="text-muted">You've reported this job. Thanks for letting us know.</span>
              ) : (
                <Link href={`/jobs/${job.id}/report`} className="link">
                  Report this job
                </Link>
              )}
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}

/** Below this many applicants, a job invites people to be among the first. */
const FIRST_APPLICANTS = 10;

/** Shown instead of a closed job, so shared links still lead somewhere useful. */
function ClosedJob({
  job,
  employer,
  similar,
  companyOpen,
}: {
  job: Job;
  employer: Employer;
  similar: { job: Job; companyName: string }[];
  companyOpen: number;
}) {
  return (
    <div className="max-w-3xl">
      <BackToJobs className="text-sm text-muted hover:text-ink" />
      <p className="mt-6 text-sm font-semibold text-muted">
        {closedReason(job) === "deadline" && job.closesOn ? `Applications closed ${formatDate(job.closesOn)}` : "No longer taking applications"}
      </p>
      <h1 className="mt-1 text-3xl font-bold sm:text-4xl">This job has closed</h1>
      <p className="mt-2 text-lg text-ink-2">
        {job.title} at {employer.companyName}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {companyOpen > 0 && (
          <Link href={`/companies/${employer.userId}`} className="btn btn-primary">
            See {employer.companyName}'s {companyOpen} open {companyOpen === 1 ? "job" : "jobs"}
          </Link>
        )}
        <Link href="/jobs" className={companyOpen > 0 ? "btn" : "btn btn-primary"}>
          Browse all jobs
        </Link>
      </div>
      {similar.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold">Similar jobs that are still open</h2>
          <div className="mt-3">
            <JobList items={similar} />
          </div>
        </section>
      )}
    </div>
  );
}
