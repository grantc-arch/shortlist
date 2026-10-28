import type { ApplicationStatus, QualificationLevel, ReportReason } from "@/db/schema";

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

// Benefits an employer can tick on a job. Stored by key, so labels can change.
export const BENEFITS = [
  { value: "medical_aid", label: "Medical aid" },
  { value: "retirement", label: "Pension or provident fund" },
  { value: "thirteenth_cheque", label: "13th cheque" },
  { value: "bonus", label: "Performance bonus" },
  { value: "transport", label: "Transport or travel allowance" },
  { value: "parking", label: "Parking" },
  { value: "phone", label: "Cellphone allowance" },
  { value: "flexible_hours", label: "Flexible hours" },
  { value: "extra_leave", label: "Extra leave" },
  { value: "training", label: "Training or study support" },
  { value: "laptop", label: "Laptop provided" },
  { value: "meals", label: "Meals provided" },
] as const;
export type BenefitKey = (typeof BENEFITS)[number]["value"];
export const BENEFIT_KEYS = BENEFITS.map((b) => b.value) as [BenefitKey, ...BenefitKey[]];
export const benefitLabels = (keys: string[]) =>
  BENEFITS.filter((b) => keys.includes(b.value)).map((b) => b.label);

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "asks_for_money", label: "It asks applicants to pay (a fee, training, a uniform, a deposit)" },
  { value: "asks_for_personal_info", label: "It asks for bank details, an ID number or other personal information up front" },
  { value: "fake", label: "The job or company looks fake or misleading" },
  { value: "discriminatory", label: "It's discriminatory or offensive" },
  { value: "spam", label: "It's spam, a duplicate or not a real job" },
  { value: "other", label: "Something else" },
];
export const reportReasonLabel = (r: ReportReason) => REPORT_REASONS.find((x) => x.value === r)?.label ?? r;

/** Distinct people reporting a job before it's hidden for review. */
export const REPORTS_TO_HIDE = 3;

/** The match levels a candidate can choose for job alerts. */
export const ALERT_SCORES = [40, 50, 60, 70, 80, 90] as const;
