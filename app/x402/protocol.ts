import { x402Client } from "@x402/core/client";
import { createHash } from "node:crypto";
import {
  decodePaymentRequiredHeader,
  decodePaymentResponseHeader,
} from "@x402/core/http";
import type {
  PaymentPayloadResult,
  PaymentRequired,
  PaymentRequirements,
  SchemeNetworkClient,
  SettleResponse,
} from "@x402/core/types";
import { wrapFetchWithPayment } from "@x402/fetch";
import { ExactStellarScheme } from "@x402/stellar/exact/client";
import type { ClientStellarSigner } from "@x402/stellar";
import {
  atomicToDisplay,
  isOfficialX402TestnetUsdc,
  X402_DEMO_LIMIT_ATOMIC,
} from "@/app/x402/assets";

export type FrozenX402Requirement = {
  network: string;
  asset: string;
  amount: string;
  payTo: string;
};

export function selectSafeX402Requirement(
  paymentRequired: PaymentRequired,
): PaymentRequirements {
  const accepted = paymentRequired.accepts.find(
    (requirement) =>
      requirement.scheme === "exact" &&
      isOfficialX402TestnetUsdc(requirement) &&
      /^\d+$/.test(requirement.amount) &&
      BigInt(requirement.amount) > BigInt(0) &&
      BigInt(requirement.amount) <= X402_DEMO_LIMIT_ATOMIC,
  );
  if (!accepted) throw new Error("x402_safe_testnet_option_not_found");
  return accepted;
}

export function freezeRequirement(
  requirement: PaymentRequirements,
): FrozenX402Requirement {
  return {
    network: requirement.network,
    asset: requirement.asset,
    amount: requirement.amount,
    payTo: requirement.payTo,
  };
}

export function sameRequirement(
  requirement: PaymentRequirements,
  frozen: FrozenX402Requirement,
) {
  return (
    requirement.network === frozen.network &&
    requirement.asset === frozen.asset &&
    requirement.amount === frozen.amount &&
    requirement.payTo === frozen.payTo
  );
}

export async function inspectX402Resource(resourceUrl: string) {
  const response = await fetch(resourceUrl, {
    headers: { Accept: "application/json, text/html;q=0.9" },
    cache: "no-store",
  });
  if (response.status !== 402) throw new Error("x402_resource_did_not_challenge");
  const encoded = response.headers.get("PAYMENT-REQUIRED");
  if (!encoded) throw new Error("x402_payment_required_header_missing");
  const paymentRequired = decodePaymentRequiredHeader(encoded);
  const requirement = selectSafeX402Requirement(paymentRequired);
  return {
    paymentRequired,
    requirement,
    amountDisplay: atomicToDisplay(requirement.amount),
  };
}

export async function payX402Resource(input: {
  resourceUrl: string;
  signer: ClientStellarSigner;
  frozen: FrozenX402Requirement;
}) {
  const client = new x402Client()
    .register("stellar:*", new ExactStellarScheme(input.signer))
    .registerPolicy((_version, requirements) =>
      requirements.filter((requirement) =>
        sameRequirement(requirement, input.frozen),
      ),
    );
  const paidFetch = wrapFetchWithPayment(fetch, client);
  const response = await paidFetch(input.resourceUrl, {
    headers: { Accept: "application/json, text/html;q=0.9" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`x402_payment_failed_${response.status}`);

  const encodedSettlement =
    response.headers.get("PAYMENT-RESPONSE") ??
    response.headers.get("X-PAYMENT-RESPONSE");
  const settlement: SettleResponse | null = encodedSettlement
    ? decodePaymentResponseHeader(encodedSettlement)
    : null;
  const contentType = response.headers.get("content-type") ?? "";
  const resource = contentType.includes("application/json")
    ? JSON.stringify(await response.json())
    : await response.text();

  return {
    settlement,
    resourcePreview: resource.slice(0, 4_000),
    resourceStatus: response.status,
    resourceContentType: contentType,
    resourceSha256: createHash("sha256").update(resource).digest("hex"),
  };
}

export async function payPreparedX402Resource(input: {
  resourceUrl: string;
  frozen: FrozenX402Requirement;
  x402Version: number;
  transaction: string;
}) {
  const preparedScheme: SchemeNetworkClient = {
    scheme: "exact",
    createPaymentPayload: async (
      x402Version,
      requirement,
    ): Promise<PaymentPayloadResult> => {
      if (x402Version !== input.x402Version) {
        throw new Error("x402_protocol_version_changed");
      }
      if (!sameRequirement(requirement, input.frozen)) {
        throw new Error("x402_live_requirement_changed");
      }
      return {
        x402Version,
        payload: { transaction: input.transaction },
      };
    },
  };
  const client = new x402Client()
    .register("stellar:*", preparedScheme)
    .registerPolicy((_version, requirements) =>
      requirements.filter((requirement) =>
        sameRequirement(requirement, input.frozen),
      ),
    );
  const paidFetch = wrapFetchWithPayment(fetch, client);
  const response = await paidFetch(input.resourceUrl, {
    headers: { Accept: "application/json, text/html;q=0.9" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`x402_payment_failed_${response.status}`);

  const encodedSettlement =
    response.headers.get("PAYMENT-RESPONSE") ??
    response.headers.get("X-PAYMENT-RESPONSE");
  const settlement: SettleResponse | null = encodedSettlement
    ? decodePaymentResponseHeader(encodedSettlement)
    : null;
  const contentType = response.headers.get("content-type") ?? "";
  const resource = contentType.includes("application/json")
    ? JSON.stringify(await response.json())
    : await response.text();

  return {
    settlement,
    resourcePreview: resource.slice(0, 4_000),
    resourceStatus: response.status,
    resourceContentType: contentType,
    resourceSha256: createHash("sha256").update(resource).digest("hex"),
  };
}
