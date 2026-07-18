import assert from "node:assert/strict";
import test from "node:test";
import {
  agentPlanSchema,
  enforcePlannerSafety,
  getAgentPlannerReadiness,
  shouldUseAgentPlanner,
} from "../app/agent-planner";

const basePlan = agentPlanSchema.parse({
  intent: "soroswap_swap",
  language: "es",
  confidence: 0.95,
  summary: "Intercambiar XLM por USDC",
  financial: false,
  requiresApproval: false,
  parameters: {
    provider: "Soroswap",
    asset: null,
    assetIn: "XLM",
    assetOut: "USDC",
    amount: "1",
    maxSlippageBps: 50,
    symbol: null,
    query: null,
  },
});

test("forces approval for every financial planner intent", () => {
  const safe = enforcePlannerSafety(basePlan);
  assert.equal(safe.financial, true);
  assert.equal(safe.requiresApproval, true);
});

test("does not label a read-only Soroswap quote as financial", () => {
  const safe = enforcePlannerSafety({
    ...basePlan,
    intent: "soroswap_quote",
    financial: true,
    requiresApproval: false,
  });
  assert.equal(safe.financial, false);
  assert.equal(safe.requiresApproval, false);
});

test("planner is opt-in and requires a server API key", () => {
  const originalEnabled = process.env.AGENT_LANGCHAIN_ENABLED;
  const originalProvider = process.env.AGENT_LANGCHAIN_PROVIDER;
  const originalOpenRouterKey = process.env.OPENROUTER_API_KEY;
  process.env.AGENT_LANGCHAIN_ENABLED = "true";
  process.env.AGENT_LANGCHAIN_PROVIDER = "openrouter";
  delete process.env.OPENROUTER_API_KEY;
  assert.equal(getAgentPlannerReadiness().configured, false);
  assert.equal(
    shouldUseAgentPlanner({ hasDeterministicIntent: false, message: "hello" }),
    false,
  );
  process.env.AGENT_LANGCHAIN_ENABLED = originalEnabled;
  process.env.AGENT_LANGCHAIN_PROVIDER = originalProvider;
  process.env.OPENROUTER_API_KEY = originalOpenRouterKey;
});

test("planner defaults to OpenRouter and accepts its server key", () => {
  const originalEnabled = process.env.AGENT_LANGCHAIN_ENABLED;
  const originalProvider = process.env.AGENT_LANGCHAIN_PROVIDER;
  const originalKey = process.env.OPENROUTER_API_KEY;
  process.env.AGENT_LANGCHAIN_ENABLED = "true";
  delete process.env.AGENT_LANGCHAIN_PROVIDER;
  process.env.OPENROUTER_API_KEY = "test-key";
  const readiness = getAgentPlannerReadiness();
  assert.equal(readiness.provider, "openrouter");
  assert.equal(readiness.configured, true);
  process.env.AGENT_LANGCHAIN_ENABLED = originalEnabled;
  process.env.AGENT_LANGCHAIN_PROVIDER = originalProvider;
  process.env.OPENROUTER_API_KEY = originalKey;
});
