CREATE TABLE "telegram_link_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telegram_links" (
	"telegram_user_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"chat_id" text,
	"username" text,
	"language" text DEFAULT 'en' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telegram_pending_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"telegram_user_id" text NOT NULL,
	"user_id" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "telegram_link_codes" ADD CONSTRAINT "telegram_link_codes_user_id_agent_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."agent_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_links" ADD CONSTRAINT "telegram_links_user_id_agent_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."agent_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_pending_actions" ADD CONSTRAINT "telegram_pending_actions_user_id_agent_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."agent_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "telegram_link_codes_user_idx" ON "telegram_link_codes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "telegram_link_codes_expires_idx" ON "telegram_link_codes" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "telegram_links_user_idx" ON "telegram_links" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "telegram_pending_actions_tg_idx" ON "telegram_pending_actions" USING btree ("telegram_user_id");