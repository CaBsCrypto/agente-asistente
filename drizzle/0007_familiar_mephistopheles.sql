CREATE TABLE "mcp_access_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" text NOT NULL,
	"name" text NOT NULL,
	"token_prefix" text NOT NULL,
	"token_hash" text NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_offers" (
	"id" text PRIMARY KEY NOT NULL,
	"provider_id" text NOT NULL,
	"external_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"kind" text NOT NULL,
	"amount" numeric(20, 7) NOT NULL,
	"currency" text NOT NULL,
	"network" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_providers" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"contact_email" text,
	"status" text DEFAULT 'active' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "service_offers" ADD CONSTRAINT "service_offers_provider_id_service_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."service_providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mcp_access_tokens_hash_uidx" ON "mcp_access_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "mcp_access_tokens_subject_idx" ON "mcp_access_tokens" USING btree ("subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "mcp_access_tokens_status_idx" ON "mcp_access_tokens" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "service_offers_provider_external_uidx" ON "service_offers" USING btree ("provider_id","external_id");--> statement-breakpoint
CREATE INDEX "service_offers_provider_status_idx" ON "service_offers" USING btree ("provider_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "service_providers_slug_uidx" ON "service_providers" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "service_providers_status_idx" ON "service_providers" USING btree ("status");