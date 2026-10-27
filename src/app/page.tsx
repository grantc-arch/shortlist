import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getCandidate, listOpenJobs } from "@/lib/queries";
import { scoreMatch, type CandidateForMatching } from "@/lib/matching";
import { candidateForMatching, jobForMatching } from "@/lib/format";
import { FitBreakdown } from "@/components/fit-bar";
import { JobList } from "@/components/job-list";

// Shown to visitors without a profile, so the hero demonstrates a real score.
const EXAMPLE: CandidateForMatching & { description: string } = {
  description: "a marketing graduate in Stellenbosch with a year of experience",
  city: "Stellenbosch",
  willingToRelocate: false,
  qualificationLevel: "degree",
  fieldOfStudy: "Marketing Management",
  yearsExperience: 1,
  skills: ["Excel", "Outlook", "Canva", "Social media"],
  availableFrom: new Date().toISOString().slice(0, 10),
};

export default async function Home({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { deleted } = await searchParams;
  const session = await getSession();
  const candidate = session?.role === "candidate" ? await getCandidate(session.userId) : null;
  const jobs = await listOpenJobs();
  const me = candidate ? candidateForMatching(candidate) : null;
  // Feature the best-matching open job for this candidate (or the example profile).
  const scored = jobs
    .map((r) => ({ ...r, match: scoreMatch(jobForMatching(r.job), me ?? EXAMPLE) }))
    .sort((a, b) => b.match.total - a.match.total);
  const featured = scored[0];
  const heroMatch = featured?.match ?? null;

  return (
    <div className="space-y-16">
      {deleted && (
        <p role="status" className="-mb-8 rounded-md border border-line bg-sunken px-4 py-3 text-ink-2">
          Your account and all its data have been deleted.
        </p>
      )}
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h1 className="max-w-[14ch] text-5xl font-extrabold tracking-[-0.03em] sm:text-6xl">
            Know your score before you apply.
          </h1>
          <p className="mt-5 max-w-[46ch] text-lg text-ink-2">
            Every job on Shortlist scores your profile against what the employer asked for, and shows you exactly where
            the points come from. Employers get every applicant ranked the same way.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            {session ? (
              <Link href={session.role === "employer" ? "/employer" : "/jobs"} className="btn btn-primary px-5 py-2.5 text-base">
                {session.role === "employer" ? "Go to your dashboard" : "Browse jobs"}
              </Link>
            ) : (
              <>
                <Link href="/signup" className="btn btn-primary px-5 py-2.5 text-base">
                  Create a candidate profile
                </Link>
                <Link href="/signup?as=employer" className="btn px-5 py-2.5 text-base">
                  Post a job
                </Link>
              </>
            )}
          </div>
        </div>

        {featured && heroMatch && (
          <div className="panel p-6">
            <p className="text-sm text-muted">
              {me ? "Your best match right now" : `How ${EXAMPLE.description} scores for`}
            </p>
            <Link href={`/jobs/${featured.job.id}`} className="text-xl font-semibold hover:underline">
              {featured.job.title}, {featured.companyName}
            </Link>
            <div className="mt-5">
              <FitBreakdown match={heroMatch} heading="Match" />
            </div>
          </div>
        )}
      </section>

      <section className="grid gap-8 border-y border-line py-10 md:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold">Looking for work</h2>
          <p className="mt-2 max-w-prose text-ink-2">
            Build one profile with your qualification, experience, skills and CV. Each job shows your match and what's
            holding the score back, so you spend your effort on the roles you can actually get.
          </p>
        </div>
        <div>
          <h2 className="text-xl font-semibold">Hiring</h2>
          <p className="mt-2 max-w-prose text-ink-2">
            Post a role, list your must-haves and decide how much qualification, experience, skills, location and
            availability count. Applicants arrive ranked, with the reasons beside each score. You make every decision.
          </p>
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-2xl font-bold">Latest jobs</h2>
          <Link href="/jobs" className="link text-sm">
            See all {jobs.length} open jobs
          </Link>
        </div>
        <div className="mt-4">
          {jobs.length > 0 ? (
            <JobList
              items={jobs.slice(0, 5).map((r) => ({ ...r, match: me ? scoreMatch(jobForMatching(r.job), me) : null }))}
            />
          ) : (
            <p className="panel p-6 text-ink-2">No jobs posted yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
