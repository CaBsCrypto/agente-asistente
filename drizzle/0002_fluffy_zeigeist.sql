CREATE TABLE "waitlist_activities" (
	"id" text PRIMARY KEY NOT NULL,
	"signup_id" text NOT NULL,
	"event_type" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"note" text,
	"actor" text DEFAULT 'founder' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "waitlist_signups" ADD COLUMN "priority" text DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "waitlist_signups" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "waitlist_signups" ADD COLUMN "owner" text;--> statement-breakpoint
ALTER TABLE "waitlist_signups" ADD COLUMN "tags" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "waitlist_signups" ADD COLUMN "last_contacted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "waitlist_activities" ADD CONSTRAINT "waitlist_activities_signup_id_waitlist_signups_id_fk" FOREIGN KEY ("signup_id") REFERENCES "public"."waitlist_signups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "waitlist_activities_signup_created_idx" ON "waitlist_activities" USING btree ("signup_id","created_at");--> statement-breakpoint
CREATE INDEX "waitlist_signups_priority_idx" ON "waitlist_signups" USING btree ("priority");