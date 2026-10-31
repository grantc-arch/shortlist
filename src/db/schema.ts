import {
  boolean,
  doublePrecision,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
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

export const alertFrequencyEnum = pgEnum("alert_frequency", ["off", "daily", "weekly"]);

export const reportReasonEnum = pgEnum("report_reason", [
  "asks_for_money",
  "asks_for_personal_info",
  "fake",
  "discriminatory",
  "spam",
  "other",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull(),
  // The name other people use to message this account, e.g. lerato_m. Lower-case, unique.
  username: text("username").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  // Sessions started before this moment are no longer valid (set when the password is reset).
  passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
  // Candidates: emails when an application's status changes. Employers: a daily summary of new applicants.
  emailUpdates: boolean("email_updates").notNull().default(true),
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
  // Applicants who applied after this moment go in the next daily summary email.
  applicantsDigestAt: timestamp("applicants_digest_at", { withTimezone: true }).notNull().defaultNow(),
});

// Company logos, kept apart from `employers` so ordinary company lookups never load image bytes.
// Resized in the browser before upload; only PNG, JPEG and WebP are stored (never SVG).
export const companyLogos = pgTable("company_logos", {
  employerId: uuid("employer_id")
    .primaryKey()
    .references(() => employers.userId, { onDelete: "cascade" }),
  data: bytea("data").notNull(),
  contentType: text("content_type").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
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
  // Opted in to the talent pool: employers can see an anonymous version of the profile and invite them to apply.
  openToOffers: boolean("open_to_offers").notNull().default(false),
  // Job alert emails: new jobs scoring at least alertMinScore, sent daily or weekly.
  alertFrequency: alertFrequencyEnum("alert_frequency").notNull().default("off"),
  alertMinScore: integer("alert_min_score").notNull().default(60),
  // When alerts were last checked; the next email covers jobs posted after this.
  alertsCheckedAt: timestamp("alerts_checked_at", { withTimezone: true }),
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
  // Keys from BENEFITS in lib/constants.
  benefits: text("benefits").array().notNull().default([]),
  weights: jsonb("weights").$type<Weights>().notNull(),
  status: jobStatusEnum("status").notNull().default("open"),
  // Times the listing was opened by someone other than the employer.
  views: integer("views").notNull().default(0),
  // Set when enough people report the job, or by a site admin. Hidden jobs can't be seen or applied for.
  hiddenAt: timestamp("hidden_at", { withTimezone: true }),
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
    // The status the candidate was last emailed about. The daily email reports any difference.
    notifiedStatus: applicationStatusEnum("notified_status").notNull().default("new"),
    employerNotes: text("employer_notes").notNull().default(""),
    // The employer's own 1 to 5 star rating, private to them.
    rating: integer("rating"),
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

// Jobs a candidate has bookmarked.
export const savedJobs = pgTable(
  "saved_jobs",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.jobId] })],
);

// Reports from signed-in users about a job (scams, fake jobs...). One per person per job.
export const jobReports = pgTable(
  "job_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: reportReasonEnum("reason").notNull(),
    details: text("details").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    // Set when an admin reviews the job, either restoring or removing it.
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("job_reports_job_reporter_idx").on(t.jobId, t.reporterId)],
);

// An employer inviting a talent-pool candidate to apply for a job.
export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    message: text("message").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("invitations_job_candidate_idx").on(t.jobId, t.candidateId)],
);

// Two-person conversations. userA is always the smaller id, so each pair has one conversation.
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userA: uuid("user_a")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userB: uuid("user_b")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("conversations_pair_idx").on(t.userA, t.userB), index("conversations_b_idx").on(t.userB)],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull().default(""),
    // A job sent with the message, shown as a card. Kept if the job is deleted, as a plain message.
    jobId: uuid("job_id").references(() => jobs.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    // When the other person opened the conversation after this arrived.
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (t) => [index("messages_conversation_idx").on(t.conversationId, t.createdAt)],
);

// Someone who doesn't want messages from another user.
export const blocks = pgTable(
  "blocks",
  {
    blockerId: uuid("blocker_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.blockerId, t.blockedId] })],
);

export type User = typeof users.$inferSelect;
export type Employer = typeof employers.$inferSelect;
export type Candidate = typeof candidates.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type QualificationLevel = (typeof qualificationEnum.enumValues)[number];
export type ApplicationStatus = (typeof applicationStatusEnum.enumValues)[number];
export type AlertFrequency = (typeof alertFrequencyEnum.enumValues)[number];
export type ReportReason = (typeof reportReasonEnum.enumValues)[number];
