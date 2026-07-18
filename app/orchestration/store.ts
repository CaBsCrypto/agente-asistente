import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  agentWorkflowEvents,
  agentWorkflows,
} from "@/db/schema";
import {
  agentWorkflowStateSchema,
  type AgentWorkflowState,
} from "@/app/orchestration/types";
import { ensureWorkflowSchema } from "@/app/orchestration/schema";

function publicState(value: unknown) {
  return agentWorkflowStateSchema.parse(value);
}

export async function loadWorkflow(userId: string, workflowId: string) {
  await ensureWorkflowSchema();
  const rows = await getDb()
    .select()
    .from(agentWorkflows)
    .where(and(eq(agentWorkflows.id, workflowId), eq(agentWorkflows.userId, userId)))
    .limit(1);
  return rows[0] ? publicState(rows[0].state) : null;
}

export async function createPersistedWorkflow(state: AgentWorkflowState) {
  await ensureWorkflowSchema();
  const parsed = agentWorkflowStateSchema.parse(state);
  await getDb()
    .insert(agentWorkflows)
    .values({
      id: parsed.workflowId,
      userId: parsed.userId,
      conversationId: parsed.conversationId,
      connectorId: parsed.connectorId,
      capability: parsed.capability,
      operation: parsed.operation,
      risk: parsed.risk,
      status: parsed.status,
      actionDigest: parsed.actionDigest,
      idempotencyKey: parsed.workflowId,
      state: parsed as unknown as Record<string, unknown>,
      version: parsed.version,
    })
    .onConflictDoNothing({ target: agentWorkflows.idempotencyKey });
  const stored = await loadWorkflow(parsed.userId, parsed.workflowId);
  if (!stored) throw new Error("workflow_create_failed");
  return stored;
}

export async function saveWorkflowCheckpoint(
  node: string,
  state: AgentWorkflowState,
) {
  const parsed = agentWorkflowStateSchema.parse(state);
  const existing = await loadWorkflow(parsed.userId, parsed.workflowId);
  if (!existing) throw new Error("workflow_not_found");
  if (existing.status === "completed" && parsed.status !== "completed") {
    throw new Error("completed_workflow_is_immutable");
  }
  const version = existing.version + 1;
  const next = agentWorkflowStateSchema.parse({ ...parsed, version });
  const updated = await getDb()
    .update(agentWorkflows)
    .set({
      status: next.status,
      actionDigest: next.actionDigest,
      state: next as unknown as Record<string, unknown>,
      version,
      updatedAt: new Date(),
    })
    .where(and(
      eq(agentWorkflows.id, next.workflowId),
      eq(agentWorkflows.userId, next.userId),
      eq(agentWorkflows.version, existing.version),
    ))
    .returning({ id: agentWorkflows.id });
  if (!updated.length) throw new Error("workflow_version_conflict");
  await getDb().insert(agentWorkflowEvents).values({
    id: randomUUID(),
    workflowId: next.workflowId,
    userId: next.userId,
    node,
    status: next.status,
    version,
    payload: {
      connectorId: next.connectorId,
      capability: next.capability,
      policyDecision: next.policyDecision,
      actionDigest: next.actionDigest,
      error: next.error,
    },
  });
  return next;
}

export async function listWorkflowEvents(userId: string, workflowId: string) {
  await ensureWorkflowSchema();
  return getDb()
    .select({
      node: agentWorkflowEvents.node,
      status: agentWorkflowEvents.status,
      version: agentWorkflowEvents.version,
      payload: agentWorkflowEvents.payload,
      createdAt: agentWorkflowEvents.createdAt,
    })
    .from(agentWorkflowEvents)
    .where(and(
      eq(agentWorkflowEvents.workflowId, workflowId),
      eq(agentWorkflowEvents.userId, userId),
    ))
    .orderBy(asc(agentWorkflowEvents.version));
}
