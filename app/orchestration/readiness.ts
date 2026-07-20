import { hasDatabase } from "@/db";

export const REUSABLE_WORKFLOW_NODES = [
  "validate_request",
  "check_connection",
  "prepare_action",
  "evaluate_policy",
  "approval_gate",
  "execute_once",
  "verify_evidence",
] as const;

export function getLangGraphReadiness() {
  return {
    implemented: true,
    runtime: "@langchain/langgraph",
    mode: "incremental-production",
    productionRouting: true,
    productionCapabilities: ["notion.workspace.search", "unblck.hub.state", "unblck.hub.book", "unblck.hub.cancel"],
    durablePersistenceConfigured: hasDatabase(),
    approvalBinding: "sha256-frozen-action",
    idempotencyKey: "workflow-id",
    nodes: REUSABLE_WORKFLOW_NODES,
    boundaries: {
      modelCanSign: false,
      policyBeforeExecution: true,
      connectorMustVerifyEvidence: true,
    },
  } as const;
}
