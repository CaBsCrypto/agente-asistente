CREATE TABLE "audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"intent_id" text,
	"event_type" text NOT NULL,
	"actor_id" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authorizations" (
	"id" text PRIMARY KEY NOT NULL,
	"intent_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"authorized_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "commerce_intents" (
	"id" text PRIMARY KEY NOT NULL,
	"offer_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"amount" numeric(20, 7) NOT NULL,
	"currency" text NOT NULL,
	"network" text NOT NULL,
	"status" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policy_decisions" (
	"id" text PRIMARY KEY NOT NULL,
	"intent_id" text NOT NULL,
	"allowed" boolean NOT NULL,
	"reasons" jsonb NOT NULL,
	"policy_version" text NOT NULL,
	"evaluated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"intent_id" text NOT NULL,
	"status" text NOT NULL,
	"network" text NOT NULL,
	"amount" numeric(20, 7) NOT NULL,
	"currency" text NOT NULL,
	"transaction_ref" text NOT NULL,
	"executed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"fulfillment" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_intent_id_commerce_intents_id_fk" FOREIGN KEY ("intent_id") REFERENCES "public"."commerce_intents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authorizations" ADD CONSTRAINT "authorizations_intent_id_commerce_intents_id_fk" FOREIGN KEY ("intent_id") REFERENCES "public"."commerce_intents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_decisions" ADD CONSTRAINT "policy_decisions_intent_id_commerce_intents_id_fk" FOREIGN KEY ("intent_id") REFERENCES "public"."commerce_intents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_intent_id_commerce_intents_id_fk" FOREIGN KEY ("intent_id") REFERENCES "public"."commerce_intents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_intent_created_idx" ON "audit_events" USING btree ("intent_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "authorizations_intent_uidx" ON "authorizations" USING btree ("intent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "authorizations_token_hash_uidx" ON "authorizations" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_intents_idempotency_key_uidx" ON "commerce_intents" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "commerce_intents_actor_idx" ON "commerce_intents" USING btree ("actor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "policy_decisions_intent_uidx" ON "policy_decisions" USING btree ("intent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "receipts_intent_uidx" ON "receipts" USING btree ("intent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "receipts_transaction_ref_uidx" ON "receipts" USING btree ("transaction_ref");