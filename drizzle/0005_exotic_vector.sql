CREATE TABLE "agent_external_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"access_token_encrypted" text NOT NULL,
	"refresh_token_encrypted" text,
	"token_expires_at" timestamp with time zone,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_oauth_states" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"code_verifier_encrypted" text NOT NULL,
	"client_id" text NOT NULL,
	"client_secret_encrypted" text,
	"authorization_endpoint" text NOT NULL,
	"token_endpoint" text NOT NULL,
	"redirect_uri" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_external_connections" ADD CONSTRAINT "agent_external_connections_user_id_agent_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."agent_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_oauth_states" ADD CONSTRAINT "agent_oauth_states_user_id_agent_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."agent_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_external_connections_user_provider_uidx" ON "agent_external_connections" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX "agent_external_connections_status_idx" ON "agent_external_connections" USING btree ("status");--> statement-breakpoint
CREATE INDEX "agent_oauth_states_user_provider_idx" ON "agent_oauth_states" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX "agent_oauth_states_expires_idx" ON "agent_oauth_states" USING btree ("expires_at");