import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { openReports, removedJobs } from "@/lib/queries";
import { isAdmin } from "@/lib/site";
import { reportReasonLabel } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { removeJob, restoreJob } from "@/app/actions/admin";

export const metadata: Metadata = { title: "Reported jobs", robots: { index: false } };

export default async function AdminPage() {
  const session = await getSession();
  if (!session || !isAdmin(session.email)) notFound();
  const reports = await openReports();
  const byJob = new Map<string, typeof reports>();
  for (const r of reports) byJob.set(r.job.id, [...(byJob.get(r.job.id) ?? []), r]);
  const removed = await removedJobs();

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold sm:text-4xl">Reported jobs</h1>
      <p className="mt-1 text-ink-2">
        Jobs reported by three or more people are hidden until you restore or remove them.
      </p>

      {byJob.size === 0 ? (
        <p className="box mt-6 p-6 text-ink-2">Nothing to review.</p>
      ) : (
        <ul className="list mt-6 divide-y divide-line">
          {[...byJob.values()].map((list) => {
            const { job, companyName } = list[0];
            return (
              <li key={job.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/jobs/${job.id}`} className="text-lg font-semibold hover:underline">
                      {job.title}
                    </Link>
                    <p className="text-ink-2">
                      {companyName}.{" "}
                      <span className={job.hiddenAt ? "font-semibold text-bad" : "text-muted"}>
                        {job.hiddenAt ? "Hidden" : "Still live"}, {list.length} {list.length === 1 ? "report" : "reports"}
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <form action={restoreJob}>
                      <input type="hidden" name="jobId" value={job.id} />
                      <button className="btn py-1.5">{job.hiddenAt ? "Restore job" : "Dismiss reports"}</button>
                    </form>
                    <form action={removeJob}>
                      <input type="hidden" name="jobId" value={job.id} />
                      <button className="btn btn-primary py-1.5">Remove job</button>
                    </form>
                  </div>
                </div>
                <ul className="mt-3 space-y-2 text-sm">
                  {list.map(({ report, reporterEmail }) => (
                    <li key={report.id} className="rounded-md bg-sunken px-3 py-2">
                      <p className="font-semibold">{reportReasonLabel(report.reason)}</p>
                      {report.details && <p className="whitespace-pre-line text-ink-2">{report.details}</p>}
                      <p className="text-muted">
                        {reporterEmail}, {formatDate(report.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}

      {removed.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold">Removed jobs</h2>
          <ul className="list mt-3 divide-y divide-line">
            {removed.map(({ job, companyName }) => (
              <li key={job.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <span>
                  <Link href={`/jobs/${job.id}`} className="font-semibold hover:underline">
                    {job.title}
                  </Link>
                  <span className="text-ink-2">, {companyName}</span>
                </span>
                <form action={restoreJob}>
                  <input type="hidden" name="jobId" value={job.id} />
                  <button className="btn py-1.5">Restore job</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
