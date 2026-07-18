import {
  agentPlanSchema,
  getAgentPlannerReadiness,
  planAgentRequest,
} from "../app/agent-planner";

process.env.AGENT_LANGCHAIN_ENABLED ??= "true";
process.env.AGENT_LANGCHAIN_PROVIDER ??= "openrouter";
process.env.AGENT_LANGCHAIN_MODEL ??= "openrouter/free";

const readiness = getAgentPlannerReadiness();
if (!readiness.configured) {
  throw new Error(
    "planner_not_configured: add OPENROUTER_API_KEY to .env.local and enable AGENT_LANGCHAIN_ENABLED",
  );
}

const plan = await planAgentRequest({
  message:
    "Quiero depositar 1 USDC en DeFindex Testnet, pero quiero revisar todo antes de aprobar.",
  walletReady: true,
  connectedProviders: ["defindex"],
  memoryDomains: ["finance", "risk"],
});

if (!plan) throw new Error("planner_returned_no_plan");
const checked = agentPlanSchema.parse(plan);

if (!checked.financial || !checked.requiresApproval) {
  throw new Error("planner_safety_boundary_failed");
}

console.log(
  JSON.stringify(
    {
      ok: true,
      provider: readiness.provider,
      model: readiness.model,
      boundary: "plan-only; no transaction prepared, signed, or submitted",
      plan: checked,
    },
    null,
    2,
  ),
);
