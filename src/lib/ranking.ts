import "server-only";
import type { Job } from "@/db/schema";
import { applicantsForJob } from "./queries";
import { scoreMatch } from "./matching";
import { candidateForMatching, jobForMatching } from "./format";

/**
 * Applicants for a job, scored and ranked: everyone who meets all the
 * must-haves first, then by match score, then by who applied first.
 */
export async function rankedApplicants(job: Job) {
  const rows = await applicantsForJob(job.id);
  const j = jobForMatching(job);
  return rows
    .map((r) => ({ ...r, match: scoreMatch(j, candidateForMatching(r.candidate), r.application.mustHaveAnswers) }))
    .sort(
      (a, b) =>
        Number(b.match.mustHavesMet) - Number(a.match.mustHavesMet) ||
        b.match.total - a.match.total ||
        a.application.createdAt.getTime() - b.application.createdAt.getTime(),
    );
}

export type RankedApplicant = Awaited<ReturnType<typeof rankedApplicants>>[number];
