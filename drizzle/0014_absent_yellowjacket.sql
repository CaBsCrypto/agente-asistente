CREATE TABLE IF NOT EXISTS "integration_recommendations" (
	"id" text PRIMARY KEY NOT NULL,
	"integration_name" text NOT NULL,
	"email" text NOT NULL,
	"use_case" text,
	"locale" text DEFAULT 'en' NOT NULL,
	"source" text DEFAULT 'landing' NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "integration_recommendations_email_name_uidx" ON "integration_recommendations" USING btree ("email","integration_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "integration_recommendations_status_created_idx" ON "integration_recommendations" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "integration_recommendations_name_idx" ON "integration_recommendations" USING btree ("integration_name");
