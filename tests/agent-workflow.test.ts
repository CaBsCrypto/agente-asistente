import assert from "node:assert/strict";
import test from "node:test";
import type {
  AgentConnector,
  ConnectorContext,
} from "../app/orchestration/connector";
import { createConnectorRegistry } from "../app/orchestration/connector";
import {
  createWorkflowState,
  type AgentWorkflowState,
  type PreparedAction,
} from "../app/orchestration/types";
import {
  createDefaultWorkflowDependencies,
  runReusableAgentGraph,
} from "../app/orchestration/workflow";

function testConnector(input?: { connected?: boolean }) {
  let executions = 0;
  const completed = new Map<string, Record<string, unknown>>();
  const connector: AgentConnector = {
    id: "test",
    capabilities: [
      { id: "search", operation: "read", description: "Read data" },
      { id: "deposit", operation: "financial", description: "Deposit funds" },
    ],
    async connectionStatus() {
      return input?.connected === false ? "missing" : "connected";
    },
    async prepare(context: ConnectorContext, capability: string) {
      return {
        connectorId: "test",
        capability,
        operation: capability === "search" ? "read" : "financial",
        summary: `${capability} for ${context.userId}`,
        parameters: context.parameters,
        immutable: { destination: "testnet-vault", ...context.parameters },
      } as PreparedAction;
    },
    async execute(_context, action, idempotencyKey) {
      const previous = completed.get(idempotencyKey);
      if (previous) return previous;
      executions += 1;
      const result = { transactionRef: `test-${executions}`, action: action.capability };
      completed.set(idempotencyKey, result);
      return result;
    },
    async verify(_context, execution) {
      return [{
        kind: "test_receipt",
        reference: String(execution.transactionRef),
        verified: true,
        metadata: {},
      }];
    },
  };
  return { connector, executions: () => executions };
}

function state(
  operation: "read" | "financial",
  capability: "search" | "deposit",
) {
  return createWorkflowState({
    workflowId: `wf-${operation}`,
    userId: "user-1",
    conversationId: "conversation-1",
    request: capability,
    connectorId: "test",
    capability,
    operation,
    risk: operation === "read" ? "low" : "high",
    parameters: operation === "read" ? { query: "roadmap" } : { amount: "1", asset: "XLM" },
  });
}

test("LangGraph completes a connected low-risk read without approval", async () => {
  const fixture = testConnector();
  const dependencies = createDefaultWorkflowDependencies(
    createConnectorRegistry([fixture.connector]),
  );
  const result = await runReusableAgentGraph(dependencies, state("read", "search"));
  assert.equal(result.status, "completed");
  assert.equal(result.policyDecision, "allow");
  assert.equal(result.evidence[0]?.verified, true);
  assert.equal(fixture.executions(), 1);
});

test("LangGraph pauses a financial action and resumes only with matching approval", async () => {
  const fixture = testConnector();
  const dependencies = createDefaultWorkflowDependencies(
    createConnectorRegistry([fixture.connector]),
  );
  const paused = await runReusableAgentGraph(
    dependencies,
    state("financial", "deposit"),
  );
  assert.equal(paused.status, "awaiting_approval");
  assert.equal(fixture.executions(), 0);
  assert.ok(paused.actionDigest);

  const approved: AgentWorkflowState = {
    ...paused,
    approval: {
      approvedBy: paused.userId,
      actionDigest: paused.actionDigest!,
      approvedAt: new Date().toISOString(),
    },
  };
  const completed = await runReusableAgentGraph(dependencies, approved);
  assert.equal(completed.status, "completed");
  assert.equal(fixture.executions(), 1);

  const replayed = await runReusableAgentGraph(dependencies, completed);
  assert.equal(replayed.status, "completed");
  assert.equal(fixture.executions(), 1);
});

test("LangGraph blocks approval for a different frozen action", async () => {
  const fixture = testConnector();
  const dependencies = createDefaultWorkflowDependencies(
    createConnectorRegistry([fixture.connector]),
  );
  const paused = await runReusableAgentGraph(
    dependencies,
    state("financial", "deposit"),
  );
  const result = await runReusableAgentGraph(dependencies, {
    ...paused,
    approval: {
      approvedBy: paused.userId,
      actionDigest: "0".repeat(64),
      approvedAt: new Date().toISOString(),
    },
  });
  assert.equal(result.status, "blocked");
  assert.equal(result.error, "approval_does_not_match_prepared_action");
  assert.equal(fixture.executions(), 0);
});

test("LangGraph waits for a missing provider connection", async () => {
  const fixture = testConnector({ connected: false });
  const dependencies = createDefaultWorkflowDependencies(
    createConnectorRegistry([fixture.connector]),
  );
  const result = await runReusableAgentGraph(dependencies, state("read", "search"));
  assert.equal(result.status, "awaiting_connection");
  assert.equal(result.preparedAction, null);
  assert.equal(fixture.executions(), 0);
});
