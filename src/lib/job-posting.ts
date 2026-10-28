/**
 * Google for Jobs: builds the JobPosting structured data for a job page.
 * Spec: https://developers.google.com/search/docs/appearance/structured-data/job-posting
 */
import type { Employer, Job } from "@/db/schema";
import { qualificationLabel } from "./constants";
import { isAcceptingApplications } from "./jobs";

const PROVINCES: Record<string, string> = {
  "Cape Town": "Western Cape",
  Stellenbosch: "Western Cape",
  Paarl: "Western Cape",
  "Somerset West": "Western Cape",
  George: "Western Cape",
  Johannesburg: "Gauteng",
  Pretoria: "Gauteng",
  Durban: "KwaZulu-Natal",
  Gqeberha: "Eastern Cape",
  "East London": "Eastern Cape",
  Bloemfontein: "Free State",
};

const EMPLOYMENT_TYPES: Record<Job["employmentType"], string> = {
  full_time: "FULL_TIME",
  part_time: "PART_TIME",
  contract: "CONTRACTOR",
  internship: "INTERN",
};

// Google's credentialCategory values.
const CREDENTIALS: Partial<Record<Job["minQualification"], string>> = {
  matric: "high school",
  certificate: "professional certificate",
  diploma: "professional certificate",
  degree: "bachelor degree",
  honours: "postgraduate degree",
  masters: "postgraduate degree",
};

type JobEmployer = Pick<Employer, "companyName" | "website" | "isDemo">;

/** Only real, open jobs are listed, and only when the site has Google listing switched on. */
export function isListableOnGoogle(job: Job, employer: JobEmployer, enabled: boolean, today?: string): boolean {
  return enabled && !employer.isDemo && isAcceptingApplications(job, today);
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** The full job description as simple HTML, which is what Google asks for. */
export function descriptionHtml(job: Job): string {
  const paragraphs = job.description
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`);
  const list = (items: string[]) => `<ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;
  const parts = [...paragraphs];

  if (job.workplace === "remote") {
    parts.push("<p>This role is 100% remote. Applicants must be based in South Africa.</p>");
  }
  if (job.responsibilities.length > 0) parts.push("<p><strong>What you'll do</strong></p>", list(job.responsibilities));

  const requirements = [
    `Qualification: ${qualificationLabel(job.minQualification)} or higher${
      job.fieldKeywords.length ? `, in ${job.fieldKeywords.join(" or ")} or a related field` : ""
    }`,
    job.minYearsExperience > 0
      ? `Experience: at least ${job.minYearsExperience} year${job.minYearsExperience === 1 ? "" : "s"}`
      : "Experience: none required",
    ...(job.skills.length ? [`Skills: ${job.skills.join(", ")}`] : []),
  ];
  parts.push("<p><strong>What they're looking for</strong></p>", list(requirements));
  if (job.mustHaves.length > 0) parts.push("<p><strong>Must-haves</strong></p>", list(job.mustHaves));
  return parts.join("");
}

export interface JobPostingLd {
  "@context": string;
  "@type": "JobPosting";
  title: string;
  description: string;
  datePosted: string;
  url: string;
  employmentType: string;
  hiringOrganization: Record<string, string>;
  validThrough?: string;
  jobLocation?: { "@type": string; address: Record<string, string> };
  jobLocationType?: "TELECOMMUTE";
  applicantLocationRequirements?: { "@type": string; name: string };
  baseSalary?: { "@type": string; currency: string; value: Record<string, string | number | null | undefined> };
  [property: string]: unknown;
}

export function buildJobPosting(job: Job, employer: JobEmployer, baseUrl: string): JobPostingLd {
  const url = `${baseUrl}/jobs/${job.id}`;
  const remote = job.workplace === "remote";
  const known = job.city !== "Other";

  const salary =
    job.salaryMin || job.salaryMax
      ? {
          "@type": "MonetaryAmount",
          currency: "ZAR",
          value:
            job.salaryMin && job.salaryMax && job.salaryMax !== job.salaryMin
              ? { "@type": "QuantitativeValue", minValue: job.salaryMin, maxValue: job.salaryMax, unitText: "MONTH" }
              : { "@type": "QuantitativeValue", value: job.salaryMin || job.salaryMax, unitText: "MONTH" },
        }
      : undefined;

  const credential = CREDENTIALS[job.minQualification];

  return {
    "@context": "https://schema.org/",
    "@type": "JobPosting" as const,
    title: job.title,
    description: descriptionHtml(job),
    identifier: { "@type": "PropertyValue", name: employer.companyName, value: job.id },
    datePosted: job.createdAt.toISOString(),
    // Closing dates are inclusive and in South African time.
    ...(job.closesOn ? { validThrough: `${job.closesOn}T23:59:59+02:00` } : {}),
    employmentType: EMPLOYMENT_TYPES[job.employmentType],
    hiringOrganization: {
      "@type": "Organization",
      name: employer.companyName,
      ...(employer.website ? { sameAs: employer.website } : {}),
    },
    ...(remote
      ? {
          jobLocationType: "TELECOMMUTE" as const,
          applicantLocationRequirements: { "@type": "Country", name: "South Africa" },
        }
      : {
          jobLocation: {
            "@type": "Place",
            address: {
              "@type": "PostalAddress",
              ...(known ? { addressLocality: job.city } : {}),
              ...(known && PROVINCES[job.city] ? { addressRegion: PROVINCES[job.city] } : {}),
              addressCountry: "ZA",
            },
          },
        }),
    ...(salary ? { baseSalary: salary } : {}),
    educationRequirements: credential
      ? { "@type": "EducationalOccupationalCredential", credentialCategory: credential }
      : "no requirements",
    experienceRequirements:
      job.minYearsExperience > 0
        ? { "@type": "OccupationalExperienceRequirements", monthsOfExperience: job.minYearsExperience * 12 }
        : "no requirements",
    ...(job.skills.length ? { skills: job.skills.join(", ") } : {}),
    url,
  };
}

/** Serialises structured data for a <script> tag, escaping "<" so job text can't close the tag early. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
