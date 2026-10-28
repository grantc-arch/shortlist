import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getJob, talentPoolFor } from "@/lib/queries";
import { scoreMatch } from "@/lib/matching";
import { formatDate, jobForMatching } from "@/lib/format";
import { qualificationLabel } from "@/lib/constants";
import { closedReason } from "@/lib/jobs";
import { FitBar, ScoreNumber } from "@/components/fit-bar";
import { InviteForm } from "./invite-form";

export const metadata: Metadata = { title: "Find candidates" };

const SHOW = 30;

export default async function TalentPoolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole("employer", `/employer/jobs/${id}/candidates`);
  const row = await getJob(id);
  if (!row || row.job.employerId !== session.userId) notFound();
  const { job } = row;
  const closed = closedReason(job);

  const pool = (await talentPoolFor(job.id))
    // Only the main city is shown (not the suburb), including in the location reason.
    .map((p) => ({ ...p, city: p.city.split(",").pop()!.trim() }))
    .map((p) => ({ ...p, match: scoreMatch(jobForMatching(job), p) }))
    .sort((a, b) => b.match.total - a.match.total);
  const shown = pool.slice(0, SHOW);

  return (
    <div>
      <Link href={`/employer/jobs/${job.id}`} className="text-sm text-muted hover:text-ink">
        Applicants for {job.title}
      </Link>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Find candidates</h1>
      <p className="mt-2 max-w-prose text-ink-2">
        People who've joined the talent pool and haven't applied yet, scored against {job.title}. Names, contact details
        and CVs stay hidden until someone accepts your invitation and applies. They'll answer your must-haves then.
      </p>

      {closed ? (
        <p className="box mt-6 p-6 text-ink-2">This job isn't taking applications, so you can't invite anyone to it.</p>
      ) : shown.length === 0 ? (
        <p className="box mt-6 p-6 text-ink-2">
          Nobody in the talent pool yet. Candidates join it from their settings, so check back as more people sign up.
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm text-muted">
            {pool.length > SHOW ? `The ${SHOW} best matches of ${pool.length}` : `${pool.length} ${pool.length === 1 ? "person" : "people"}`}, best match first.
          </p>
          <ul className="list mt-2 divide-y divide-line">
            {shown.map((p) => (
              <li key={p.userId} className="grid gap-x-8 gap-y-4 p-5 md:grid-cols-[1fr_14rem]">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">
                    {qualificationLabel(p.qualificationLevel)}
                    {p.fieldOfStudy && ` in ${p.fieldOfStudy}`}
                  </h2>
                  <p className="text-sm text-ink-2">
                    {p.yearsExperience} {p.yearsExperience === 1 ? "year's" : "years'"} experience. Based in {p.city}
                    {p.willingToRelocate ? ", willing to relocate" : ""}. Available from {formatDate(p.availableFrom)}.
                    {p.hasOwnTransport ? " Has own transport." : ""}
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {p.skills.map((s) => (
                      <li key={s} className="rounded bg-sunken px-2 py-0.5 text-sm text-ink-2">
                        {s}
                      </li>
                    ))}
                  </ul>
                  <ul className="mt-3 space-y-0.5 text-sm text-ink-2">
                    {p.match.criteria.map((c) => (
                      <li key={c.key} className="flex items-baseline gap-2">
                        <span className="size-2 shrink-0 rounded-[2px]" style={{ background: `var(--fit-${c.key})` }} />
                        <span>
                          <span className="font-semibold text-ink">{c.label}:</span> {c.detail}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-muted">Match</span>
                    <ScoreNumber total={p.match.total} className="text-2xl" />
                  </div>
                  <FitBar criteria={p.match.criteria} />
                  <div className="mt-4">
                    {p.invitedAt ? (
                      <p className="text-sm font-semibold text-good">Invited {formatDate(p.invitedAt)}</p>
                    ) : (
                      <InviteForm jobId={job.id} candidateId={p.userId} />
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
