CREATE TABLE "agent_market_watchlist" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"symbol" text NOT NULL,
	"source" text DEFAULT 'coinmarketcap' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_market_watchlist" ADD CONSTRAINT "agent_market_watchlist_user_id_agent_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."agent_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_market_watchlist_user_symbol_uidx" ON "agent_market_watchlist" USING btree ("user_id","symbol");--> statement-breakpoint
CREATE INDEX "agent_market_watchlist_user_idx" ON "agent_market_watchlist" USING btree ("user_id");