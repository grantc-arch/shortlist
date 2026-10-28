import {
  boolean,
  doublePrecision,
  customType,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { Weights } from "@/lib/matching";

// Postgres `bytea` column for CV files (kept in the database so the app needs
// no separate file-storage service).
const bytea = customType<{ data: Buffer; driverData: Buffer | Uint8Array }>({
  dataType: () => "bytea",
  fromDriver: (value) => Buffer.from(value),
});

export const roleEnum = pgEnum("role", ["employer", "candidate"]);

export const qualificationEnum = pgEnum("qualification_level", [
  "none",
  "matric",
  "certificate",
  "diploma",
  "degree",
  "honours",
  "masters",
]);

export const workplaceEnum = pgEnum("workplace", ["on_site", "hybrid", "remote"]);

export const employmentTypeEnum = pgEnum("employment_type", [
  "full_time",
  "part_time",
  "contract",
  "internship",
]);

export const jobStatusEnum = pgEnum("job_status", ["open", "closed"]);

export const applicationStatusEnum = pgEnum("application_status", [
  "new",
  "shortlisted",
  "interview",
  "declined",
  "hired",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  // Sessions started before this moment are no longer valid (set when the password is reset).
  passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
});

export const employers = pgTable("employers", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  companyName: text("company_name").notNull(),
  city: text("city").notNull(),
  // Coordinates of the location, when known (picked from suggestions or a main city).
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  about: text("about").notNull().default(""),
  website: text("website"),
  // Demo companies from the seed script. Their jobs are labelled on the site and never listed on Google.
  isDemo: boolean("is_demo").notNull().default(false),
});

export const candidates = pgTable("candidates", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull().default(""),
  city: text("city").notNull().default(""),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  willingToRelocate: boolean("willing_to_relocate").notNull().default(false),
  qualificationLevel: qualificationEnum("qualification_level").notNull().default("none"),
  fieldOfStudy: text("field_of_study").notNull().default(""),
  yearsExperience: integer("years_experience").notNull().default(0),
  skills: text("skills").array().notNull().default([]),
  summary: text("summary").notNull().default(""),
  hasOwnTransport: boolean("has_own_transport").notNull().default(false),
  availableFrom: date("available_from"),
  cvFileName: text("cv_file_name"),
  cvData: bytea("cv_data"),
  popiaConsentAt: timestamp("popia_consent_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  employerId: uuid("employer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  city: text("city").notNull(),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  workplace: workplaceEnum("workplace").notNull().default("on_site"),
  employmentType: employmentTypeEnum("employment_type").notNull().default("full_time"),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  startDate: date("start_date"),
  closesOn: date("closes_on"),
  description: text("description").notNull(),
  responsibilities: text("responsibilities").array().notNull().default([]),
  minQualification: qualificationEnum("min_qualification").notNull().default("none"),
  fieldKeywords: text("field_keywords").array().notNull().default([]),
  minYearsExperience: integer("min_years_experience").notNull().default(0),
  skills: text("skills").array().notNull().default([]),
  mustHaves: text("must_haves").array().notNull().default([]),
  weights: jsonb("weights").$type<Weights>().notNull(),
  status: jobStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // One yes/no answer per job must-have, in the same order as jobs.must_haves.
    mustHaveAnswers: jsonb("must_have_answers").$type<boolean[]>().notNull(),
    coverNote: text("cover_note").notNull().default(""),
    status: applicationStatusEnum("status").notNull().default("new"),
    employerNotes: text("employer_notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("applications_job_candidate_idx").on(t.jobId, t.candidateId)],
);

// One row per CV auto-fill request, used to cap how often each person can call the AI.
export const cvAutofillRuns = pgTable("cv_autofill_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Single-use "forgot password" links. Only a hash of the token is stored, so a leaked
// database can't be used to reset anyone's password.
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Employer = typeof employers.$inferSelect;
export type Candidate = typeof candidates.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type QualificationLevel = (typeof qualificationEnum.enumValues)[number];
export type ApplicationStatus = (typeof applicationStatusEnum.enumValues)[number];
