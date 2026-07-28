import {
  decodePaymentSignatureHeader,
  encodePaymentRequiredHeader,
  encodePaymentResponseHeader,
  encodePaymentSignatureHeader,
} from "@x402/core/http";
import type { PaymentPayload, PaymentRequired, PaymentRequirements, SettleResponse } from "@x402/core/types";
import { recoverTypedDataAddress } from "viem";
import { AVALANCHE_X402, EVM_SIGNATURE } from "./config";
import { buildTransferWithAuthorizationTypedData, type FrozenAvalancheX402Payment } from "./payment";

export const AVALANCHE_REPORT_AMOUNT = "10000";

export function buildAvalancheX402Requirement(payTo: string): PaymentRequirements {
  return {
    scheme: AVALANCHE_X402.scheme,
    network: AVALANCHE_X402.network,
    asset: AVALANCHE_X402.asset.address,
    amount: AVALANCHE_REPORT_AMOUNT,
    payTo,
    maxTimeoutSeconds: 60,
    extra: { name: AVALANCHE_X402.asset.eip712Name, version: AVALANCHE_X402.asset.eip712Version, primaryType: "TransferWithAuthorization", decimals: AVALANCHE_X402.asset.decimals },
  };
}

export function createAvalanchePaymentRequired(input: { resourceUrl: string; payTo: string }) {
  const requirement = buildAvalancheX402Requirement(input.payTo);
  const paymentRequired: PaymentRequired = {
    x402Version: 2,
    error: "PAYMENT-SIGNATURE header is required",
    resource: { url: input.resourceUrl, description: "Carmelita Avalanche Fuji deterministic report", mimeType: "application/json" },
    accepts: [requirement],
  };
  return { requirement, paymentRequired, header: encodePaymentRequiredHeader(paymentRequired) };
}

export function createAvalanchePaymentPayload(input: { payment: FrozenAvalancheX402Payment; requirement: PaymentRequirements; signature: string }): PaymentPayload {
  if (!EVM_SIGNATURE.test(input.signature)) throw new Error("avalanche_x402_invalid_privy_signature");
  return {
    x402Version: 2,
    resource: { url: input.payment.resource.url, mimeType: "application/json" },
    accepted: input.requirement,
    payload: {
      signature: input.signature.toLowerCase(),
      authorization: { from: input.payment.payer, to: input.payment.payTo, value: input.payment.amount, validAfter: input.payment.validAfter, validBefore: input.payment.validBefore, nonce: input.payment.nonce },
    },
    extensions: { carmelita: { paymentId: input.payment.paymentId, method: input.payment.resource.method, resourceUrl: input.payment.resource.url, bodyHash: input.payment.resource.bodyHash } },
  };
}

export function encodeAvalanchePaymentSignature(input: { payment: FrozenAvalancheX402Payment; requirement: PaymentRequirements; signature: string }) {
  return encodePaymentSignatureHeader(createAvalanchePaymentPayload(input));
}

function sameRequirement(actual: PaymentRequirements, expected: PaymentRequirements) {
  return actual.scheme === expected.scheme && actual.network === expected.network && actual.asset.toLowerCase() === expected.asset.toLowerCase() && actual.amount === expected.amount && actual.payTo.toLowerCase() === expected.payTo.toLowerCase() && actual.maxTimeoutSeconds === expected.maxTimeoutSeconds;
}

export async function validateAvalanchePaymentSignature(input: { header: string; payment: FrozenAvalancheX402Payment; requirement: PaymentRequirements; method: string; resourceUrl: string; bodyHash: string; nowSeconds: number }) {
  let payload: PaymentPayload;
  try { payload = decodePaymentSignatureHeader(input.header); } catch { throw new Error("avalanche_x402_payment_signature_malformed"); }
  if (payload.x402Version !== 2 || !sameRequirement(payload.accepted, input.requirement)) throw new Error("avalanche_x402_requirement_mismatch");
  if (payload.resource?.url !== input.resourceUrl) throw new Error("avalanche_x402_resource_mismatch");
  const value = payload.payload as { signature?: unknown; authorization?: { from?: unknown; to?: unknown; value?: unknown; validAfter?: unknown; validBefore?: unknown; nonce?: unknown } };
  const authorization = value.authorization;
  const extension = payload.extensions?.carmelita as { paymentId?: unknown; method?: unknown; resourceUrl?: unknown; bodyHash?: unknown } | undefined;
  if (!authorization || authorization.from !== input.payment.payer || authorization.to !== input.payment.payTo || authorization.value !== input.payment.amount || authorization.validAfter !== input.payment.validAfter || authorization.validBefore !== input.payment.validBefore || authorization.nonce !== input.payment.nonce) throw new Error("avalanche_x402_authorization_mismatch");
  if (extension?.paymentId !== input.payment.paymentId || extension.method !== input.method || extension.resourceUrl !== input.resourceUrl || extension.bodyHash !== input.bodyHash) throw new Error("avalanche_x402_request_binding_mismatch");
  if (BigInt(input.payment.validAfter) > BigInt(input.nowSeconds) || BigInt(input.payment.validBefore) <= BigInt(input.nowSeconds)) throw new Error("avalanche_x402_authorization_expired");
  if (typeof value.signature !== "string" || !EVM_SIGNATURE.test(value.signature)) throw new Error("avalanche_x402_invalid_privy_signature");
  const recovered = await recoverTypedDataAddress({ ...buildTransferWithAuthorizationTypedData(input.payment), signature: value.signature as `0x${string}` });
  if (recovered.toLowerCase() !== input.payment.payer.toLowerCase()) throw new Error("avalanche_x402_invalid_signer");
  return { payload, signature: input.header, recoveredSigner: recovered.toLowerCase() };
}

export function encodeAvalancheSettlementResponse(response: SettleResponse) {
  return encodePaymentResponseHeader(response);
}
