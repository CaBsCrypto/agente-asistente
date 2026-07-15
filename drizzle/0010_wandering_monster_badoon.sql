CREATE TABLE "agent_x402_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"wallet_id" text NOT NULL,
	"wallet_address" text NOT NULL,
	"resource_url" text NOT NULL,
	"network" text NOT NULL,
	"asset_contract" text NOT NULL,
	"pay_to" text NOT NULL,
	"amount_atomic" numeric(30, 0) NOT NULL,
	"amount_display" numeric(20, 7) NOT NULL,
	"status" text DEFAULT 'prepared' NOT NULL,
	"idempotency_key" text NOT NULL,
	"payment_required" jsonb NOT NULL,
	"settlement" jsonb,
	"transaction_hash" text,
	"resource_preview" text,
	"expires_at" timestamp with time zone NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "agent_x402_payments" ADD CONSTRAINT "agent_x402_payments_user_id_agent_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."agent_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_x402_payments_idempotency_uidx" ON "agent_x402_payments" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_x402_payments_tx_hash_uidx" ON "agent_x402_payments" USING btree ("transaction_hash");--> statement-breakpoint
CREATE INDEX "agent_x402_payments_user_created_idx" ON "agent_x402_payments" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "agent_x402_payments_status_idx" ON "agent_x402_payments" USING btree ("status");