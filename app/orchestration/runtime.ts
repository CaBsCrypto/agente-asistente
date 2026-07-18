import type { ConnectorRegistry } from "@/app/orchestration/connector";
import {
  agentWorkflowStateSchema,
  type AgentWorkflowState,
  type WorkflowApproval,
} from "@/app/orchestration/types";
import {
  createPersistedWorkflow,
  loadWorkflow,
  saveWorkflowCheckpoint,
} from "@/app/orchestration/store";
import {
  createDefaultWorkflowDependencies,
  runReusableAgentGraph,
  type WorkflowDependencies,
} from "@/app/orchestration/workflow";

export type PersistedWorkflowRuntime = {
  start(state: AgentWorkflowState): Promise<AgentWorkflowState>;
  resumeApproval(input: {
    userId: string;
    workflowId: string;
    approval: WorkflowApproval;
  }): Promise<AgentWorkflowState>;
  get(userId: string, workflowId: string): Promise<AgentWorkflowState | null>;
};

export function createPersistedWorkflowRuntime(
  connectors: ConnectorRegistry,
  overrides?: Pick<WorkflowDependencies, "evaluatePolicy">,
): PersistedWorkflowRuntime {
  const defaults = createDefaultWorkflowDependencies(connectors);
  const dependencies: WorkflowDependencies = {
    ...defaults,
    ...overrides,
    checkpoint: async (node, state) => {
      await saveWorkflowCheckpoint(node, state);
    },
  };

  return {
    async start(state) {
      const initial = await createPersistedWorkflow(
        agentWorkflowStateSchema.parse(state),
      );
      if (initial.status === "completed") return initial;
      await runReusableAgentGraph(dependencies, initial);
      const result = await loadWorkflow(initial.userId, initial.workflowId);
      if (!result) throw new Error("workflow_not_found_after_run");
      return result;
    },
    async resumeApproval(input) {
      const current = await loadWorkflow(input.userId, input.workflowId);
      if (!current) throw new Error("workflow_not_found");
      if (current.status !== "awaiting_approval") {
        throw new Error("workflow_not_waiting_for_approval");
      }
      if (
        input.approval.approvedBy !== current.userId ||
        input.approval.actionDigest !== current.actionDigest
      ) {
        throw new Error("approval_does_not_match_prepared_action");
      }
      await saveWorkflowCheckpoint("approval_received", {
        ...current,
        approval: input.approval,
      });
      const approved = await loadWorkflow(input.userId, input.workflowId);
      if (!approved) throw new Error("workflow_not_found_after_approval");
      await runReusableAgentGraph(dependencies, approved);
      const result = await loadWorkflow(input.userId, input.workflowId);
      if (!result) throw new Error("workflow_not_found_after_resume");
      return result;
    },
    get(userId, workflowId) {
      return loadWorkflow(userId, workflowId);
    },
  };
}
