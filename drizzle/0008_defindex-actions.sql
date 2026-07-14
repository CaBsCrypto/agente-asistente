CREATE TABLE "agent_stellar_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"wallet_id" text NOT NULL,
	"wallet_address" text NOT NULL,
	"action" text NOT NULL,
	"asset" text NOT NULL,
	"amount" numeric(20, 7) NOT NULL,
	"status" text DEFAULT 'prepared' NOT NULL,
	"idempotency_key" text NOT NULL,
	"prepared_xdr" text NOT NULL,
	"signed_xdr" text,
	"transaction_hash" text,
	"preview" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "agent_stellar_actions" ADD CONSTRAINT "agent_stellar_actions_user_id_agent_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."agent_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_stellar_actions_idempotency_uidx" ON "agent_stellar_actions" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_stellar_actions_tx_hash_uidx" ON "agent_stellar_actions" USING btree ("transaction_hash");--> statement-breakpoint
CREATE INDEX "agent_stellar_actions_user_created_idx" ON "agent_stellar_actions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "agent_stellar_actions_status_idx" ON "agent_stellar_actions" USING btree ("status");
