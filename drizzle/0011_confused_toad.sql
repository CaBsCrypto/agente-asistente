CREATE TABLE "agent_testnet_faucet_claims" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"wallet_address" text NOT NULL,
	"asset" text NOT NULL,
	"amount" numeric(20, 7) NOT NULL,
	"claim_window" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"transaction_hash" text,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_testnet_faucet_claims" ADD CONSTRAINT "agent_testnet_faucet_claims_user_id_agent_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."agent_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_testnet_faucet_claims_user_asset_window_uidx" ON "agent_testnet_faucet_claims" USING btree ("user_id","asset","claim_window");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_testnet_faucet_claims_tx_hash_uidx" ON "agent_testnet_faucet_claims" USING btree ("transaction_hash");--> statement-breakpoint
CREATE INDEX "agent_testnet_faucet_claims_status_idx" ON "agent_testnet_faucet_claims" USING btree ("status");