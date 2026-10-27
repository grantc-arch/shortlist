CREATE TYPE "public"."application_status" AS ENUM('new', 'shortlisted', 'interview', 'declined', 'hired');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('full_time', 'part_time', 'contract', 'internship');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."qualification_level" AS ENUM('none', 'matric', 'certificate', 'diploma', 'degree', 'honours', 'masters');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('employer', 'candidate');--> statement-breakpoint
CREATE TYPE "public"."workplace" AS ENUM('on_site', 'hybrid', 'remote');--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"must_have_answers" jsonb NOT NULL,
	"cover_note" text DEFAULT '' NOT NULL,
	"status" "application_status" DEFAULT 'new' NOT NULL,
	"employer_notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidates" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"willing_to_relocate" boolean DEFAULT false NOT NULL,
	"qualification_level" "qualification_level" DEFAULT 'none' NOT NULL,
	"field_of_study" text DEFAULT '' NOT NULL,
	"years_experience" integer DEFAULT 0 NOT NULL,
	"skills" text[] DEFAULT '{}' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"has_own_transport" boolean DEFAULT false NOT NULL,
	"available_from" date,
	"cv_file_name" text,
	"cv_data" "bytea",
	"popia_consent_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employers" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"company_name" text NOT NULL,
	"city" text NOT NULL,
	"about" text DEFAULT '' NOT NULL,
	"website" text
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employer_id" uuid NOT NULL,
	"title" text NOT NULL,
	"city" text NOT NULL,
	"workplace" "workplace" DEFAULT 'on_site' NOT NULL,
	"employment_type" "employment_type" DEFAULT 'full_time' NOT NULL,
	"salary_min" integer,
	"salary_max" integer,
	"start_date" date,
	"closes_on" date,
	"description" text NOT NULL,
	"responsibilities" text[] DEFAULT '{}' NOT NULL,
	"min_qualification" "qualification_level" DEFAULT 'none' NOT NULL,
	"field_keywords" text[] DEFAULT '{}' NOT NULL,
	"min_years_experience" integer DEFAULT 0 NOT NULL,
	"skills" text[] DEFAULT '{}' NOT NULL,
	"must_haves" text[] DEFAULT '{}' NOT NULL,
	"weights" jsonb NOT NULL,
	"status" "job_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_candidate_id_users_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employers" ADD CONSTRAINT "employers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_employer_id_users_id_fk" FOREIGN KEY ("employer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "applications_job_candidate_idx" ON "applications" USING btree ("job_id","candidate_id");