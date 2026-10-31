CREATE TABLE "company_logos" (
	"employer_id" uuid PRIMARY KEY NOT NULL,
	"data" "bytea" NOT NULL,
	"content_type" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_logos" ADD CONSTRAINT "company_logos_employer_id_employers_user_id_fk" FOREIGN KEY ("employer_id") REFERENCES "public"."employers"("user_id") ON DELETE cascade ON UPDATE no action;