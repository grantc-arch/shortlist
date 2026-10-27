import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getApplication, getCandidate, getJob } from "@/lib/queries";
import { scoreMatch } from "@/lib/matching";
import { candidateForMatching, jobForMatching, profileGaps } from "@/lib/format";
import { FitBreakdown } from "@/components/fit-bar";
import { ApplyForm } from "./apply-form";

export const metadata: Metadata = { title: "Apply" };

export default async function ApplyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole("candidate", `/jobs/${id}/apply`);
  const row = await getJob(id);
  if (!row || row.job.status !== "open") notFound();
  const { job, employer } = row;

  if (await getApplication(job.id, session.userId)) redirect(`/jobs/${job.id}`);
  const candidate = await getCandidate(session.userId);
  if (!candidate || profileGaps(candidate).length > 0) redirect(`/candidate/profile?next=/jobs/${job.id}/apply`);

  const match = scoreMatch(jobForMatching(job), candidateForMatching(candidate));
  // Pre-fill transport questions from the profile; everything else the candidate answers.
  const defaults = job.mustHaves.map((m) => (/transport/i.test(m) ? (candidate.hasOwnTransport ? "yes" : "no") : null));

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <div className="min-w-0 max-w-2xl">
        <Link href={`/jobs/${job.id}`} className="text-sm text-muted hover:text-ink">
          Back to the job
        </Link>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Apply for {job.title}</h1>
        <p className="mt-1 text-ink-2">{employer.companyName}</p>
        <p className="mt-4 max-w-prose text-sm text-ink-2">
          {employer.companyName} will see your profile, CV and the answers below.{" "}
          <Link href={`/candidate/profile?next=/jobs/${job.id}/apply`} className="link">
            Check your profile first
          </Link>{" "}
          if anything has changed.
        </p>
        <ApplyForm jobId={job.id} mustHaves={job.mustHaves} defaults={defaults} />
      </div>
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="panel p-5">
          <FitBreakdown match={match} heading="Your match" />
        </div>
      </aside>
    </div>
  );
}
