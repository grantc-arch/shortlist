import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getCandidate, getCompany, listOpenJobs, savedJobIds } from "@/lib/queries";
import { scoreMatch } from "@/lib/matching";
import { candidateForMatching, jobForMatching } from "@/lib/format";
import { googleJobsEnabled } from "@/lib/site";
import { JobList } from "@/components/job-list";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const company = await getCompany((await params).id);
  if (!company) return { title: "Company not found" };
  const description = (company.about || `Jobs at ${company.companyName} in ${company.city}.`).slice(0, 200);
  return {
    title: `Jobs at ${company.companyName}`,
    description,
    alternates: { canonical: `/companies/${company.userId}` },
    robots: company.isDemo || !googleJobsEnabled() ? { index: false, follow: true } : undefined,
    openGraph: { title: `Jobs at ${company.companyName}`, description, siteName: "Shortlist", url: `/companies/${company.userId}` },
  };
}

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const company = await getCompany((await params).id);
  if (!company) notFound();
  const session = await getSession();
  const candidate = session?.role === "candidate" ? await getCandidate(session.userId) : null;
  const saved = candidate ? await savedJobIds(candidate.userId) : new Set<string>();
  const jobs = (await listOpenJobs({ employerId: company.userId })).map((r) => ({
    ...r,
    match: candidate ? scoreMatch(jobForMatching(r.job), candidateForMatching(candidate)) : null,
  }));
  const isOwner = session?.userId === company.userId;
  let website: URL | null = null;
  try {
    website = company.website ? new URL(company.website) : null;
  } catch {
    website = null;
  }

  return (
    <div>
      {company.isDemo && (
        <p className="mb-5 rounded-md border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-ink">
          This is a fictional company, there to show how Shortlist works. Its jobs aren't real.
        </p>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">{company.companyName}</h1>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-ink-2">
            <li>{company.city}</li>
            {website && (
              <li>
                <a href={website.toString()} className="link" rel="nofollow ugc noopener" target="_blank">
                  {website.hostname.replace(/^www\./, "")}
                </a>
              </li>
            )}
          </ul>
        </div>
        {isOwner && (
          <Link href="/employer/profile" className="btn">
            Edit company details
          </Link>
        )}
      </div>
      {company.about && <p className="mt-5 max-w-prose whitespace-pre-line text-ink-2">{company.about}</p>}

      <section className="mt-10">
        <h2 className="text-xl font-semibold">
          {jobs.length === 0 ? "No open jobs right now" : `${jobs.length} open ${jobs.length === 1 ? "job" : "jobs"}`}
        </h2>
        <div className="mt-3">
          {jobs.length > 0 ? (
            <JobList items={jobs} savedIds={saved} signedInAsCandidate={!!candidate} />
          ) : (
            <p className="box p-6 text-ink-2">
              Check back later, or <Link href="/jobs" className="link">browse every open job</Link>.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
