CREATE TABLE "waitlist_signups" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"use_case" text NOT NULL,
	"country" text,
	"company" text,
	"source" text DEFAULT 'website' NOT NULL,
	"referral" text,
	"consent" boolean NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "waitlist_signups_email_uidx" ON "waitlist_signups" USING btree ("email");--> statement-breakpoint
CREATE INDEX "waitlist_signups_role_idx" ON "waitlist_signups" USING btree ("role");--> statement-breakpoint
CREATE INDEX "waitlist_signups_status_created_idx" ON "waitlist_signups" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "waitlist_signups_source_idx" ON "waitlist_signups" USING btree ("source");