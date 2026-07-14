import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { desc, eq } from "drizzle-orm";
import { getDatabaseUrl, getDb, hasDatabase } from "@/db";
import { agentActivities, agentUsers, agentWallets } from "@/db/schema";

let accountSchemaPromise: Promise<void> | null = null;

async function ensureAgentAccountSchema() {
  if (accountSchemaPromise) return accountSchemaPromise;

  accountSchemaPromise = (async () => {
    const url = getDatabaseUrl();
    if (!url) throw new Error("database_not_configured");
    const sql = neon(url);

    await sql.query("CREATE TABLE IF NOT EXISTS agent_users (id text PRIMARY KEY, email text, status text NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now(), last_seen_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())", []);
    await sql.query("CREATE TABLE IF NOT EXISTS agent_wallets (id text PRIMARY KEY, user_id text NOT NULL REFERENCES agent_users(id) ON DELETE CASCADE, address text NOT NULL, chain_type text NOT NULL, network text NOT NULL, status text NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())", []);
    await sql.query("CREATE TABLE IF NOT EXISTS agent_activities (id text PRIMARY KEY, user_id text NOT NULL REFERENCES agent_users(id) ON DELETE CASCADE, event_type text NOT NULL, summary text NOT NULL, metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now())", []);
    await sql.query("CREATE UNIQUE INDEX IF NOT EXISTS agent_wallets_address_uidx ON agent_wallets(address)", []);
    await sql.query("CREATE INDEX IF NOT EXISTS agent_wallets_user_idx ON agent_wallets(user_id)", []);
    await sql.query("CREATE INDEX IF NOT EXISTS agent_users_email_idx ON agent_users(email)", []);
    await sql.query("CREATE INDEX IF NOT EXISTS agent_users_last_seen_idx ON agent_users(last_seen_at)", []);
    await sql.query("CREATE INDEX IF NOT EXISTS agent_activities_user_created_idx ON agent_activities(user_id, created_at)", []);
  })().catch((error) => {
    accountSchemaPromise = null;
    throw error;
  });

  return accountSchemaPromise;
}

type WalletRecord = {
  id: string;
  address: string;
  chainType: string;
  created: boolean;
};

export async function persistAgentAccount(input: {
  userId: string;
  email: string | null;
  wallet: WalletRecord;
  activation: "active" | "activated" | "pending";
}) {
  if (!hasDatabase()) {
    return {
      persistence: { configured: false, provider: "Neon Postgres" },
      profile: { id: input.userId, email: input.email, status: "active" },
      history: [] as { id: string; type: string; summary: string; createdAt: string }[],
    };
  }

  await ensureAgentAccountSchema();
  const db = getDb();
  const now = new Date();

  await db
    .insert(agentUsers)
    .values({
      id: input.userId,
      email: input.email,
      status: "active",
      lastSeenAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: agentUsers.id,
      set: { email: input.email, status: "active", lastSeenAt: now, updatedAt: now },
    });

  await db
    .insert(agentWallets)
    .values({
      id: input.wallet.id,
      userId: input.userId,
      address: input.wallet.address,
      chainType: input.wallet.chainType,
      network: "stellar:testnet",
      status: input.activation === "pending" ? "pending" : "active",
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: agentWallets.id,
      set: {
        userId: input.userId,
        address: input.wallet.address,
        chainType: input.wallet.chainType,
        network: "stellar:testnet",
        status: input.activation === "pending" ? "pending" : "active",
        updatedAt: now,
      },
    });

  const events: {
    id: string;
    userId: string;
    eventType: string;
    summary: string;
    metadata: Record<string, unknown>;
  }[] = [
    {
      id: randomUUID(),
      userId: input.userId,
      eventType: "session.started",
      summary: "Signed in securely with Privy",
      metadata: { provider: "privy" },
    },
  ];

  if (input.wallet.created) {
    events.push({
      id: randomUUID(),
      userId: input.userId,
      eventType: "wallet.created",
      summary: "Stellar Testnet wallet created",
      metadata: { address: input.wallet.address, network: "stellar:testnet" },
    });
  }

  await db.insert(agentActivities).values(events);

  const history = await db
    .select({
      id: agentActivities.id,
      type: agentActivities.eventType,
      summary: agentActivities.summary,
      createdAt: agentActivities.createdAt,
    })
    .from(agentActivities)
    .where(eq(agentActivities.userId, input.userId))
    .orderBy(desc(agentActivities.createdAt))
    .limit(8);

  return {
    persistence: { configured: true, provider: "Neon Postgres" },
    profile: { id: input.userId, email: input.email, status: "active" },
    history: history.map((event) => ({
      ...event,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}