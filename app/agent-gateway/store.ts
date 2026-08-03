import type { GatewayPlan, GatewayReceipt } from "@/app/agent-gateway/types";

type GatewayState = {
  plans: Map<string, GatewayPlan>;
  planKeys: Map<string, string>;
  receipts: Map<string, GatewayReceipt>;
};

const globalState = globalThis as typeof globalThis & {
  __carmelitaAgentGateway?: GatewayState;
};

const state = globalState.__carmelitaAgentGateway ?? {
  plans: new Map<string, GatewayPlan>(),
  planKeys: new Map<string, string>(),
  receipts: new Map<string, GatewayReceipt>(),
};
globalState.__carmelitaAgentGateway = state;

export function saveGatewayPlan(plan: GatewayPlan) {
  state.plans.set(plan.id, plan);
  state.planKeys.set(`${plan.actorId}:${plan.idempotencyKey}`, plan.id);
}

export function findGatewayPlanByKey(actorId: string, idempotencyKey: string) {
  const id = state.planKeys.get(`${actorId}:${idempotencyKey}`);
  return id ? state.plans.get(id) : undefined;
}

export function getGatewayPlan(actorId: string, id: string) {
  const plan = state.plans.get(id);
  return plan?.actorId === actorId ? plan : undefined;
}

export function getGatewayReceipt(actorId: string, planId: string) {
  const receipt = state.receipts.get(planId);
  return receipt?.actorId === actorId ? receipt : undefined;
}

// Execution adapters may call this only after their own chain/provider verifier
// has produced exact evidence. The public v1 gateway intentionally exposes no
// route that can manufacture or submit a receipt.
export function saveVerifiedGatewayReceipt(receipt: GatewayReceipt) {
  state.receipts.set(receipt.planId, receipt);
}

