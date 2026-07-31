import { createHash } from "node:crypto";
import { decodePaymentSignatureHeader, encodePaymentRequiredHeader, encodePaymentResponseHeader } from "@x402/core/http";
import type { PaymentPayload, PaymentRequired, PaymentRequirements, ResourceInfo, SettleResponse } from "@x402/core/types";
import { recoverTypedDataAddress } from "viem";
import { AVALANCHE_X402, BYTES32, EVM_ADDRESS, EVM_SIGNATURE } from "./config";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const PAYMENT_IDENTIFIER = /^[A-Za-z0-9_-]{16,128}$/;
const MAX_SIGNATURE_HEADER_BYTES = 16 * 1024;
export const PAYMENT_IDENTIFIER_EXTENSION = "payment-identifier";
export const REQUEST_BINDING_EXTENSION = "carmelita-request-binding";

const paymentIdentifierSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  properties: { required: { type: "boolean" }, id: { type: "string", minLength: 16, maxLength: 128 } },
  required: ["required"],
} as const;
const requestBindingSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  properties: { version: { const: 1 }, resourceId: { type: "string" }, method: { const: "POST" }, bodyHash: { type: "string", pattern: "^[a-f0-9]{64}$" } },
  required: ["version", "resourceId", "method", "bodyHash"],
} as const;

export type AvalancheMerchantResource = {
  merchantId: string;
  resourceId: string;
  canonicalUrl: string;
  method: "POST";
  description: string;
  mimeType: string;
  amountAtomic: string;
  payTo: string;
  maxTimeoutSeconds: number;
};
export type AvalancheMerchantAuthorization = {
  from: string; to: string; value: string; validAfter: string; validBefore: string; nonce: `0x${string}`;
};

function sha256(value: Uint8Array | string) { return createHash("sha256").update(value).digest("hex"); }
function exactObject(value: unknown) { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null; }
function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableJson(object[key])}`).join(",")}}`;
}
function secureCanonicalUrl(value: string) {
  const url = new URL(value);
  const local = url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !local) throw new Error("merchant_x402_secure_canonical_url_required");
  if (url.username || url.password || url.hash || url.search) throw new Error("merchant_x402_canonical_url_not_static");
  return url.toString();
}

export function defineAvalancheMerchantResource(input: Omit<AvalancheMerchantResource, "method" | "maxTimeoutSeconds"> & { method?: "POST"; maxTimeoutSeconds?: number }): AvalancheMerchantResource {
  if (!/^[a-z0-9][a-z0-9_-]{2,63}$/.test(input.merchantId)) throw new Error("merchant_x402_merchant_id_invalid");
  if (!/^[a-z0-9][a-z0-9._:-]{2,119}$/.test(input.resourceId)) throw new Error("merchant_x402_resource_id_invalid");
  if (!EVM_ADDRESS.test(input.payTo) || input.payTo.toLowerCase() === ZERO_ADDRESS) throw new Error("merchant_x402_pay_to_invalid");
  if (!/^[1-9]\d*$/.test(input.amountAtomic) || BigInt(input.amountAtomic) > AVALANCHE_X402.maxAmountAtomic) throw new Error("merchant_x402_amount_invalid");
  const maxTimeoutSeconds = input.maxTimeoutSeconds ?? 60;
  if (!Number.isInteger(maxTimeoutSeconds) || maxTimeoutSeconds < 15 || maxTimeoutSeconds > AVALANCHE_X402.maxAuthorizationSeconds) throw new Error("merchant_x402_timeout_invalid");
  if (!input.description.trim() || input.description.length > 280) throw new Error("merchant_x402_description_invalid");
  if (!/^[a-z]+\/[a-z0-9.+-]+$/i.test(input.mimeType)) throw new Error("merchant_x402_mime_type_invalid");
  return { ...input, canonicalUrl: secureCanonicalUrl(input.canonicalUrl), method: "POST", maxTimeoutSeconds, payTo: input.payTo.toLowerCase() };
}

