import { END, START, StateGraph } from "@langchain/langgraph";
import type {
  AgentConnector,
  ConnectorRegistry,
} from "@/app/orchestration/connector";
import {
  connectorContext,
  requireConnector,
} from "@/app/orchestration/connector";
import {
  agentWorkflowStateSchema,
  digestPreparedAction,
  type AgentWorkflowState,
} from "@/app/orchestration/types";

export type WorkflowPolicyResult = {
  decision: "allow" | "approval_required" | "deny";
  reasons: string[];
};

export type WorkflowDependencies = {
  connectors: ConnectorRegistry;
  evaluatePolicy: (
    state: AgentWorkflowState,
  ) => Promise<WorkflowPolicyResult>;
  checkpoint?: (
    node: string,
    state: AgentWorkflowState,
  ) => Promise<void>;
};

type StateUpdate = Partial<AgentWorkflowState>;

const terminal = new Set<AgentWorkflowState["status"]>([
  "completed",
  "blocked",
  "failed",
]);

function withCheckpoint(
  name: string,
  dependencies: WorkflowDependencies,
  node: (state: AgentWorkflowState) => Promise<StateUpdate>,
) {
  return async (state: AgentWorkflowState) => {
    if (terminal.has(state.status)) return {};
    try {
      const update = await node(state);
      if (dependencies.checkpoint) {
        const next = agentWorkflowStateSchema.parse({ ...state, ...update });
        await dependencies.checkpoint(name, next);
      }
      return update;
    } catch (error) {
      const update: StateUpdate = {
        status: "failed",
        error: error instanceof Error ? error.message : "workflow_node_failed",
      };
      if (dependencies.checkpoint) {
        await dependencies.checkpoint(
          name,
          agentWorkflowStateSchema.parse({ ...state, ...update }),
        );
      }
      return update;
    }
  };
}

function defaultPolicy(state: AgentWorkflowState): WorkflowPolicyResult {
  if (state.operation === "financial") {
    return { decision: "approval_required", reasons: ["financial_action"] };
  }
  if (state.operation === "write" || state.risk !== "low") {
    return { decision: "approval_required", reasons: ["state_change"] };
  }
  return { decision: "allow", reasons: ["read_only_low_risk"] };
}

export function createDefaultWorkflowDependencies(
  connectors: ConnectorRegistry,
): WorkflowDependencies {
  return {
    connectors,
    evaluatePolicy: async (state) => defaultPolicy(state),
  };
}

function connectorFor(
  dependencies: WorkflowDependencies,
  state: AgentWorkflowState,
): AgentConnector {
  return requireConnector(dependencies.connectors, state);
}

export function buildReusableAgentGraph(dependencies: WorkflowDependencies) {
  const graph = new StateGraph(agentWorkflowStateSchema)
    .addNode(
      "validate_request",
      withCheckpoint("validate_request", dependencies, async (state) => {
        connectorFor(dependencies, state);
        return { status: "planning", error: null };
      }),
    )
    .addNode(
      "check_connection",
      withCheckpoint("check_connection", dependencies, async (state) => {
        if (state.connection === "connected") return {};
        const connection = await connectorFor(
          dependencies,
          state,
        ).connectionStatus(connectorContext(state));
        return connection === "connected"
          ? { connection }
          : { connection, status: "awaiting_connection" };
      }),
    )
    .addNode(
      "prepare_action",
      withCheckpoint("prepare_action", dependencies, async (state) => {
        if (state.status === "awaiting_connection" || state.preparedAction) return {};
        const preparedAction = await connectorFor(
          dependencies,
          state,
        ).prepare(connectorContext(state), state.capability);
        return {
          preparedAction,
          actionDigest: digestPreparedAction(preparedAction),
        };
      }),
    )
    .addNode(
      "evaluate_policy",
      withCheckpoint("evaluate_policy", dependencies, async (state) => {
        if (state.status === "awaiting_connection" || !state.preparedAction) return {};
        if (state.policyDecision) return {};
        const result = await dependencies.evaluatePolicy(state);
        return {
          policyDecision: result.decision,
          policyReasons: result.reasons,
          status: result.decision === "deny" ? "blocked" : state.status,
        };
      }),
    )
    .addNode(
      "approval_gate",
      withCheckpoint("approval_gate", dependencies, async (state) => {
        if (!state.preparedAction || !state.actionDigest) return {};
        if (state.policyDecision === "deny") return { status: "blocked" };
        if (state.policyDecision !== "approval_required") {
          return { status: "approved" };
        }
        if (!state.approval) return { status: "awaiting_approval" };
        if (
          state.approval.approvedBy !== state.userId ||
          state.approval.actionDigest !== state.actionDigest
        ) {
          return {
            status: "blocked",
            error: "approval_does_not_match_prepared_action",
          };
        }
        return { status: "approved" };
      }),
    )
    .addNode(
      "execute_once",
      withCheckpoint("execute_once", dependencies, async (state) => {
        if (state.status !== "approved" || !state.preparedAction) return {};
        if (state.execution) return { status: "verifying" };
        const execution = await connectorFor(
          dependencies,
          state,
        ).execute(
          connectorContext(state),
          state.preparedAction,
          state.workflowId,
        );
        return { execution, status: "verifying" };
      }),
    )
    .addNode(
      "verify_evidence",
      withCheckpoint("verify_evidence", dependencies, async (state) => {
        if (state.status !== "verifying" || !state.execution) return {};
        const evidence = await connectorFor(
          dependencies,
          state,
        ).verify(connectorContext(state), state.execution);
        const verified = evidence.length > 0 && evidence.every((item) => item.verified);
        return verified
          ? { evidence, status: "completed" }
          : { evidence, status: "failed", error: "execution_not_verified" };
      }),
    )
    .addEdge(START, "validate_request")
    .addEdge("validate_request", "check_connection")
    .addEdge("check_connection", "prepare_action")
    .addEdge("prepare_action", "evaluate_policy")
    .addEdge("evaluate_policy", "approval_gate")
    .addEdge("approval_gate", "execute_once")
    .addEdge("execute_once", "verify_evidence")
    .addEdge("verify_evidence", END);

  return graph.compile();
}

export async function runReusableAgentGraph(
  dependencies: WorkflowDependencies,
  state: AgentWorkflowState,
) {
  const parsed = agentWorkflowStateSchema.parse(state);
  const result = await buildReusableAgentGraph(dependencies).invoke(parsed);
  return agentWorkflowStateSchema.parse(result);
}
