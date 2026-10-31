"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";

const KEY = "shortlist:last-job-search";

/** Put on the job board: remembers the page, filters and sort, for BackToJobs. */
export function RememberJobSearch() {
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, location.pathname + location.search);
    } catch {
      // Storage blocked: the back link just goes to the first page.
    }
  });
  return null;
}

function readSaved(): string {
  try {
    const saved = sessionStorage.getItem(KEY);
    return saved?.startsWith("/jobs") ? saved : "/jobs";
  } catch {
    return "/jobs";
  }
}
const noSubscribe = () => () => {};

/** "Back to results", returning to the same page and filters of the job board. */
export function BackToJobs({ className }: { className?: string }) {
  // The server can't see this tab's storage, so it renders the plain link and the browser fills in the rest.
  const href = useSyncExternalStore(noSubscribe, readSaved, () => "/jobs");
  return (
    <Link href={href} className={className}>
      {href === "/jobs" ? "All jobs" : "Back to results"}
    </Link>
  );
}
