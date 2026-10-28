import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getJob, getReport } from "@/lib/queries";
import { ReportForm } from "./report-form";

export const metadata: Metadata = { title: "Report a job", robots: { index: false } };

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const { id } = await params;
  const { done } = await searchParams;
  const session = await requireUser(`/jobs/${id}/report`);
  const row = await getJob(id);
  if (!row || row.job.employerId === session.userId) notFound();
  const already = await getReport(id, session.userId);

  return (
    <div className="mx-auto max-w-xl">
      <Link href={`/jobs/${id}`} className="text-sm text-muted hover:text-ink">
        Back to the job
      </Link>
      <h1 className="mt-2 text-3xl font-bold">Report this job</h1>
      <p className="mt-1 text-ink-2">
        {row.job.title} at {row.employer.companyName}
      </p>

      {done || already ? (
        <div role="status" className="mt-6 rounded-md border border-good/30 bg-good/10 px-4 py-3 text-ink">
          <p className="font-semibold">Thanks, your report has been sent.</p>
          <p className="mt-1 text-sm text-ink-2">
            Jobs reported by several people are hidden until they've been reviewed. If you've already paid money or shared
            bank details, contact your bank straight away, and you can report the scam to the South African Police
            Service.
          </p>
          <Link href="/jobs" className="btn mt-3">
            Back to jobs
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-4 max-w-prose text-sm text-ink-2">
            Reports are private: the employer isn't told who reported them. Legitimate employers never ask you to pay to
            apply, or for your bank details before an offer.
          </p>
          <ReportForm jobId={id} />
        </>
      )}
    </div>
  );
}
