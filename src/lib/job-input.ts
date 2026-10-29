/**
 * The rules a job must meet, shared by the Post a job form and the import command
 * (scripts/import-jobs.ts), so both accept exactly the same jobs.
 */
import { z } from "zod";
import { BENEFIT_KEYS } from "./constants";
import { todayInSA } from "./jobs";
import { QUALIFICATION_ORDER } from "./matching";

const optionalInt = z.preprocess(
  (v) => (v === "" || v == null ? null : v),
  z.coerce.number().int().min(0).max(10_000_000).nullable(),
);
const optionalDate = z.preprocess((v) => (v === "" || v == null ? null : v), z.iso.date().nullable());

export const jobSchema = z
  .object({
    title: z.string().trim().min(3, "Give the job a title").max(100),
    workplace: z.enum(["on_site", "hybrid", "remote"]),
    employmentType: z.enum(["full_time", "part_time", "contract", "internship"]),
    salaryMin: optionalInt,
    salaryMax: optionalInt,
    startDate: optionalDate,
    closesOn: optionalDate,
    description: z.string().trim().min(40, "Describe the role in at least a couple of sentences").max(5000),
    responsibilities: z.array(z.string().max(200)).max(20),
    minQualification: z.enum(QUALIFICATION_ORDER),
    fieldKeywords: z.array(z.string().max(60)).max(10),
    minYearsExperience: z.coerce.number().int().min(0).max(30),
    skills: z.array(z.string().max(60)).max(25, "List at most 25 skills"),
    mustHaves: z.array(z.string().max(160)).max(8, "Keep must-haves to 8 or fewer"),
    benefits: z.array(z.enum(BENEFIT_KEYS)),
  })
  .refine((j) => !j.salaryMin || !j.salaryMax || j.salaryMax >= j.salaryMin, {
    message: "The top of the salary range is lower than the bottom",
  })
  .refine((j) => !j.closesOn || j.closesOn >= todayInSA(), {
    message: "Choose a closing date from today onwards. To stop applications now, use “Close to applications”.",
  });

