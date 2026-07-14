import { neon } from "@neondatabase/serverless";
import { getDatabaseUrl } from "@/db";

const MIGRATION_WHEN = 1784016883725;
const MIGRATION_HASH =
  "c7d73d27077d02c604d644dc58248cc26454a7083631b8347f84f10a7c0118d2";

let migrationPromise: Promise<void> | null = null;

const statements = [
  "CREATE SCHEMA IF NOT EXISTS drizzle",
  "CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)",
  "CREATE TABLE IF NOT EXISTS service_providers (id text PRIMARY KEY, slug text NOT NULL, name text NOT NULL, contact_email text, status text DEFAULT 'active' NOT NULL, metadata jsonb DEFAULT '{}'::jsonb NOT NULL, created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL)",
  "CREATE TABLE IF NOT EXISTS service_offers (id text PRIMARY KEY, provider_id text NOT NULL REFERENCES service_providers(id) ON DELETE cascade, external_id text NOT NULL, title text NOT NULL, description text NOT NULL, kind text NOT NULL, amount numeric(20, 7) NOT NULL, currency text NOT NULL, network text NOT NULL, status text DEFAULT 'draft' NOT NULL, metadata jsonb DEFAULT '{}'::jsonb NOT NULL, created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL)",
  "CREATE TABLE IF NOT EXISTS mcp_access_tokens (id text PRIMARY KEY, subject_type text NOT NULL, subject_id text NOT NULL, name text NOT NULL, token_prefix text NOT NULL, token_hash text NOT NULL, scopes jsonb DEFAULT '[]'::jsonb NOT NULL, status text DEFAULT 'active' NOT NULL, expires_at timestamptz, last_used_at timestamptz, created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL)",
  "CREATE UNIQUE INDEX IF NOT EXISTS service_providers_slug_uidx ON service_providers(slug)",
  "CREATE INDEX IF NOT EXISTS service_providers_status_idx ON service_providers(status)",
  "CREATE UNIQUE INDEX IF NOT EXISTS service_offers_provider_external_uidx ON service_offers(provider_id, external_id)",
  "CREATE INDEX IF NOT EXISTS service_offers_provider_status_idx ON service_offers(provider_id, status)",
  "CREATE UNIQUE INDEX IF NOT EXISTS mcp_access_tokens_hash_uidx ON mcp_access_tokens(token_hash)",
  "CREATE INDEX IF NOT EXISTS mcp_access_tokens_subject_idx ON mcp_access_tokens(subject_type, subject_id)",
  "CREATE INDEX IF NOT EXISTS mcp_access_tokens_status_idx ON mcp_access_tokens(status)",
];

export function ensureMcpProviderSchema() {
  if (migrationPromise) return migrationPromise;
  migrationPromise = (async () => {
    const url = getDatabaseUrl();
    if (!url) throw new Error("database_not_configured");
    const sql = neon(url);

    await sql.query(statements[0], []);
    await sql.query(statements[1], []);
    const applied = await sql.query(
      "select created_at from drizzle.__drizzle_migrations where created_at = $1 limit 1",
      [MIGRATION_WHEN],
    );
    if (applied.length) return;

    for (const statement of statements.slice(2)) {
      await sql.query(statement, []);
    }
    await sql.query(
      "insert into drizzle.__drizzle_migrations (hash, created_at) select $1, $2 where not exists (select 1 from drizzle.__drizzle_migrations where created_at = $2)",
      [MIGRATION_HASH, MIGRATION_WHEN],
    );
  })().catch((error) => {
    migrationPromise = null;
    throw error;
  });
  return migrationPromise;
}
