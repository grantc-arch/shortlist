CREATE TYPE "public"."alert_frequency" AS ENUM('off', 'daily', 'weekly');--> statement-breakpoint
CREATE TYPE "public"."report_reason" AS ENUM('asks_for_money', 'asks_for_personal_info', 'fake', 'discriminatory', 'spam', 'other');--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"reporter_id" uuid NOT NULL,
	"reason" "report_reason" NOT NULL,
	"details" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "saved_jobs" (
	"user_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_jobs_user_id_job_id_pk" PRIMARY KEY("user_id","job_id")
);
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "notified_status" "application_status" DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "rating" integer;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "open_to_offers" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "alert_frequency" "alert_frequency" DEFAULT 'off' NOT NULL;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "alert_min_score" integer DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "alerts_checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "employers" ADD COLUMN "applicants_digest_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "benefits" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "views" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "hidden_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_updates" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_candidate_id_users_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_reports" ADD CONSTRAINT "job_reports_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_reports" ADD CONSTRAINT "job_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_jobs" ADD CONSTRAINT "saved_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_jobs" ADD CONSTRAINT "saved_jobs_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_job_candidate_idx" ON "invitations" USING btree ("job_id","candidate_id");--> statement-breakpoint
CREATE UNIQUE INDEX "job_reports_job_reporter_idx" ON "job_reports" USING btree ("job_id","reporter_id");--> statement-breakpoint
-- Candidates already know where their existing applications stand, so don't email them about it.
UPDATE "applications" SET "notified_status" = "status";
