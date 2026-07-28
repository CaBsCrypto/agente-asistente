import type { PaymentPayload, PaymentRequirements, SettleResponse, VerifyResponse } from "@x402/core/types";
import { AVALANCHE_X402 } from "./config";

export interface AvalancheX402Facilitator {
  verify(payload: PaymentPayload, requirement: PaymentRequirements): Promise<VerifyResponse>;
  settle(payload: PaymentPayload, requirement: PaymentRequirements): Promise<SettleResponse>;
}

async function facilitatorRequest<T>(input: { endpoint: "verify" | "settle"; payload: PaymentPayload; requirement: PaymentRequirements; fetcher: typeof fetch }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await input.fetcher(`${AVALANCHE_X402.facilitatorUrl}/${input.endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ x402Version: 2, paymentPayload: input.payload, paymentRequirements: input.requirement }),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`avalanche_x402_facilitator_http_${response.status}`);
    return await response.json() as T;
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
