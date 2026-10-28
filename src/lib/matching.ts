/**
 * The matching engine: scores a candidate profile against a job.
 *
 * Every job has five criteria, each weighted by the employer. Each criterion
 * produces a fraction between 0 and 1 plus a plain-language reason, so both
 * sides can see *why* a score is what it is. Must-haves are separate yes/no
 * checks: failing one flags the application but never hides or rejects it —
 * the employer decides.
 */
import { COMMUTABLE } from "./constants";
import { COMMUTE_KM, LOCAL_KM, coordsFor, distanceKm } from "./places";

export const QUALIFICATION_ORDER = [
  "none",
  "matric",
  "certificate",
  "diploma",
  "degree",
  "honours",
  "masters",
] as const;
export type Qualification = (typeof QUALIFICATION_ORDER)[number];

export type CriterionKey = "qualification" | "experience" | "skills" | "location" | "availability";
export type Weights = Record<CriterionKey, number>;

export const CRITERIA: { key: CriterionKey; label: string }[] = [
  { key: "qualification", label: "Qualification" },
  { key: "experience", label: "Experience" },
  { key: "skills", label: "Skills" },
  { key: "location", label: "Location" },
  { key: "availability", label: "Availability" },
];

export const DEFAULT_WEIGHTS: Weights = {
  qualification: 25,
  experience: 20,
  skills: 30,
  location: 15,
  availability: 10,
};

export interface JobForMatching {
  city: string;
  lat?: number | null;
  lng?: number | null;
  workplace: "on_site" | "hybrid" | "remote";
  startDate: string | null; // YYYY-MM-DD
  minQualification: Qualification;
  fieldKeywords: string[];
  minYearsExperience: number;
  skills: string[];
  mustHaves: string[];
  weights: Weights;
}

export interface CandidateForMatching {
  city: string;
  lat?: number | null;
  lng?: number | null;
  willingToRelocate: boolean;
  qualificationLevel: Qualification;
  fieldOfStudy: string;
  yearsExperience: number;
  skills: string[];
  availableFrom: string | null; // YYYY-MM-DD
}

export interface CriterionResult {
  key: CriterionKey;
  label: string;
  weight: number;
  fraction: number; // 0..1
  points: number; // contribution to the 0..100 total
  detail: string;
}

