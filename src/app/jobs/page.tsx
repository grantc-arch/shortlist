import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getCandidate, listOpenJobs } from "@/lib/queries";
import { scoreMatch } from "@/lib/matching";
import { candidateForMatching, jobForMatching } from "@/lib/format";
import { CITIES } from "@/lib/constants";
import { JobList } from "@/components/job-list";

export const metadata: Metadata = { title: "Jobs" };

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; city?: string; sort?: string }>;
}) {
  const { q = "", city = "", sort = "" } = await searchParams;
  const session = await getSession();
  const candidate = session?.role === "candidate" ? await getCandidate(session.userId) : null;

  const rows = await listOpenJobs({ q: q.trim() || undefined, city: city || undefined });
  let items = rows.map((r) => ({
    ...r,
    match: candidate ? scoreMatch(jobForMatching(r.job), candidateForMatching(candidate)) : null,
  }));
  const sortByMatch = !!candidate && sort !== "newest";
  if (sortByMatch) items = items.sort((a, b) => (b.match?.total ?? 0) - (a.match?.total ?? 0));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Open jobs</h1>
          <p className="mt-1 text-ink-2">
            {rows.length} {rows.length === 1 ? "role" : "roles"}
            {candidate ? (sortByMatch ? ", best match first" : ", newest first") : ""}
          </p>
        </div>
        <form className="flex w-full flex-wrap gap-2 sm:w-auto" role="search">
          <label className="sr-only" htmlFor="q">Search jobs</label>
          <input id="q" name="q" defaultValue={q} placeholder="Job title, company or keyword" className="input min-w-0 flex-1 sm:w-64" />
          <label className="sr-only" htmlFor="city">City</label>
          <select id="city" name="city" defaultValue={city} className="input w-auto">
            <option value="">All cities</option>
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          {candidate && (
            <>
              <label className="sr-only" htmlFor="sort">Sort</label>
              <select id="sort" name="sort" defaultValue={sortByMatch ? "match" : "newest"} className="input w-auto">
                <option value="match">Best match</option>
                <option value="newest">Newest</option>
              </select>
            </>
          )}
          <button className="btn">Search</button>
        </form>
      </div>

      {!candidate && (
        <p className="mt-6 rounded-md border border-line bg-sunken px-4 py-3 text-sm text-ink-2">
          {session?.role === "employer" ? (
            "You're signed in as an employer. Candidates see a match score on every job."
          ) : (
            <>
              <Link href="/signup" className="link font-semibold">Create a profile</Link> to see how well you match each
              job before you apply.
            </>
          )}
        </p>
      )}

      <div className="mt-6">
        {items.length > 0 ? (
          <JobList items={items} />
        ) : (
          <div className="panel p-8 text-center">
            <p className="font-semibold">No open jobs match that search.</p>
            <p className="mt-1 text-ink-2">
              Try a broader keyword or <Link href="/jobs" className="link">clear the filters</Link>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
