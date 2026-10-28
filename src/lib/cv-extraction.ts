/**
 * CV auto-fill: what we ask the AI to pull out of a CV, and how its answer is
 * cleaned up before it reaches the profile form. No network calls here, so it's unit-testable.
 */
import { z } from "zod";
import { CITIES } from "./constants";
import { QUALIFICATION_ORDER, type Qualification } from "./matching";
import { normaliseSkills } from "./skills";

export const PHONE_PATTERN = /^\+?[0-9 ()-]{9,16}$/;

/** The exact shape Claude must return (sent as a JSON schema, so the reply always parses). */
export const CvExtractionSchema = z.object({
  fullName: z.string().nullable().describe("The person's full name as written on the CV, or null if missing."),
  phone: z.string().nullable().describe("Their main phone number as written, or null if missing."),
  // City and qualification are free text rather than enums: the SDK can't enforce enums inside
  // nullable fields, and one unexpected value would otherwise reject the whole answer. They're
  // matched to the allowed values in normaliseExtraction instead.
  city: z
    .string()
    .nullable()
    .describe(
      `Where they live, as exactly one of: ${CITIES.join(", ")}. Use the nearest of these for a suburb or ` +
        "nearby town (Claremont is Cape Town, Sandton is Johannesburg, Umhlanga is Durban). Use Other if it's " +
        "elsewhere. Null if the CV doesn't say where they live.",
    ),
  qualificationLevel: z
    .string()
    .describe(
      "Their highest COMPLETED qualification, as exactly one of: none, matric (National Senior Certificate or " +
        "equivalent), certificate (higher certificate), diploma, degree (bachelor's), honours, masters (master's " +
        "or doctorate). A degree still in progress doesn't count; for a current student it's usually matric.",
    ),
  fieldOfStudy: z
    .string()
    .nullable()
    .describe(
      "The field of that highest qualification, e.g. Marketing Management. If their highest completed is matric " +
        "and they're studying now, give the field of their current studies. Null if none.",
    ),
  yearsExperience: z
    .number()
    .describe(
      "Total years of work experience, including part-time, contract and internship work, rounded down. " +
        "Add up the date ranges and don't double-count overlaps. 0 if they list no work.",
    ),
  skills: z
    .array(z.string())
    .describe(
      "Up to 20 concrete, job-relevant skills shown on the CV, each a few words. Name software specifically " +
        "(Excel, Outlook, Canva, Google Workspace). Leave out personality traits like hard-working.",
    ),
  summary: z
    .string()
    .describe(
      "A two or three sentence first-person summary for employers, using only facts from the CV " +
        "(qualification, recent roles, strongest skills). Plain and factual; no exaggeration.",
    ),
  hasOwnTransport: z
    .boolean()
    .nullable()
    .describe("True only if the CV says they have their own transport or a car; false if it says they don't; null if it doesn't say."),
});

export type CvExtraction = z.infer<typeof CvExtractionSchema>;

/** Cleaned-up suggestions. Anything missing or unusable is left out. */
export interface CvSuggestions {
  fullName?: string;
  phone?: string;
  city?: (typeof CITIES)[number];
  qualificationLevel?: Qualification;
  fieldOfStudy?: string;
  yearsExperience?: number;
  skills: string[];
  summary?: string;
  hasOwnTransport?: boolean;
}

const clean = (s: string | null | undefined, max: number) => {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return t ? t.slice(0, max) : undefined;
};

/** Matches the model's wording to one of the profile's qualification levels. */
export function matchQualification(text: string): Qualification | undefined {
  const t = text.toLowerCase().trim();
  if ((QUALIFICATION_ORDER as readonly string[]).includes(t)) return t as Qualification;
  if (/master|doctor|phd/.test(t)) return "masters";
  if (/honou?rs/.test(t)) return "honours";
  if (/bachelor|degree|bcom|\bba\b|bsc/.test(t)) return "degree";
  if (/diploma/.test(t)) return "diploma";
  if (/certificate/.test(t) && !/senior certificate/.test(t)) return "certificate";
  if (/matric|senior certificate|nsc|grade 12/.test(t)) return "matric";
  return undefined;
}

export function normaliseExtraction(raw: CvExtraction): CvSuggestions {
  const city = CITIES.find((c) => c.toLowerCase() === (raw.city ?? "").toLowerCase().trim());
  const phone = clean(raw.phone, 30)?.replace(/[^\d+ ()-]/g, "").trim();
  const years = Number.isFinite(raw.yearsExperience) ? Math.floor(raw.yearsExperience) : NaN;
  return {
    fullName: clean(raw.fullName, 100),
    phone: phone && PHONE_PATTERN.test(phone) ? phone : undefined,
    city,
    qualificationLevel: matchQualification(raw.qualificationLevel),
    fieldOfStudy: clean(raw.fieldOfStudy, 120),
    yearsExperience: years >= 0 ? Math.min(years, 50) : undefined,
    // "Diary management, minute taking" is two skills; each is matched to its standard name.
    skills: normaliseSkills(raw.skills.flatMap((s) => s.split(",")).map((s) => s.slice(0, 60))).slice(0, 30),
    summary: clean(raw.summary, 1200),
    hasOwnTransport: raw.hasOwnTransport ?? undefined,
  };
}
