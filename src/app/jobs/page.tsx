import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getCandidate, listOpenJobs, savedJobIds, type JobFilters } from "@/lib/queries";
import { scoreMatch } from "@/lib/matching";
import { candidateForMatching, jobForMatching } from "@/lib/format";
import { CITIES, EMPLOYMENT_LABELS, WORKPLACE_LABELS } from "@/lib/constants";
import { JobList } from "@/components/job-list";
import { AutoSubmitSelect } from "@/components/auto-submit";

export const metadata: Metadata = { title: "Jobs" };

const SALARIES = [5000, 10000, 15000, 20000, 30000, 40000];
const POSTED = [
  { days: 1, label: "Last 24 hours" },
  { days: 3, label: "Last 3 days" },
  { days: 7, label: "Last week" },
  { days: 30, label: "Last month" },
];
const SORTS = { match: "Best match", newest: "Newest", salary: "Highest salary", closing: "Closing soonest" } as const;
type Sort = keyof typeof SORTS;

type Params = { q?: string; city?: string; workplace?: string; type?: string; salary?: string; posted?: string; sort?: string };

const pick = <T extends string>(value: string | undefined, allowed: readonly T[]) =>
  allowed.includes(value as T) ? (value as T) : undefined;
const pay = (j: { salaryMin: number | null; salaryMax: number | null }) => Math.max(j.salaryMin ?? 0, j.salaryMax ?? 0);

export default async function JobsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const filters: JobFilters = {
    q: q || undefined,
    city: params.city || undefined,
    workplace: pick(params.workplace, Object.keys(WORKPLACE_LABELS) as (keyof typeof WORKPLACE_LABELS)[]),
    type: pick(params.type, Object.keys(EMPLOYMENT_LABELS) as (keyof typeof EMPLOYMENT_LABELS)[]),
    minSalary: SALARIES.find((s) => String(s) === params.salary),
    postedDays: POSTED.find((p) => String(p.days) === params.posted)?.days,
  };
  const session = await getSession();
  const candidate = session?.role === "candidate" ? await getCandidate(session.userId) : null;
  const saved = candidate ? await savedJobIds(candidate.userId) : new Set<string>();

  const sortOptions = (Object.keys(SORTS) as Sort[]).filter((s) => s !== "match" || candidate);
  const sort: Sort = pick(params.sort, sortOptions) ?? (candidate ? "match" : "newest");

  const rows = await listOpenJobs(filters);
  const items = rows.map((r) => ({
    ...r,
    match: candidate ? scoreMatch(jobForMatching(r.job), candidateForMatching(candidate)) : null,
  }));
  // Rows arrive newest first; the other orders keep that as the tie-break.
  if (sort === "match") items.sort((a, b) => (b.match?.total ?? 0) - (a.match?.total ?? 0));
  if (sort === "salary") items.sort((a, b) => pay(b.job) - pay(a.job));
  if (sort === "closing") items.sort((a, b) => (a.job.closesOn ?? "9999").localeCompare(b.job.closesOn ?? "9999"));

  const filtered = !!(filters.q || filters.city || filters.workplace || filters.type || filters.minSalary || filters.postedDays);

  return (
    <div>
      <h1 className="text-3xl font-bold sm:text-4xl">Open jobs</h1>
      <p className="mt-1 text-ink-2">
        {rows.length} {rows.length === 1 ? "role" : "roles"}, {SORTS[sort].toLowerCase()} first
      </p>

      <form className="mt-5 space-y-3" role="search">
        <div className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="q">Search jobs</label>
          <input id="q" name="q" defaultValue={q} placeholder="Job title, company or keyword" className="input min-w-0 flex-[2_1_16rem]" />
          <label className="sr-only" htmlFor="city">Location</label>
          <select id="city" name="city" defaultValue={filters.city ?? ""} className="input flex-[1_1_10rem]">
            <option value="">All locations</option>
            {CITIES.filter((c) => c !== "Other").map((c) => (
              <option key={c} value={c}>Near {c}</option>
            ))}
          </select>
          <button className="btn btn-primary">Search</button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filter name="workplace" label="Workplace" value={filters.workplace} options={Object.entries(WORKPLACE_LABELS)} any="Any workplace" />
          <Filter name="type" label="Job type" value={filters.type} options={Object.entries(EMPLOYMENT_LABELS)} any="Any job type" />
          <Filter
            name="salary"
            label="Minimum salary"
            value={filters.minSalary ? String(filters.minSalary) : undefined}
            options={SALARIES.map((s) => [String(s), `R${s.toLocaleString("en-ZA")}+ a month`])}
            any="Any salary"
          />
          <Filter
            name="posted"
            label="Date posted"
            value={filters.postedDays ? String(filters.postedDays) : undefined}
            options={POSTED.map((p) => [String(p.days), p.label])}
            any="Any time"
          />
          <span className="flex items-center gap-2 sm:ml-auto">
            <label htmlFor="sort" className="text-sm text-muted">Sort</label>
            <AutoSubmitSelect id="sort" name="sort" defaultValue={sort} className="input w-auto py-1.5 text-sm">
              {sortOptions.map((s) => (
                <option key={s} value={s}>{SORTS[s]}</option>
              ))}
            </AutoSubmitSelect>
          </span>
        </div>
        {filtered && (
          <p className="text-sm">
            <Link href={sort === (candidate ? "match" : "newest") ? "/jobs" : `/jobs?sort=${sort}`} className="link">
              Clear filters
            </Link>
          </p>
        )}
      </form>

      {!candidate ? (
        <p className="mt-6 rounded-md border border-line bg-sunken px-4 py-3 text-sm text-ink-2">
          {session?.role === "employer" ? (
            "You're signed in as an employer. Candidates see a match score on every job."
          ) : (
            <>
              <Link href="/signup" className="link font-semibold">Create a profile</Link> to see how well you match each
              job before you apply, save jobs and get new matches by email.
            </>
          )}
        </p>
      ) : (
        candidate.alertFrequency === "off" && (
          <p className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-sunken px-4 py-3 text-sm text-ink-2">
            <span>Get an email when a new job scores well against your profile.</span>
            <Link href="/settings#alerts" className="btn py-1.5">Set up job alerts</Link>
          </p>
        )
      )}

      <div className="mt-6">
        {items.length > 0 ? (
          <JobList items={items} savedIds={saved} signedInAsCandidate={!!candidate} />
        ) : (
          <div className="box p-8 text-center">
            <p className="font-semibold">No open jobs match that search.</p>
            <p className="mt-1 text-ink-2">
              {filters.minSalary ? "Jobs that don't list a salary are left out when you filter by salary. " : ""}
              Try a broader keyword or <Link href="/jobs" className="link">clear the filters</Link>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Filter({
  name,
  label,
  value,
  options,
  any,
}: {
  name: string;
  label: string;
  value: string | undefined;
  options: [string, string][];
  any: string;
}) {
  return (
    <>
      <label className="sr-only" htmlFor={name}>{label}</label>
      <AutoSubmitSelect
        id={name}
        name={name}
        defaultValue={value ?? ""}
        className={`input w-auto py-1.5 text-sm ${value ? "border-ink font-semibold" : ""}`}
      >
        <option value="">{any}</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </AutoSubmitSelect>
    </>
  );
}
