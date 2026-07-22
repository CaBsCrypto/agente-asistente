import { neon } from "@neondatabase/serverless";
import { getDatabaseUrl } from "@/db";

let schemaPromise: Promise<void> | null = null;

const statements = [
  `CREATE TABLE IF NOT EXISTS integration_recommendations (
    id text PRIMARY KEY,
    integration_name text NOT NULL,
    email text NOT NULL,
    use_case text,
    locale text NOT NULL DEFAULT 'en',
    source text NOT NULL DEFAULT 'landing',
    status text NOT NULL DEFAULT 'new',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  "CREATE UNIQUE INDEX IF NOT EXISTS integration_recommendations_email_name_uidx ON integration_recommendations(email, integration_name)",
  "CREATE INDEX IF NOT EXISTS integration_recommendations_status_created_idx ON integration_recommendations(status, created_at)",
  "CREATE INDEX IF NOT EXISTS integration_recommendations_name_idx ON integration_recommendations(integration_name)",
];

export function ensureIntegrationRecommendationSchema() {
  if (schemaPromise) return schemaPromise;

  schemaPromise = (async () => {
    const url = getDatabaseUrl();
    if (!url) throw new Error("database_not_configured");
    const sql = neon(url);

    for (const statement of statements) {
      await sql.query(statement, []);
    }
  })().catch((error) => {
    schemaPromise = null;
    throw error;
  });

  return schemaPromise;
}
