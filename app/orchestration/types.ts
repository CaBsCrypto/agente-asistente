import { createHash } from "node:crypto";
import { z } from "zod";

export const workflowOperationSchema = z.enum(["read", "write", "financial"]);
export const workflowRiskSchema = z.enum(["low", "medium", "high"]);
export const workflowStatusSchema = z.enum([
  "planning",
  "awaiting_information",
  "awaiting_connection",
  "awaiting_approval",
  "approved",
  "executing",
  "verifying",
  "completed",
  "blocked",
  "failed",
]);

export const preparedActionSchema = z.object({
  connectorId: z.string().min(1).max(80),
  capability: z.string().min(1).max(120),
  operation: workflowOperationSchema,
  summary: z.string().min(1).max(500),
  parameters: z.record(z.string(), z.unknown()),
  immutable: z.record(z.string(), z.unknown()),
});

export const workflowApprovalSchema = z.object({
  approvedBy: z.string().min(1),
  actionDigest: z.string().regex(/^[a-f0-9]{64}$/),
  approvedAt: z.string().datetime(),
});

export const workflowEvidenceSchema = z.object({
  kind: z.string().min(1).max(80),
  reference: z.string().min(1).max(500),
  verified: z.boolean(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const agentWorkflowStateSchema = z.object({
  workflowId: z.string().min(1),
  userId: z.string().min(1),
  conversationId: z.string().min(1),
  request: z.string().min(1).max(2_000),
  connectorId: z.string().min(1).max(80),
  capability: z.string().min(1).max(120),
  operation: workflowOperationSchema,
  risk: workflowRiskSchema,
  parameters: z.record(z.string(), z.unknown()).default({}),
  status: workflowStatusSchema.default("planning"),
  connection: z.enum(["unknown", "connected", "missing"]).default("unknown"),
  preparedAction: preparedActionSchema.nullable().default(null),
  actionDigest: z.string().regex(/^[a-f0-9]{64}$/).nullable().default(null),
  policyDecision: z.enum(["allow", "approval_required", "deny"]).nullable().default(null),
  policyReasons: z.array(z.string()).default([]),
  approval: workflowApprovalSchema.nullable().default(null),
  execution: z.record(z.string(), z.unknown()).nullable().default(null),
  evidence: z.array(workflowEvidenceSchema).default([]),
  error: z.string().nullable().default(null),
  version: z.number().int().nonnegative().default(0),
});

export type WorkflowOperation = z.infer<typeof workflowOperationSchema>;
export type WorkflowRisk = z.infer<typeof workflowRiskSchema>;
export type WorkflowStatus = z.infer<typeof workflowStatusSchema>;
export type PreparedAction = z.infer<typeof preparedActionSchema>;
export type WorkflowApproval = z.infer<typeof workflowApprovalSchema>;
export type WorkflowEvidence = z.infer<typeof workflowEvidenceSchema>;
export type AgentWorkflowState = z.infer<typeof agentWorkflowStateSchema>;

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function digestPreparedAction(action: PreparedAction) {
  return createHash("sha256").update(canonical(action)).digest("hex");
}

export function createWorkflowState(
  input: Omit<
    AgentWorkflowState,
    | "status"
    | "connection"
    | "preparedAction"
    | "actionDigest"
    | "policyDecision"
    | "policyReasons"
    | "approval"
    | "execution"
    | "evidence"
    | "error"
    | "version"
  >,
) {
  return agentWorkflowStateSchema.parse(input);
}