export function merchantRequestBodyHash(rawBody: Uint8Array | string) { return sha256(rawBody); }
export function buildAvalancheMerchantRequirement(resource: AvalancheMerchantResource): PaymentRequirements {
  return { scheme: "exact", network: AVALANCHE_X402.network, asset: AVALANCHE_X402.asset.address, amount: resource.amountAtomic, payTo: resource.payTo, maxTimeoutSeconds: resource.maxTimeoutSeconds, extra: { assetTransferMethod: "eip3009", name: AVALANCHE_X402.asset.eip712Name, version: AVALANCHE_X402.asset.eip712Version, primaryType: "TransferWithAuthorization", decimals: AVALANCHE_X402.asset.decimals } };
}
export function createAvalancheMerchantChallenge(resource: AvalancheMerchantResource, bodyHash: string) {
  if (!/^[a-f0-9]{64}$/.test(bodyHash)) throw new Error("merchant_x402_body_hash_invalid");
  const requirement = buildAvalancheMerchantRequirement(resource);
  const resourceInfo: ResourceInfo = { url: resource.canonicalUrl, description: resource.description, mimeType: resource.mimeType, serviceName: resource.merchantId.slice(0, 32), tags: ["x402", "avalanche"] };
  const extensions = {
    [PAYMENT_IDENTIFIER_EXTENSION]: { info: { required: true }, schema: paymentIdentifierSchema },
    [REQUEST_BINDING_EXTENSION]: { info: { version: 1, resourceId: resource.resourceId, method: resource.method, bodyHash }, schema: requestBindingSchema },
  };
  const paymentRequired: PaymentRequired = { x402Version: 2, error: "PAYMENT-SIGNATURE header is required", resource: resourceInfo, accepts: [requirement], extensions };
  return { requirement, paymentRequired, header: encodePaymentRequiredHeader(paymentRequired), extensions };
}

function sameRequirement(actual: PaymentRequirements, expected: PaymentRequirements) {
  return actual.scheme === expected.scheme && actual.network === expected.network && actual.asset.toLowerCase() === expected.asset.toLowerCase() && actual.amount === expected.amount && actual.payTo.toLowerCase() === expected.payTo.toLowerCase() && actual.maxTimeoutSeconds === expected.maxTimeoutSeconds && stableJson(actual.extra) === stableJson(expected.extra);
}
function stringField(value: unknown, code: string) { if (typeof value !== "string") throw new Error(code); return value; }
function integerString(value: unknown, code: string) {
  const result = typeof value === "number" && Number.isSafeInteger(value) ? String(value) : typeof value === "string" && /^\d+$/.test(value) ? value : null;
  if (result === null) throw new Error(code); return result;
}
function extensionValue(extensions: Record<string, unknown> | undefined, name: string) { return exactObject(extensions?.[name]); }

