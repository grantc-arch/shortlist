/**
 * Rules about whether a job is open, shared by the job board, job pages,
 * the apply flow and Google listing.
 */

export const SA_TIME_ZONE = "Africa/Johannesburg";

/** Today's date in South Africa as YYYY-MM-DD, so closing dates flip at local midnight. */
export function todayInSA(now: Date = new Date()): string {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export interface JobOpenness {
  status: "open" | "closed";
  closesOn: string | null;
}

/** A job takes applications while it's open and its closing date (inclusive) hasn't passed. */
export function isAcceptingApplications(job: JobOpenness, today: string = todayInSA()): boolean {
  return job.status === "open" && (!job.closesOn || job.closesOn >= today);
}

/** Why a job isn't taking applications, in words for the employer or candidate. */
export function closedReason(job: JobOpenness, today: string = todayInSA()): "closed" | "deadline" | null {
  if (job.status === "closed") return "closed";
  if (job.closesOn && job.closesOn < today) return "deadline";
  return null;
}
