CREATE TABLE "agent_evm_calls" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"wallet_address" text NOT NULL,
	"network" text NOT NULL,
	"action_id" text NOT NULL,
	"step_index" integer NOT NULL,
	"idempotency_key" text NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'prepared' NOT NULL,
	"preview" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"signature" text,
	"transaction_hash" text,
	"expires_at" timestamp with time zone NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "agent_evm_calls" ADD CONSTRAINT "agent_evm_calls_user_id_agent_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."agent_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_evm_calls_idempotency_uidx" ON "agent_evm_calls" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_evm_calls_action_step_uidx" ON "agent_evm_calls" USING btree ("action_id","step_index");--> statement-breakpoint
CREATE INDEX "agent_evm_calls_user_created_idx" ON "agent_evm_calls" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "agent_evm_calls_status_idx" ON "agent_evm_calls" USING btree ("status");