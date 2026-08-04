import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import {
  createGatewayPlan,
  readGatewayPlan,
  readGatewayReceipt,
} from "../app/agent-gateway/service";
import { NeonGatewayStore } from "../app/agent-gateway/store";
import { getDb } from "../db";
import { agentGatewayPlans } from "../db/schema";

for (const line of readFileSync(".env.migrate", "utf8").split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (!match) continue;
  const value = match[2].replace(/^["']|["']$/g, "").trim();
  if (value) process.env[match[1]] = value;
}

const suffix = randomUUID();
const actorId = `gateway-smoke-${suffix}`;
const idempotencyKey = `gateway-neon-${suffix}`;
const store = new NeonGatewayStore();

const input = {
  capabilityId: "stellar.wallet.status",
  idempotencyKey,
  parameters: { detail: "summary" },
  context: { requirementsSatisfied: ["stellar_wallet"] },
};

let planId: string | undefined;
try {
  const first = await createGatewayPlan(actorId, input, store);
  const replay = await createGatewayPlan(actorId, input, store);
  planId = first.plan.id;

  assert.equal(first.replayed, false);
  assert.equal(replay.replayed, true);
  assert.equal(replay.plan.id, first.plan.id);

  await assert.rejects(
    createGatewayPlan(
      actorId,
      { ...input, parameters: { detail: "full" } },
      store,
    ),
    /gateway_idempotency_conflict/,
  );
  await assert.rejects(
    readGatewayPlan("different-user", first.plan.id, store),
    /gateway_plan_not_found/,
  );

  const receipt = {
    id: `gwr_${suffix}`,
    planId: first.plan.id,
    actorId,
    capabilityId: first.plan.capabilityId,
    network: "stellar:testnet" as const,
    status: "verified" as const,
    transactionHash: null,
    evidence: { verifier: "gateway-neon-smoke", simulated: true },
    createdAt: new Date().toISOString(),
  };
  await store.saveVerifiedReceipt(receipt);
  await store.saveVerifiedReceipt(receipt);
  assert.equal((await readGatewayReceipt(actorId, first.plan.id, store)).available, true);
  await assert.rejects(
    store.saveVerifiedReceipt({
      ...receipt,
      id: `gwr_conflict_${suffix}`,
      evidence: { verifier: "different-evidence" },
    }),
    /gateway_receipt_conflict/,
  );
  await assert.rejects(
    store.saveVerifiedReceipt({ ...receipt, actorId: "different-user" }),
    /gateway_receipt_plan_mismatch/,
  );

  console.log("Neon Gateway smoke: PASS");
  console.log("- durable insert: PASS");
  console.log("- same-input replay: PASS");
  console.log("- changed-input conflict: PASS");
  console.log("- cross-user isolation: PASS");
  console.log("- verified receipt persistence: PASS");
  console.log("- receipt replacement protection: PASS");
} finally {
  if (planId) {
    await getDb().delete(agentGatewayPlans).where(eq(agentGatewayPlans.id, planId));
  }
}
