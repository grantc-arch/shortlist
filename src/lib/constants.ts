import type { ApplicationStatus, QualificationLevel } from "@/db/schema";

export const QUALIFICATIONS: { value: QualificationLevel; label: string }[] = [
  { value: "none", label: "No formal qualification" },
  { value: "matric", label: "Matric (NSC)" },
  { value: "certificate", label: "Higher certificate" },
  { value: "diploma", label: "Diploma" },
  { value: "degree", label: "Bachelor's degree" },
  { value: "honours", label: "Honours degree" },
  { value: "masters", label: "Master's degree or higher" },
];

export const qualificationLabel = (q: QualificationLevel) =>
  QUALIFICATIONS.find((x) => x.value === q)?.label ?? q;

export const CITIES = [
  "Cape Town",
  "Stellenbosch",
  "Paarl",
  "Somerset West",
  "George",
  "Johannesburg",
  "Pretoria",
  "Durban",
  "Gqeberha",
  "Bloemfontein",
  "East London",
  "Other",
] as const;

// Pairs of places close enough to commute between daily.
export const COMMUTABLE: [string, string][] = [
  ["Cape Town", "Stellenbosch"],
  ["Cape Town", "Paarl"],
  ["Cape Town", "Somerset West"],
  ["Stellenbosch", "Paarl"],
  ["Stellenbosch", "Somerset West"],
  ["Johannesburg", "Pretoria"],
];

export const WORKPLACE_LABELS = {
  on_site: "On site",
  hybrid: "Hybrid",
  remote: "Remote",
} as const;

export const EMPLOYMENT_LABELS = {
  full_time: "Full time",
  part_time: "Part time",
  contract: "Contract",
  internship: "Internship",
} as const;

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  new: "New",
  shortlisted: "Shortlisted",
  interview: "Interview",
  declined: "Not progressing",
  hired: "Hired",
};

export const STATUS_ORDER: ApplicationStatus[] = ["new", "shortlisted", "interview", "hired", "declined"];

export const MAX_CV_BYTES = 2 * 1024 * 1024;
