import { encodePaymentSignatureHeader } from "@x402/core/http";
import type { PaymentPayload, PaymentRequirements } from "@x402/core/types";

export const AVALANCHE_X402_CLIENT = {
  network: "eip155:43113",
  chainId: 43113,
  asset: "0x5425890298aed601595a70AB815c96711a31Bc65",
  amountAtomic: "10000",
  amountDisplay: "0.01",
  bodyHash: "6a0c7603b7673730abfe3dd8fc0581256232110fbb4d0a3ce87b204e092db893",
  reportBody: { report: "avalanche-agent-readiness", version: 1 },
} as const;

export type PreparedAvalancheX402 = {
  replayed: boolean;
  requiresExplicitApproval: true;
  payment: {
    id: string;
    walletAddress: string;
    resourceUrl: string;
    network: string;
    asset: "USDC";
    assetContract: string;
    payTo: string;
    amountAtomic: string;
    amountDisplay: string;
    status: string;
    transactionHash: string | null;
    error: string | null;
    expiresAt: string;
    typedData: {
      domain: {
        name: string;
        version: string;
        chainId: number;
        verifyingContract: string;
      };
      types: Record<string, readonly { name: string; type: string }[]>;
      primaryType: string;
      message: {
        from: string;
        to: string;
        value: string;
        validAfter: string;
        validBefore: string;
        nonce: `0x${string}`;
      };
    };
  };
  paymentRequired: {
    x402Version: number;
    resource: { url: string };
    accepts: PaymentRequirements[];
  };
};

export function validatePreparedAvalancheX402(
  value: unknown,
  expectedOrigin: string,
): PreparedAvalancheX402 {
  const prepared = value as PreparedAvalancheX402;
  const payment = prepared?.payment;
  const requirement = prepared?.paymentRequired?.accepts?.[0];
  const resource = new URL(payment?.resourceUrl ?? "");
  const payTo = payment?.payTo?.toLowerCase();
  if (
    prepared?.requiresExplicitApproval !== true ||
    prepared.paymentRequired?.x402Version !== 2 ||
    prepared.paymentRequired.accepts.length !== 1 ||
    resource.origin !== expectedOrigin ||
    resource.pathname !== "/api/demo/avalanche-report" ||
    prepared.paymentRequired.resource?.url !== payment.resourceUrl ||
    payment.network !== AVALANCHE_X402_CLIENT.network ||
    payment.asset !== "USDC" ||
    payment.assetContract?.toLowerCase() !== AVALANCHE_X402_CLIENT.asset.toLowerCase() ||
    payment.amountAtomic !== AVALANCHE_X402_CLIENT.amountAtomic ||
    payment.amountDisplay !== AVALANCHE_X402_CLIENT.amountDisplay ||
    !/^0x[a-fA-F0-9]{40}$/.test(payment.walletAddress) ||
    !/^0x[a-fA-F0-9]{40}$/.test(payment.payTo) ||
    payTo === "0x0000000000000000000000000000000000000000" ||
    requirement?.scheme !== "exact" ||
    requirement.network !== AVALANCHE_X402_CLIENT.network ||
    requirement.asset.toLowerCase() !== AVALANCHE_X402_CLIENT.asset.toLowerCase() ||
    requirement.amount !== AVALANCHE_X402_CLIENT.amountAtomic ||
    requirement.payTo.toLowerCase() !== payTo ||
    payment.typedData?.domain?.name !== "USD Coin" ||
    payment.typedData.domain.version !== "2" ||
    payment.typedData.domain.chainId !== AVALANCHE_X402_CLIENT.chainId ||
    payment.typedData.domain.verifyingContract.toLowerCase() !== AVALANCHE_X402_CLIENT.asset.toLowerCase() ||
    payment.typedData.primaryType !== "TransferWithAuthorization" ||
    payment.typedData.message.from.toLowerCase() !== payment.walletAddress.toLowerCase() ||
    payment.typedData.message.to.toLowerCase() !== payTo ||
    payment.typedData.message.value !== AVALANCHE_X402_CLIENT.amountAtomic
  ) throw new Error("avalanche_x402_prepared_payment_mismatch");
  return prepared;
}

export function encodePreparedAvalancheX402Signature(input: {
  prepared: PreparedAvalancheX402;
  signature: string;
}) {
  if (!/^0x[a-fA-F0-9]{130}$/.test(input.signature)) {
    throw new Error("avalanche_x402_invalid_privy_signature");
  }
  const payment = input.prepared.payment;
  const payload: PaymentPayload = {
    x402Version: 2,
    resource: { url: payment.resourceUrl, mimeType: "application/json" },
    accepted: input.prepared.paymentRequired.accepts[0],
    payload: {
      signature: input.signature.toLowerCase(),
      authorization: payment.typedData.message,
    },
    extensions: {
      carmelita: {
        paymentId: payment.id,
        method: "POST",
        resourceUrl: payment.resourceUrl,
        bodyHash: AVALANCHE_X402_CLIENT.bodyHash,
      },
    },
  };
  return encodePaymentSignatureHeader(payload);
}

export function avalancheX402SessionKey(paymentId: string) {
  return `carmelita:avalanche-x402:${paymentId}`;
}

export type AvalancheX402Delivery = {
  deliveryId: string;
  report: string;
  network: string;
  paid: { asset: string; amountAtomic: string };
  transactionHash: string;
  paymentId: string;
};

/** Mirrors the server's canonical serialization used to hash a delivery. */
function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) =>
    `${JSON.stringify(key)}:${stableJson(object[key])}`
  ).join(",")}}`;
}

export function canonicalAvalancheX402Delivery(body: unknown) {
  return stableJson(body);
}

/**
 * Independently re-checks a delivered report against the payment the user
 * approved, so a settled payment cannot deliver another payment's report.
 * The caller supplies the SHA-256 of `canonicalAvalancheX402Delivery(body)`,
 * which the browser computes with WebCrypto.
 */
export function validateAvalancheX402Delivery(input: {
  body: unknown;
  paymentId: string;
  deliveryIdHeader: string | null;
  bodyHashHeader: string | null;
  computedBodyHash: string;
}): AvalancheX402Delivery {
  const delivery = input.body as AvalancheX402Delivery;
  if (
    !delivery ||
    typeof delivery.deliveryId !== "string" ||
    delivery.paymentId !== input.paymentId ||
    delivery.network !== AVALANCHE_X402_CLIENT.network ||
    delivery.paid?.asset !== "USDC" ||
    delivery.paid.amountAtomic !== AVALANCHE_X402_CLIENT.amountAtomic ||
    !/^0x[a-fA-F0-9]{64}$/.test(delivery.transactionHash ?? "") ||
    input.deliveryIdHeader !== delivery.deliveryId ||
    input.bodyHashHeader !== input.computedBodyHash ||
    !/^[a-f0-9]{64}$/.test(input.computedBodyHash)
  ) throw new Error("avalanche_x402_delivery_mismatch");
  return delivery;
}
