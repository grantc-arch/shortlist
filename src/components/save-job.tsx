"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { setJobSaved } from "@/app/actions/candidate";

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
      <path d="M4 2.5h8a.5.5 0 0 1 .5.5v10.6a.3.3 0 0 1-.48.24L8 10.9l-4.02 2.94a.3.3 0 0 1-.48-.24V3a.5.5 0 0 1 .5-.5Z" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Bookmark a job. Candidates toggle it in place; anyone else is sent to log in first.
 * `compact` is the icon-and-word version used in job lists.
 */
export function SaveJobButton({
  jobId,
  saved,
  signedInAsCandidate,
  compact = false,
}: {
  jobId: string;
  saved: boolean;
  signedInAsCandidate: boolean;
  compact?: boolean;
}) {
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [, startTransition] = useTransition();
  const className = compact
    ? "relative z-10 inline-flex items-center gap-1.5 rounded px-1.5 py-1 text-sm font-semibold text-ink-2 hover:bg-sunken hover:text-ink"
    : "btn w-full";
  const label = optimistic ? "Saved" : "Save";

  if (!signedInAsCandidate) {
    return (
      <Link href={`/login?next=/jobs/${jobId}`} className={className} aria-label="Log in to save this job">
        <BookmarkIcon filled={false} />
        Save
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={className}
      aria-pressed={optimistic}
      aria-label={optimistic ? "Saved. Remove from saved jobs" : "Save this job"}
      onClick={() =>
        startTransition(async () => {
          setOptimistic(!optimistic);
          await setJobSaved(jobId, !optimistic);
        })
      }
    >
      <BookmarkIcon filled={optimistic} />
      {label}
    </button>
  );
}