export async function validateAvalancheMerchantPayment(input: { header: string; resource: AvalancheMerchantResource; bodyHash: string; nowSeconds: number }) {
  if (Buffer.byteLength(input.header, "utf8") > MAX_SIGNATURE_HEADER_BYTES) throw new Error("merchant_x402_signature_header_too_large");
  let payload: PaymentPayload;
  try { payload = decodePaymentSignatureHeader(input.header); } catch { throw new Error("merchant_x402_signature_header_malformed"); }
  const challenge = createAvalancheMerchantChallenge(input.resource, input.bodyHash);
  if (payload.x402Version !== 2 || !sameRequirement(payload.accepted, challenge.requirement)) throw new Error("merchant_x402_requirement_mismatch");
  if (payload.resource?.url !== input.resource.canonicalUrl || payload.resource.description !== input.resource.description || payload.resource.mimeType !== input.resource.mimeType) throw new Error("merchant_x402_resource_mismatch");
  const paymentIdentifierExtension = extensionValue(payload.extensions, PAYMENT_IDENTIFIER_EXTENSION);
  const paymentIdentifier = exactObject(paymentIdentifierExtension?.info);
  const paymentId = paymentIdentifier?.id;
  if (
    paymentIdentifier?.required !== true ||
    typeof paymentId !== "string" ||
    !PAYMENT_IDENTIFIER.test(paymentId) ||
    stableJson(paymentIdentifierExtension?.schema) !== stableJson(paymentIdentifierSchema)
  ) throw new Error("merchant_x402_payment_identifier_required");
  const bindingExtension = extensionValue(payload.extensions, REQUEST_BINDING_EXTENSION);
  const binding = exactObject(bindingExtension?.info);
  if (
    binding?.version !== 1 ||
    binding.resourceId !== input.resource.resourceId ||
    binding.method !== input.resource.method ||
    binding.bodyHash !== input.bodyHash ||
    stableJson(bindingExtension?.schema) !== stableJson(requestBindingSchema)
  ) throw new Error("merchant_x402_request_binding_mismatch");
  const value = exactObject(payload.payload);
  const auth = exactObject(value?.authorization);
  const signature = stringField(value?.signature, "merchant_x402_signature_invalid");
  if (!EVM_SIGNATURE.test(signature)) throw new Error("merchant_x402_signature_invalid");
  const authorization: AvalancheMerchantAuthorization = {
    from: stringField(auth?.from, "merchant_x402_authorization_invalid").toLowerCase(),
    to: stringField(auth?.to, "merchant_x402_authorization_invalid").toLowerCase(),
    value: stringField(auth?.value, "merchant_x402_authorization_invalid"),
    validAfter: integerString(auth?.validAfter, "merchant_x402_authorization_time_invalid"),
    validBefore: integerString(auth?.validBefore, "merchant_x402_authorization_time_invalid"),
    nonce: stringField(auth?.nonce, "merchant_x402_authorization_invalid").toLowerCase() as `0x${string}`,
  };
  if (!EVM_ADDRESS.test(authorization.from) || !BYTES32.test(authorization.nonce) || authorization.to !== input.resource.payTo || authorization.value !== input.resource.amountAtomic) throw new Error("merchant_x402_authorization_mismatch");
  if (BigInt(authorization.validAfter) > BigInt(input.nowSeconds) || BigInt(authorization.validBefore) <= BigInt(input.nowSeconds)) throw new Error("merchant_x402_authorization_expired");
  const recovered = await recoverTypedDataAddress({
    domain: { name: AVALANCHE_X402.asset.eip712Name, version: AVALANCHE_X402.asset.eip712Version, chainId: BigInt(AVALANCHE_X402.chainId), verifyingContract: AVALANCHE_X402.asset.address as `0x${string}` },
    types: { TransferWithAuthorization: [{ name: "from", type: "address" }, { name: "to", type: "address" }, { name: "value", type: "uint256" }, { name: "validAfter", type: "uint256" }, { name: "validBefore", type: "uint256" }, { name: "nonce", type: "bytes32" }] },
    primaryType: "TransferWithAuthorization",
    message: { from: authorization.from as `0x${string}`, to: authorization.to as `0x${string}`, value: BigInt(authorization.value), validAfter: BigInt(authorization.validAfter), validBefore: BigInt(authorization.validBefore), nonce: authorization.nonce },
    signature: signature as `0x${string}`,
  });
  if (recovered.toLowerCase() !== authorization.from) throw new Error("merchant_x402_signer_mismatch");
  const fingerprint = sha256(stableJson({ merchantId: input.resource.merchantId, resourceId: input.resource.resourceId, url: input.resource.canonicalUrl, method: input.resource.method, bodyHash: input.bodyHash, requirement: challenge.requirement, paymentId }));
  return { payload, requirement: challenge.requirement, authorization, paymentIdentifier: paymentId, signatureHash: sha256(input.header), fingerprint, recoveredSigner: recovered.toLowerCase() };
}
export function encodeAvalancheMerchantSettlement(response: SettleResponse) { return encodePaymentResponseHeader(response); }