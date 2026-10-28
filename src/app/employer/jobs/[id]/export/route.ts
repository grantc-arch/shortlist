import { getSession } from "@/lib/auth";
import { getJob } from "@/lib/queries";
import { rankedApplicants } from "@/lib/ranking";
import { qualificationLabel, STATUS_LABELS } from "@/lib/constants";
import { toCsv, slug, type Cell } from "@/lib/csv";
import { todayInSA } from "@/lib/jobs";

/** Every applicant for a job as a spreadsheet, in ranked order. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const row = await getJob(id);
  if (!session || session.role !== "employer" || !row || row.job.employerId !== session.userId) {
    return new Response("Not found", { status: 404 });
  }
  const { job } = row;
  const ranked = await rankedApplicants(job);
  const criteria = ranked[0]?.match.criteria ?? [];

  const header: Cell[] = [
    "Rank",
    "Name",
    "Email",
    "Phone",
    "Location",
    "Qualification",
    "Field of study",
    "Years of experience",
    "Skills",
    "Available from",
    "Own transport",
    "Willing to relocate",
    "Match %",
    ...criteria.map((c) => `${c.label} points (of ${Math.round((c.weight / criteria.reduce((s, x) => s + x.weight, 0)) * 100)})`),
    "Meets every must-have",
    ...job.mustHaves,
    "Status",
    "Your rating",
    "Applied on",
    "Note to you",
    "Your notes",
  ];
  const rows: Cell[][] = ranked.map((a, i) => [
    i + 1,
    a.candidate.fullName,
    a.email,
    a.candidate.phone,
    a.candidate.city,
    qualificationLabel(a.candidate.qualificationLevel),
    a.candidate.fieldOfStudy,
    a.candidate.yearsExperience,
    a.candidate.skills.join(", "),
    a.candidate.availableFrom,
    a.candidate.hasOwnTransport,
    a.candidate.willingToRelocate,
    a.match.total,
    ...a.match.criteria.map((c) => Math.round(c.points)),
    a.match.mustHavesMet,
    ...a.match.mustHaves.map((m) => m.answer),
    STATUS_LABELS[a.application.status],
    a.application.rating,
    a.application.createdAt.toISOString().slice(0, 10),
    a.application.coverNote,
    a.application.employerNotes,
  ]);

  return new Response(toCsv([header, ...rows]), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${slug(job.title)}-applicants-${todayInSA()}.csv"`,
      // Applicant details: never cache.
      "cache-control": "private, no-store",
    },
  });
}
