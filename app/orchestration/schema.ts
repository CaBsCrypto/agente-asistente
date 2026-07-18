import { neon } from "@neondatabase/serverless";
import { getDatabaseUrl } from "@/db";

let workflowSchemaPromise: Promise<void> | null = null;

export function ensureWorkflowSchema() {
  if (workflowSchemaPromise) return workflowSchemaPromise;
  workflowSchemaPromise = (async () => {
    const url = getDatabaseUrl();
    if (!url) throw new Error("database_not_configured");
    const sql = neon(url);
    await sql.query(`CREATE TABLE IF NOT EXISTS agent_workflows (
      id text PRIMARY KEY,
      user_id text NOT NULL REFERENCES agent_users(id) ON DELETE CASCADE,
      conversation_id text NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
      connector_id text NOT NULL,
      capability text NOT NULL,
      operation text NOT NULL,
      risk text NOT NULL,
      status text NOT NULL DEFAULT 'planning',
      action_digest text,
      idempotency_key text NOT NULL UNIQUE,
      state jsonb NOT NULL,
      version integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`, []);
    await sql.query(`CREATE TABLE IF NOT EXISTS agent_workflow_events (
      id text PRIMARY KEY,
      workflow_id text NOT NULL REFERENCES agent_workflows(id) ON DELETE CASCADE,
      user_id text NOT NULL REFERENCES agent_users(id) ON DELETE CASCADE,
      node text NOT NULL,
      status text NOT NULL,
      version integer NOT NULL,
      payload jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    )`, []);
    await sql.query("CREATE INDEX IF NOT EXISTS agent_workflows_user_updated_idx ON agent_workflows(user_id, updated_at)", []);
    await sql.query("CREATE INDEX IF NOT EXISTS agent_workflows_status_idx ON agent_workflows(status)", []);
    await sql.query("CREATE INDEX IF NOT EXISTS agent_workflow_events_workflow_created_idx ON agent_workflow_events(workflow_id, created_at)", []);
    await sql.query("CREATE INDEX IF NOT EXISTS agent_workflow_events_user_created_idx ON agent_workflow_events(user_id, created_at)", []);
  })().catch((error) => {
    workflowSchemaPromise = null;
    throw error;
  });
  return workflowSchemaPromise;
}
