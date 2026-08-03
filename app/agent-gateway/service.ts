import { createHash, randomUUID } from "node:crypto";
import { getGatewayCapability } from "@/app/agent-gateway/catalog";
import {
  findGatewayPlanByKey,
  getGatewayPlan,
  getGatewayReceipt,
  saveGatewayPlan,
} from "@/app/agent-gateway/store";
import {
  GATEWAY_API_VERSION,
  GATEWAY_ENVIRONMENT,
  gatewayPlanInputSchema,
  type GatewayPlan,
  type GatewayPlanInput,
} from "@/app/agent-gateway/types";

const PLAN_TTL_MS = 15 * 60_000;
const MAX_PARAMETERS_BYTES = 16 * 1024;

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function fingerprint(actorId: string, input: GatewayPlanInput) {
  return createHash("sha256")
    .update(stable({ actorId, capabilityId: input.capabilityId, parameters: input.parameters }))
    .digest("hex");
}

function publicPlan(plan: GatewayPlan) {
  const expired = Date.parse(plan.expiresAt) <= Date.now();
  return expired && plan.status !== "blocked"
    ? { ...plan, status: "expired" as const }
    : plan;
}

export function createGatewayPlan(actorId: string, rawInput: unknown) {
  const input = gatewayPlanInputSchema.parse(rawInput);
  if (Buffer.byteLength(JSON.stringify(input.parameters), "utf8") > MAX_PARAMETERS_BYTES) {
    throw new Error("gateway_parameters_too_large");
  }
  const capability = getGatewayCapability(input.capabilityId);
  const requestFingerprint = fingerprint(actorId, input);
  const existing = findGatewayPlanByKey(actorId, input.idempotencyKey);
  if (existing) {
    if (existing.requestFingerprint !== requestFingerprint) {
      throw new Error("gateway_idempotency_conflict");
    }
    return { plan: publicPlan(existing), capability, replayed: true };
  }

  const declared = new Set(input.context?.requirementsSatisfied ?? []);
  const blockers = capability.requirements
    .filter((requirement) => requirement !== "privy_session" && !declared.has(requirement));
  if (capability.status === "planned") blockers.unshift("capability_not_available");
  if (capability.operation !== "read") blockers.push("runtime_preflight_required");

  const approvalRequired = capability.approval !== "none";
  const now = Date.now();
  const plan: GatewayPlan = {
    id: `gwp_${randomUUID()}`,
    apiVersion: GATEWAY_API_VERSION,
    environment: GATEWAY_ENVIRONMENT,
    actorId,
    capabilityId: capability.id,
    status: capability.status === "planned" || blockers.length
      ? "blocked"
      : approvalRequired
        ? "awaiting_approval"
        : "read_only_ready",
    idempotencyKey: input.idempotencyKey,
    requestFingerprint,
    parameters: input.parameters,
    blockers: [...new Set(blockers)],
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + PLAN_TTL_MS).toISOString(),
    safety: {
      nonCustodial: true,
      fundsMoved: false,
      transactionPrepared: false,
      serverSideSigning: false,
      mainnetEnabled: false,
      executionEnabled: false,
    },
    approval: {
      required: approvalRequired,
      method: capability.approval,
      continuationUrl: null,
      reason: approvalRequired
        ? "External agents may plan this action, but the user must continue and approve it inside Carmelita with Privy."
        : null,
    },
  };
  saveGatewayPlan(plan);
  return { plan, capability, replayed: false };
}

export function readGatewayPlan(actorId: string, id: string) {
  const plan = getGatewayPlan(actorId, id);
  if (!plan) throw new Error("gateway_plan_not_found");
  return publicPlan(plan);
}

export function readGatewayReceipt(actorId: string, planId: string) {
  const plan = getGatewayPlan(actorId, planId);
  if (!plan) throw new Error("gateway_plan_not_found");
  const receipt = getGatewayReceipt(actorId, planId);
  return receipt
    ? { available: true as const, receipt }
    : {
        available: false as const,
        planId,
        status: publicPlan(plan).status,
        reason: "No verified execution receipt exists. The v1 gateway never signs or submits transactions server-side.",
      };
}

