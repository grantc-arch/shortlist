CREATE TABLE "job_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"recipient_email" text NOT NULL,
	"recipient_id" uuid,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_shares" ADD CONSTRAINT "job_shares_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_shares" ADD CONSTRAINT "job_shares_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_shares" ADD CONSTRAINT "job_shares_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_shares_recipient_idx" ON "job_shares" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "job_shares_sender_idx" ON "job_shares" USING btree ("sender_id","created_at");