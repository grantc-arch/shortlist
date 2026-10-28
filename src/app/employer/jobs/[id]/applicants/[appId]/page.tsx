import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getJob } from "@/lib/queries";
import { rankedApplicants } from "@/lib/ranking";
import { qualificationLabel } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { FitBreakdown } from "@/components/fit-bar";
import { StatusSelect } from "@/components/status-select";
import { StarRating } from "@/components/star-rating";
import { NotesForm } from "./notes-form";

export const metadata: Metadata = { title: "Applicant" };

export default async function ApplicantPage({ params }: { params: Promise<{ id: string; appId: string }> }) {
  const { id, appId } = await params;
  const session = await requireRole("employer", `/employer/jobs/${id}/applicants/${appId}`);
  const row = await getJob(id);
  if (!row || row.job.employerId !== session.userId) notFound();
  const { job } = row;

  const ranked = await rankedApplicants(job);
  const index = ranked.findIndex((a) => a.application.id === appId);
  if (index === -1) notFound();
  const { application: a, candidate: c, email, match } = ranked[index];
  const prev = ranked[index - 1];
  const next = ranked[index + 1];
  const base = `/employer/jobs/${job.id}/applicants`;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link href={`/employer/jobs/${job.id}`} className="text-muted hover:text-ink">
          All applicants for {job.title}
        </Link>
        <span className="flex gap-2">
          {prev && (
            <Link href={`${base}/${prev.application.id}`} className="btn py-1.5">
              Previous
            </Link>
          )}
          {next && (
            <Link href={`${base}/${next.application.id}`} className="btn py-1.5">
              Next
            </Link>
          )}
        </span>
      </div>

      <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-8">
          <header>
            <p className="num text-sm text-muted">
              Ranked {index + 1} of {ranked.length}
            </p>
            <h1 className="text-3xl font-bold sm:text-4xl">{c.fullName}</h1>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-ink-2">
              <li>
                <a className="link" href={`mailto:${email}?subject=${encodeURIComponent(`Your application: ${job.title}`)}`}>
                  {email}
                </a>
              </li>
              <li>
                <a className="link" href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}>
                  {c.phone}
                </a>
              </li>
              <li>{c.city}</li>
            </ul>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <StatusSelect applicationId={a.id} status={a.status} label="Application status" />
              {c.cvFileName && (
                <a className="btn" href={`/cv/${c.userId}`} target="_blank" rel="noreferrer">
                  Open CV
                </a>
              )}
            </div>
            <div className="mt-3">
              <StarRating applicationId={a.id} rating={a.rating} />
              <p className="mt-0.5 text-xs text-muted">Only you can see your rating and notes.</p>
            </div>
          </header>

          {c.summary && (
            <section className="max-w-prose">
              <h2 className="text-lg font-semibold">Summary</h2>
              <p className="mt-1 whitespace-pre-line text-ink-2">{c.summary}</p>
            </section>
          )}

          <section className="max-w-prose">
            <h2 className="text-lg font-semibold">Note to you</h2>
            {a.coverNote ? (
              <p className="mt-1 whitespace-pre-line text-ink-2">{a.coverNote}</p>
            ) : (
              <p className="mt-1 text-muted">No note included.</p>
            )}
          </section>

          {match.mustHaves.length > 0 && (
            <section className="max-w-prose">
              <h2 className="text-lg font-semibold">Must-haves</h2>
              <ul className="mt-2 divide-y divide-line rounded-md border border-line bg-surface">
                {match.mustHaves.map((m) => (
                  <li key={m.question} className="flex items-center justify-between gap-4 px-4 py-2.5">
                    <span>{m.question}</span>
                    <span className={`font-semibold ${m.answer ? "text-good" : "text-warn"}`}>{m.answer ? "Yes" : "No"}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="max-w-prose">
            <h2 className="text-lg font-semibold">Profile</h2>
            <dl className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-[11rem_1fr]">
              <dt className="font-semibold">Qualification</dt>
              <dd className="text-ink-2">
                {qualificationLabel(c.qualificationLevel)}
                {c.fieldOfStudy && `, ${c.fieldOfStudy}`}
              </dd>
              <dt className="font-semibold">Experience</dt>
              <dd className="text-ink-2">
                {c.yearsExperience} year{c.yearsExperience === 1 ? "" : "s"}
              </dd>
              <dt className="font-semibold">Available from</dt>
              <dd className="text-ink-2">{formatDate(c.availableFrom)}</dd>
              <dt className="font-semibold">Own transport</dt>
              <dd className="text-ink-2">{c.hasOwnTransport ? "Yes" : "No"}</dd>
              <dt className="font-semibold">Will relocate</dt>
              <dd className="text-ink-2">{c.willingToRelocate ? "Yes" : "No"}</dd>
              <dt className="font-semibold">Skills</dt>
              <dd>
                <ul className="flex flex-wrap gap-1.5">
                  {c.skills.map((s) => (
                    <li key={s} className="rounded bg-sunken px-2 py-0.5 text-sm text-ink-2">
                      {s}
                    </li>
                  ))}
                </ul>
              </dd>
              <dt className="font-semibold">Applied</dt>
              <dd className="text-ink-2">{formatDate(a.createdAt)}</dd>
            </dl>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="box p-5">
            <FitBreakdown match={match} />
          </div>
          <div className="box p-5">
            <NotesForm applicationId={a.id} notes={a.employerNotes} />
          </div>
        </aside>
      </div>
    </div>
  );
}
