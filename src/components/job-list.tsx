import Link from "next/link";
import type { Job } from "@/db/schema";
import type { MatchResult } from "@/lib/matching";
import { EMPLOYMENT_LABELS, WORKPLACE_LABELS } from "@/lib/constants";
import { formatDate, formatSalary, timeAgo } from "@/lib/format";
import { daysUntilClose } from "@/lib/jobs";
import { FitBar, ScoreNumber } from "./fit-bar";
import { SaveJobButton } from "./save-job";

export interface JobListItem {
  job: Job;
  companyName: string;
  match?: MatchResult | null;
}

export function JobMeta({ job }: { job: Job }) {
  const salary = formatSalary(job.salaryMin, job.salaryMax);
  const parts = [
    job.city,
    WORKPLACE_LABELS[job.workplace],
    EMPLOYMENT_LABELS[job.employmentType],
    salary,
    job.startDate ? `Starts ${formatDate(job.startDate)}` : null,
  ].filter(Boolean);
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
      {parts.map((p) => (
        <li key={p}>{p}</li>
      ))}
    </ul>
  );
}

/** "Closes today" / "Closes in 3 days", for jobs closing within a week. */
export function ClosingSoon({ closesOn }: { closesOn: string | null }) {
  const days = daysUntilClose(closesOn);
  if (days === null || days < 0 || days > 7) return null;
  return (
    <span className="font-semibold text-warn">
      {days === 0 ? "Closes today" : days === 1 ? "Closes tomorrow" : `Closes in ${days} days`}
    </span>
  );
}

export function JobList({
  items,
  savedIds,
  signedInAsCandidate = false,
}: {
  items: JobListItem[];
  /** Pass to show a Save button on each job. */
  savedIds?: Set<string>;
  signedInAsCandidate?: boolean;
}) {
  return (
    <ul className="list divide-y divide-line">
      {items.map(({ job, companyName, match }) => (
        <li key={job.id} className="relative grid gap-4 p-5 sm:grid-cols-[1fr_11rem] sm:items-center">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold">
              <Link href={`/jobs/${job.id}`} className="after:absolute after:inset-0 hover:underline">
                {job.title}
              </Link>
            </h3>
            <p className="text-ink-2">
              {companyName}
              <span className="text-muted"> posted {timeAgo(job.createdAt)}</span>
            </p>
            <div className="mt-2">
              <JobMeta job={job} />
            </div>
            {(savedIds || daysUntilClose(job.closesOn) !== null) && (
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                {savedIds && (
                  <span className="-ml-1.5">
                    <SaveJobButton jobId={job.id} saved={savedIds.has(job.id)} signedInAsCandidate={signedInAsCandidate} compact />
                  </span>
                )}
                <ClosingSoon closesOn={job.closesOn} />
              </div>
            )}
          </div>
          {match && (
            <div className="sm:text-right">
              <div className="flex items-baseline justify-between sm:justify-end sm:gap-2">
                <span className="text-sm text-muted">Your match</span>
                <ScoreNumber total={match.total} className="text-2xl" />
              </div>
              <div className="mt-1.5">
                <FitBar criteria={match.criteria} size="sm" />
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
