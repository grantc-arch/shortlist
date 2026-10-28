import type { Candidate as FullCandidate, Job } from "@/db/schema";

type Candidate = Omit<FullCandidate, "cvData">;
import type { CandidateForMatching, JobForMatching } from "./matching";

const rand = new Intl.NumberFormat("en-ZA", { maximumFractionDigits: 0 });

export function formatSalary(min: number | null, max: number | null): string | null {
  if (!min && !max) return null;
  if (min && max && max !== min) return `R${rand.format(min)} – R${rand.format(max)} a month`;
  return `R${rand.format((min || max)!)} a month`;
}

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(`${d.slice(0, 10)}T00:00:00`) : d;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function timeAgo(d: Date): string {
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return formatDate(d);
}

export const jobForMatching = (j: Job): JobForMatching => ({
  city: j.city,
  lat: j.lat,
  lng: j.lng,
  workplace: j.workplace,
  startDate: j.startDate,
  minQualification: j.minQualification,
  fieldKeywords: j.fieldKeywords,
  minYearsExperience: j.minYearsExperience,
  skills: j.skills,
  mustHaves: j.mustHaves,
  weights: j.weights,
});

export const candidateForMatching = (c: Candidate): CandidateForMatching => ({
  city: c.city,
  lat: c.lat,
  lng: c.lng,
  willingToRelocate: c.willingToRelocate,
  qualificationLevel: c.qualificationLevel,
  fieldOfStudy: c.fieldOfStudy,
  yearsExperience: c.yearsExperience,
  skills: c.skills,
  availableFrom: c.availableFrom,
});

/** A profile is ready to apply with once these are filled in. */
export function profileGaps(c: Candidate | undefined | null): string[] {
  if (!c) return ["your profile"];
  const gaps: string[] = [];
  if (!c.phone) gaps.push("phone number");
  if (!c.city) gaps.push("city");
  if (!c.fieldOfStudy && c.qualificationLevel !== "none" && c.qualificationLevel !== "matric") gaps.push("field of study");
  if (c.skills.length === 0) gaps.push("skills");
  if (!c.availableFrom) gaps.push("availability date");
  if (!c.cvFileName) gaps.push("CV");
  if (!c.popiaConsentAt) gaps.push("consent to share your details");
  return gaps;
}