export interface MatchResult {
  total: number; // 0..100
  criteria: CriterionResult[];
  mustHaves: { question: string; answer: boolean | null }[];
  mustHavesMet: boolean | null; // null when the candidate hasn't answered yet
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/** Two skills match if they're equal or one contains the other ("Excel" ~ "Microsoft Excel"). */
export function skillsMatch(a: string, b: string): boolean {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
}

function scoreQualification(job: JobForMatching, c: CandidateForMatching) {
  const required = QUALIFICATION_ORDER.indexOf(job.minQualification);
  const has = QUALIFICATION_ORDER.indexOf(c.qualificationLevel);
  const levelPart = required === 0 ? 1 : Math.min(1, has / required);

  const keywords = job.fieldKeywords.map(norm).filter(Boolean);
  const field = norm(c.fieldOfStudy);
  const matchedKeyword = keywords.find((k) => field.includes(k));
  const fieldPart = keywords.length === 0 ? 1 : matchedKeyword ? 1 : 0;

  const fraction = keywords.length === 0 ? levelPart : levelPart * 0.6 + fieldPart * 0.4;

  const levelText = has >= required ? "meets the level asked for" : "below the level asked for";
  const fieldText =
    keywords.length === 0
      ? ""
      : matchedKeyword
        ? `, field matches “${matchedKeyword}”`
        : `, field doesn't match ${keywords.map((k) => `“${k}”`).join(" or ")}`;
  return { fraction, detail: `${capitalise(levelText)}${fieldText}` };
}

function scoreExperience(job: JobForMatching, c: CandidateForMatching) {
  const need = job.minYearsExperience;
  const years = Math.max(0, c.yearsExperience);
  if (need <= 0) return { fraction: 1, detail: "No minimum experience asked for" };
  const fraction = Math.min(1, years / need);
  const yrs = (n: number) => `${n} year${n === 1 ? "" : "s"}`;
  return {
    fraction,
    detail:
      years >= need ? `${yrs(years)}, minimum is ${yrs(need)}` : `${yrs(years)} of the ${yrs(need)} asked for`,
  };
}

function scoreSkills(job: JobForMatching, c: CandidateForMatching) {
  if (job.skills.length === 0) return { fraction: 1, detail: "No specific skills listed" };
  const matched = job.skills.filter((s) => c.skills.some((cs) => skillsMatch(s, cs)));
  const missing = job.skills.filter((s) => !matched.includes(s));
  const fraction = matched.length / job.skills.length;
  const detail =
    missing.length === 0
      ? `Has all ${job.skills.length} listed skills`
      : `${matched.length} of ${job.skills.length} skills; missing ${missing.join(", ")}`;
  return { fraction, detail };
}

export function commutable(a: string, b: string): boolean {
  const x = norm(a);
  const y = norm(b);
  return COMMUTABLE.some(([p, q]) => (norm(p) === x && norm(q) === y) || (norm(p) === y && norm(q) === x));
}

function scoreLocation(job: JobForMatching, c: CandidateForMatching) {
  if (job.workplace === "remote") return { fraction: 1, detail: "Remote role" };
  const where = c.city || "an unknown place";

  // With coordinates for both, use the real distance.
  const from = c.city ? coordsFor(c) : null;
  const to = coordsFor(job);
  if (from && to) {
    const km = Math.round(distanceKm(from, to));
    const away = km < 3 ? "close by" : `${km} km away`;
    if (km <= LOCAL_KM) return { fraction: 1, detail: `Based in ${where}, ${away}` };
    if (km <= COMMUTE_KM) return { fraction: 0.75, detail: `Based in ${where}, ${away}: within commuting distance` };
    if (c.willingToRelocate) return { fraction: 0.5, detail: `Based in ${where}, ${away}, willing to relocate` };
    return { fraction: 0, detail: `Based in ${where}, ${away}, not willing to relocate` };
  }

  // Otherwise compare place names.
  if (c.city && norm(c.city) === norm(job.city)) return { fraction: 1, detail: `Based in ${job.city}` };
  if (c.city && commutable(c.city, job.city))
    return { fraction: 0.75, detail: `Based in ${c.city}, within commuting distance` };
  if (c.willingToRelocate) return { fraction: 0.5, detail: `Based in ${where}, willing to relocate` };
  return { fraction: 0, detail: `Based in ${where}, not willing to relocate` };
}

const DAY_MS = 86_400_000;

function scoreAvailability(job: JobForMatching, c: CandidateForMatching) {
  if (!job.startDate) return { fraction: 1, detail: "No fixed start date" };
  if (!c.availableFrom) return { fraction: 0.5, detail: "Availability not given" };
  const gap = Math.round((Date.parse(c.availableFrom) - Date.parse(job.startDate)) / DAY_MS);
  if (gap <= 0) return { fraction: 1, detail: "Available by the start date" };
  if (gap <= 14) return { fraction: 0.7, detail: `Available ${gap} days after the start date` };
  if (gap <= 31) return { fraction: 0.4, detail: `Available ${gap} days after the start date` };
  return { fraction: 0.1, detail: `Available more than a month after the start date` };
}

const SCORERS: Record<CriterionKey, (j: JobForMatching, c: CandidateForMatching) => { fraction: number; detail: string }> = {
  qualification: scoreQualification,
  experience: scoreExperience,
  skills: scoreSkills,
  location: scoreLocation,
  availability: scoreAvailability,
};

export function scoreMatch(
  job: JobForMatching,
  candidate: CandidateForMatching,
  mustHaveAnswers: boolean[] | null = null,
): MatchResult {
  const totalWeight = CRITERIA.reduce((sum, { key }) => sum + Math.max(0, job.weights[key] ?? 0), 0) || 1;

  const criteria = CRITERIA.map(({ key, label }) => {
    const weight = Math.max(0, job.weights[key] ?? 0);
    const { fraction, detail } = SCORERS[key](job, candidate);
    return { key, label, weight, fraction, points: (weight / totalWeight) * fraction * 100, detail };
  });

  const total = Math.round(criteria.reduce((sum, c) => sum + c.points, 0));

  const mustHaves = job.mustHaves.map((question, i) => ({
    question,
    answer: mustHaveAnswers ? (mustHaveAnswers[i] ?? false) : null,
  }));
  const mustHavesMet = mustHaveAnswers ? mustHaves.every((m) => m.answer === true) : null;

  return { total, criteria, mustHaves, mustHavesMet };
}

/** Weights from a form: non-negative whole numbers; falls back to defaults if all are zero. */
export function normaliseWeights(input: Partial<Record<CriterionKey, number>>): Weights {
  const w = Object.fromEntries(
    CRITERIA.map(({ key }) => [key, Math.max(0, Math.round(Number(input[key]) || 0))]),
  ) as Weights;
  return Object.values(w).some((v) => v > 0) ? w : { ...DEFAULT_WEIGHTS };
}

/** Splits comma- or newline-separated text into a clean, de-duplicated list. */
export function parseList(text: string): string[] {
  return dedupe(text.split(/[,\n]/));
}

/** Like parseList, but one item per line, so items can contain commas. */
export function parseLines(text: string): string[] {
  return dedupe(text.split(/\r?\n/));
}

function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  return items
    .map((s) => s.trim())
    .filter((s) => {
      const k = norm(s);
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
