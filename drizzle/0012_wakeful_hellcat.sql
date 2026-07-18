CREATE TABLE "agent_workflow_events" (
	"id" text PRIMARY KEY NOT NULL,
	"workflow_id" text NOT NULL,
	"user_id" text NOT NULL,
	"node" text NOT NULL,
	"status" text NOT NULL,
	"version" integer NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_workflows" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"connector_id" text NOT NULL,
	"capability" text NOT NULL,
	"operation" text NOT NULL,
	"risk" text NOT NULL,
	"status" text DEFAULT 'planning' NOT NULL,
	"action_digest" text,
	"idempotency_key" text NOT NULL,
	"state" jsonb NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_workflow_events" ADD CONSTRAINT "agent_workflow_events_workflow_id_agent_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."agent_workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_workflow_events" ADD CONSTRAINT "agent_workflow_events_user_id_agent_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."agent_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_workflows" ADD CONSTRAINT "agent_workflows_user_id_agent_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."agent_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_workflows" ADD CONSTRAINT "agent_workflows_conversation_id_agent_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."agent_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_workflow_events_workflow_created_idx" ON "agent_workflow_events" USING btree ("workflow_id","created_at");--> statement-breakpoint
CREATE INDEX "agent_workflow_events_user_created_idx" ON "agent_workflow_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_workflows_idempotency_uidx" ON "agent_workflows" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "agent_workflows_user_updated_idx" ON "agent_workflows" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "agent_workflows_status_idx" ON "agent_workflows" USING btree ("status");--> statement-breakpoint
