/**
 * "Similar jobs": ranks other open jobs by how much they share with the one being viewed.
 * Shared skills count most, then words in the title, the field of study asked for, and being nearby.
 */
import { skillsMatch } from "./matching";
import { COMMUTE_KM, coordsFor, distanceKm } from "./places";

export interface SimilarityJob {
  id: string;
  title: string;
  skills: string[];
  fieldKeywords: string[];
  city: string;
  lat?: number | null;
  lng?: number | null;
  workplace: "on_site" | "hybrid" | "remote";
}

// Words that say how senior a job is, not what it is.
const STOP_WORDS = new Set(["and", "the", "for", "with", "junior", "senior", "lead", "head", "trainee", "graduate"]);

export function titleWords(title: string): string[] {
  return [...new Set(title.toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 3 && !STOP_WORDS.has(w)))];
}

// "admin" ~ "administrator", "market" ~ "marketing".
const wordsMatch = (a: string, b: string) => a === b || (Math.min(a.length, b.length) >= 4 && (a.startsWith(b) || b.startsWith(a)));

const share = (a: string[], b: string[], same: (x: string, y: string) => boolean) => {
  if (a.length === 0 || b.length === 0) return 0;
  const matched = a.filter((x) => b.some((y) => same(x, y))).length;
  return Math.min(1, matched / Math.min(a.length, b.length));
};

export function similarity(a: SimilarityJob, b: SimilarityJob): number {
  const skills = share(a.skills, b.skills, skillsMatch);
  const title = share(titleWords(a.title), titleWords(b.title), wordsMatch);
  const field = share(a.fieldKeywords, b.fieldKeywords, skillsMatch) > 0 ? 1 : 0;
  // Being nearby only helps a job that's related in some other way.
  if (skills === 0 && title === 0 && field === 0) return 0;
  const from = coordsFor(a);
  const to = coordsFor(b);
  const near =
    a.workplace === "remote" || b.workplace === "remote"
      ? 1
      : from && to
        ? distanceKm(from, to) <= COMMUTE_KM
          ? 1
          : 0
        : a.city.toLowerCase() === b.city.toLowerCase()
          ? 1
          : 0;
  return 0.4 * skills + 0.35 * title + 0.15 * field + 0.1 * near;
}

export const SIMILAR_MIN_SCORE = 0.2;

/** The most similar jobs to `target`, best first. */
export function similarJobs<T extends { job: SimilarityJob }>(target: SimilarityJob, others: T[], limit = 3): T[] {
  return others
    .filter((o) => o.job.id !== target.id)
    .map((o) => ({ o, score: similarity(target, o.job) }))
    .filter((x) => x.score >= SIMILAR_MIN_SCORE)
    .sort((x, y) => y.score - x.score)
    .slice(0, limit)
    .map((x) => x.o);
}
