import type { PaymentPayload, PaymentRequirements, SettleResponse, VerifyResponse } from "@x402/core/types";
import { AVALANCHE_X402 } from "./config";

type GaslessEnvelope = {
  paymentPayload: {
    token: string;
    payload: {
      authorization: {
        from: string;
        to: string;
        value: string;
        validAfter: number;
        validBefore: number;
        nonce: string;
      };
      signature: string;
    };
  };
  paymentRequirements: {
    chainId: number;
  };
};

export interface AvalancheX402Facilitator {
  verify(payload: PaymentPayload, requirement: PaymentRequirements): Promise<VerifyResponse>;
  settle(payload: PaymentPayload, requirement: PaymentRequirements): Promise<SettleResponse>;
}

function sameRequirement(actual: PaymentRequirements, expected: PaymentRequirements) {
  return actual.scheme === expected.scheme &&
    actual.network === expected.network &&
    actual.asset.toLowerCase() === expected.asset.toLowerCase() &&
    actual.amount === expected.amount &&
    actual.payTo.toLowerCase() === expected.payTo.toLowerCase() &&
    actual.maxTimeoutSeconds === expected.maxTimeoutSeconds;
}

export function buildGaslessEnvelope(
  payload: PaymentPayload,
  requirement: PaymentRequirements,
): GaslessEnvelope {
  if (payload.x402Version !== 2) {
    throw new Error("avalanche_x402_facilitator_requires_v2");
  }
  if (!payload.resource) {
    throw new Error("avalanche_x402_facilitator_resource_required");
  }
  if (!sameRequirement(payload.accepted, requirement)) {
    throw new Error("avalanche_x402_facilitator_requirement_mismatch");
  }
  const value = payload.payload as {
    signature?: unknown;
    authorization?: Record<string, unknown>;
  };
  const authorization = value.authorization;
  if (!authorization || typeof value.signature !== "string") {
    throw new Error("avalanche_x402_facilitator_payload_required");
  }
  const validAfter = Number(authorization.validAfter);
  const validBefore = Number(authorization.validBefore);
  if (!Number.isSafeInteger(validAfter) || !Number.isSafeInteger(validBefore)) {
    throw new Error("avalanche_x402_facilitator_authorization_time_invalid");
  }
  for (const key of ["from", "to", "value", "nonce"] as const) {
    if (typeof authorization[key] !== "string") {
      throw new Error("avalanche_x402_facilitator_authorization_invalid");
    }
  }
  return {
    paymentPayload: {
      token: requirement.asset,
      payload: {
        authorization: {
          from: authorization.from as string,
          to: authorization.to as string,
          value: authorization.value as string,
          validAfter,
          validBefore,
          nonce: authorization.nonce as string,
        },
        signature: value.signature,
      },
    },
    paymentRequirements: { chainId: AVALANCHE_X402.chainId },
  };
}

const SAFE_FACILITATOR_REASON = /^[a-zA-Z][a-zA-Z0-9_.:-]{0,95}$/;
const FACILITATOR_REASON_KEYS = new Set([
  "invalidReason",
  "errorReason",
  "reason",
  "code",
  "error",
  "message",
  "details",
]);

function normalizeFacilitatorReason(candidate: unknown) {
  if (typeof candidate !== "string") return null;
  if (SAFE_FACILITATOR_REASON.test(candidate)) return candidate;
  const normalized = candidate.toLowerCase();
  if (normalized.includes("contract") && normalized.includes("call") && normalized.includes("fail")) {
    return "contract_call_failed";
  }
  if (normalized.includes("deserialize") || normalized.includes("deserializ")) {
    return "deserialization_failed";
  }
  if (normalized.includes("signature") && normalized.includes("invalid")) {
    return "invalid_signature";
  }
  if (normalized.includes("authorization") && normalized.includes("expir")) {
    return "authorization_expired";
  }
  if (normalized.includes("insufficient") && normalized.includes("balance")) {
    return "insufficient_balance";
  }
  return null;
}

async function safeFacilitatorReason(response: Response) {
  try {
    const body = await response.json() as Record<string, unknown>;
    const queue: Record<string, unknown>[] = [body];
    for (let depth = 0; depth < 3 && queue.length; depth += 1) {
      const current = queue.shift()!;
      for (const [key, value] of Object.entries(current)) {
        if (!FACILITATOR_REASON_KEYS.has(key)) continue;
        const reason = normalizeFacilitatorReason(value);
        if (reason) return reason;
        if (value && typeof value === "object" && !Array.isArray(value)) {
          queue.push(value as Record<string, unknown>);
        }
      }
    }
  } catch {
    // Never echo arbitrary response bodies: they may contain signed payloads,
    // upstream HTML, or other secrets.
  }
  return null;
}

export class AvalancheX402FacilitatorHttpError extends Error {
  readonly status: number;
  readonly reason: string | null;

  constructor(status: number, reason: string | null) {
    super(`avalanche_x402_facilitator_http_${status}`);
    this.name = "AvalancheX402FacilitatorHttpError";
    this.status = status;
    this.reason = reason;
  }
}
async function facilitatorRequest<T>(input: { endpoint: "verify" | "settle"; payload: PaymentPayload; requirement: PaymentRequirements; fetcher: typeof fetch }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const body = buildGaslessEnvelope(input.payload, input.requirement);
    const response = await input.fetcher(`${AVALANCHE_X402.facilitatorUrl}/${input.endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      const reason = await safeFacilitatorReason(response);
      throw new AvalancheX402FacilitatorHttpError(response.status, reason);
    }
    const result = await response.json() as T;
    if (
      input.endpoint === "settle" &&
      result &&
      typeof result === "object" &&
      "network" in result &&
      (result as { network?: unknown }).network === "avalanche-fuji"
    ) {
      return {
        ...result,
        network: AVALANCHE_X402.network,
      };
    }
    return result;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error(`avalanche_x402_${input.endpoint}_ambiguous`);
    throw error;
  } finally { clearTimeout(timeout); }
}

export function createAvalancheX402Facilitator(fetcher: typeof fetch = fetch): AvalancheX402Facilitator {
  return {
    verify: (payload, requirement) => facilitatorRequest<VerifyResponse>({ endpoint: "verify", payload, requirement, fetcher }),
    settle: (payload, requirement) => facilitatorRequest<SettleResponse>({ endpoint: "settle", payload, requirement, fetcher }),
  };
}
