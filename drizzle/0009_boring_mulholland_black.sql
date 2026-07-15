CREATE TABLE "agent_decision_events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"action_type" text NOT NULL,
	"outcome" text NOT NULL,
	"reason_codes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"explanation" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_knowledge_items" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"source" text DEFAULT 'chat' NOT NULL,
	"scope" text DEFAULT 'personal' NOT NULL,
	"sensitivity" text DEFAULT 'standard' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_policies" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"label" text NOT NULL,
	"enforcement" text DEFAULT 'hard' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source" text DEFAULT 'chat' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_decision_events" ADD CONSTRAINT "agent_decision_events_user_id_agent_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."agent_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_knowledge_items" ADD CONSTRAINT "agent_knowledge_items_user_id_agent_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."agent_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_policies" ADD CONSTRAINT "agent_policies_user_id_agent_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."agent_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_decisions_user_created_idx" ON "agent_decision_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "agent_decisions_outcome_idx" ON "agent_decision_events" USING btree ("outcome");--> statement-breakpoint
CREATE INDEX "agent_knowledge_user_kind_idx" ON "agent_knowledge_items" USING btree ("user_id","kind");--> statement-breakpoint
CREATE INDEX "agent_knowledge_user_status_idx" ON "agent_knowledge_items" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "agent_policies_user_kind_idx" ON "agent_policies" USING btree ("user_id","kind");--> statement-breakpoint
CREATE INDEX "agent_policies_user_status_idx" ON "agent_policies" USING btree ("user_id","status");