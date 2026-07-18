import type {
  AgentWorkflowState,
  PreparedAction,
  WorkflowEvidence,
  WorkflowOperation,
} from "@/app/orchestration/types";

export type ConnectorCapability = {
  id: string;
  operation: WorkflowOperation;
  description: string;
};

export type ConnectorContext = {
  workflowId: string;
  userId: string;
  conversationId: string;
  request: string;
  parameters: Record<string, unknown>;
};

export interface AgentConnector {
  id: string;
  capabilities: ConnectorCapability[];
  connectionStatus(context: ConnectorContext): Promise<"connected" | "missing">;
  prepare(context: ConnectorContext, capability: string): Promise<PreparedAction>;
  execute(
    context: ConnectorContext,
    action: PreparedAction,
    idempotencyKey: string,
  ): Promise<Record<string, unknown>>;
  verify(
    context: ConnectorContext,
    execution: Record<string, unknown>,
  ): Promise<WorkflowEvidence[]>;
}

export type ConnectorRegistry = ReadonlyMap<string, AgentConnector>;

export function connectorContext(state: AgentWorkflowState): ConnectorContext {
  return {
    workflowId: state.workflowId,
    userId: state.userId,
    conversationId: state.conversationId,
    request: state.request,
    parameters: state.parameters,
  };
}

export function createConnectorRegistry(connectors: AgentConnector[]) {
  const registry = new Map<string, AgentConnector>();
  for (const connector of connectors) {
    if (registry.has(connector.id)) {
      throw new Error(`duplicate_connector:${connector.id}`);
    }
    registry.set(connector.id, connector);
  }
  return registry as ConnectorRegistry;
}

export function requireConnector(
  registry: ConnectorRegistry,
  state: AgentWorkflowState,
) {
  const connector = registry.get(state.connectorId);
  if (!connector) throw new Error(`connector_not_found:${state.connectorId}`);
  const capability = connector.capabilities.find(
    (item) => item.id === state.capability,
  );
  if (!capability) throw new Error(`capability_not_found:${state.capability}`);
  if (capability.operation !== state.operation) {
    throw new Error("connector_operation_mismatch");
  }
  return connector;
}
