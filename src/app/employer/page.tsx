import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getEmployer, jobsForEmployer } from "@/lib/queries";
import { rankedApplicants } from "@/lib/ranking";
import { formatDate } from "@/lib/format";
import { ScoreNumber } from "@/components/fit-bar";
import { JobMeta } from "@/components/job-list";
import { closedReason } from "@/lib/jobs";

export const metadata: Metadata = { title: "Dashboard" };

export default async function EmployerHome({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const session = await requireRole("employer", "/employer");
  const { saved } = await searchParams;
  const employer = (await getEmployer(session.userId))!;
  const rows = await jobsForEmployer(session.userId);

  // Summary per job: how many are new, and the best match so far.
  const jobs = await Promise.all(
    rows.map(async ({ job, applicants }) => {
      const ranked = applicants > 0 ? await rankedApplicants(job) : [];
      return {
        job,
        applicants,
        newCount: ranked.filter((a) => a.application.status === "new").length,
        top: ranked[0] ?? null,
      };
    }),
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">{employer.companyName}</h1>
          <p className="mt-1 text-ink-2">
            {employer.city}.{" "}
            <Link href="/employer/profile" className="link">
              Edit company details
            </Link>
          </p>
        </div>
        <Link href="/employer/jobs/new" className="btn btn-primary">
          Post a job
        </Link>
      </div>

      {saved && (
        <p role="status" className="rounded-md border border-good/30 bg-good/10 px-4 py-3 text-good">
          Company details saved.
        </p>
      )}

      {jobs.length === 0 ? (
        <div className="box p-8">
          <h2 className="text-xl font-semibold">Post your first job</h2>
          <p className="mt-1 max-w-prose text-ink-2">
            Describe the role, list what you need, and choose what matters most. Candidates on the job board see how well
            they fit before applying, and you get everyone ranked.
          </p>
          <Link href="/employer/jobs/new" className="btn btn-primary mt-4">
            Post a job
          </Link>
        </div>
      ) : (
        <section>
          <h2 className="text-xl font-semibold">Your jobs</h2>
          <ul className="list mt-3 divide-y divide-line">
            {jobs.map(({ job, applicants, newCount, top }) => (
              <li key={job.id} className="relative grid gap-4 p-5 md:grid-cols-[1fr_auto_auto] md:items-center md:gap-8">
                <div className="min-w-0">
                  <Link
                    href={`/employer/jobs/${job.id}`}
                    className="text-lg font-semibold after:absolute after:inset-0 hover:underline"
                  >
                    {job.title}
                  </Link>
                  {closedReason(job) && (
                    <span className="ml-2 text-sm font-semibold text-muted">
                      {closedReason(job) === "deadline" ? "Closing date passed" : "Closed"}
                    </span>
                  )}
                  <div className="mt-1">
                    <JobMeta job={job} />
                  </div>
                  <p className="mt-1 text-sm text-muted">Posted {formatDate(job.createdAt)}</p>
                </div>
                <div className="flex gap-8">
                  <Stat value={applicants} label={applicants === 1 ? "applicant" : "applicants"} />
                  <Stat value={newCount} label="to review" accent={newCount > 0} />
                </div>
                <div className="md:w-40 md:text-right">
                  {top ? (
                    <>
                      <p className="text-sm text-muted">Top match</p>
                      <p className="truncate font-semibold">
                        {top.candidate.fullName} <ScoreNumber total={top.match.total} className="ml-1" />
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted">No applicants yet</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ value, label, accent }: { value: number; label: string; accent?: boolean }) {
  return (
    <div>
      <p className={`num text-2xl font-bold ${accent ? "text-accent" : ""}`}>{value}</p>
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}
