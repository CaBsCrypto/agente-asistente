import { z } from "zod";
import { StrKey } from "@stellar/stellar-sdk";
import {
  CCTP_MAX_RESPONSE_BYTES,
  CCTP_SANDBOX_API,
  CCTP_TESTNET,
  CCTP_TIMEOUT_MS,
} from "@/app/connectors/circle-cctp";

const attestationSchema = z.object({
  messages: z.array(z.object({
    message: z.string().regex(/^0x(?:[0-9a-fA-F]{2})+$/),
    attestation: z.string().regex(/^0x(?:[0-9a-fA-F]{2})+$/),
    status: z.string(),
  }).passthrough()).max(10),
}).passthrough();

const HEADER_LENGTH = 148;
const BURN_BODY_FIXED_LENGTH = 228;

function normalizeHex(value: string) {
  return value.toLowerCase().replace(/^0x/, "");
}

function evmAddressBytes32(value: string) {
  const hex = normalizeHex(value);
  if (!/^[0-9a-f]{40}$/.test(hex)) throw new Error("cctp_evm_address_invalid");
  return `${"0".repeat(24)}${hex}`;
}

function stellarContractBytes32(value: string) {
  if (!StrKey.isValidContract(value)) {
    throw new Error("cctp_stellar_contract_invalid");
  }
  return Buffer.from(StrKey.decodeContract(value)).toString("hex");
}

function uint256(buffer: Buffer, offset: number) {
  return BigInt(`0x${buffer.subarray(offset, offset + 32).toString("hex")}`);
}

export function decodeCctpV2BurnMessage(message: `0x${string}`) {
  const bytes = Buffer.from(message.slice(2), "hex");
  if (bytes.length < HEADER_LENGTH + BURN_BODY_FIXED_LENGTH) {
    throw new Error("cctp_attested_message_too_short");
  }
  const body = bytes.subarray(HEADER_LENGTH);
  return {
    version: bytes.readUInt32BE(0),
    sourceDomain: bytes.readUInt32BE(4),
    destinationDomain: bytes.readUInt32BE(8),
    nonce: `0x${bytes.subarray(12, 44).toString("hex")}`,
    sender: `0x${bytes.subarray(44, 76).toString("hex")}`,
    recipient: `0x${bytes.subarray(76, 108).toString("hex")}`,
    destinationCaller: `0x${bytes.subarray(108, 140).toString("hex")}`,
    minFinalityThreshold: bytes.readUInt32BE(140),
    finalityThresholdExecuted: bytes.readUInt32BE(144),
    body: {
      version: body.readUInt32BE(0),
      burnToken: `0x${body.subarray(4, 36).toString("hex")}`,
      mintRecipient: `0x${body.subarray(36, 68).toString("hex")}`,
      amount: uint256(body, 68),
      messageSender: `0x${body.subarray(100, 132).toString("hex")}`,
      maxFee: uint256(body, 132),
      feeExecuted: uint256(body, 164),
      expirationBlock: uint256(body, 196),
      hookData: `0x${body.subarray(228).toString("hex")}`,
    },
  };
}

export function assertCctpAttestedMessage(input: {
  message: `0x${string}`;
  amountAtomic: string;
  sourceAddress: string;
  mintRecipient: string;
  destinationCaller: string;
  hookData: string;
  maxFeeAtomic: bigint;
  finalityThreshold: number;
}) {
  const decoded = decodeCctpV2BurnMessage(input.message);
  const checks: Array<[boolean, string]> = [
    [decoded.version === 1, "version"],
    [decoded.sourceDomain === CCTP_TESTNET.avalanche.domain, "source_domain"],
    [decoded.destinationDomain === CCTP_TESTNET.stellar.domain, "destination_domain"],
    [
      normalizeHex(decoded.sender) === evmAddressBytes32(CCTP_TESTNET.avalanche.tokenMessengerV2),
      "sender",
    ],
    [
      normalizeHex(decoded.recipient) ===
        stellarContractBytes32(CCTP_TESTNET.stellar.tokenMessengerMinter),
      "recipient",
    ],
    [
      normalizeHex(decoded.destinationCaller) === normalizeHex(input.destinationCaller),
      "destination_caller",
    ],
    [decoded.minFinalityThreshold === input.finalityThreshold, "min_finality"],
    [decoded.finalityThresholdExecuted >= input.finalityThreshold, "executed_finality"],
    [decoded.body.version === 1, "body_version"],
    [
      normalizeHex(decoded.body.burnToken) === evmAddressBytes32(CCTP_TESTNET.avalanche.usdc),
      "burn_token",
    ],
    [
      normalizeHex(decoded.body.mintRecipient) === normalizeHex(input.mintRecipient),
      "mint_recipient",
    ],
    [decoded.body.amount === BigInt(input.amountAtomic), "amount"],
    [
      normalizeHex(decoded.body.messageSender) === evmAddressBytes32(input.sourceAddress),
      "message_sender",
    ],
    [decoded.body.maxFee === input.maxFeeAtomic, "max_fee"],
    [decoded.body.feeExecuted <= decoded.body.maxFee, "fee_executed"],
    [normalizeHex(decoded.body.hookData) === normalizeHex(input.hookData), "hook_data"],
  ];
  const failed = checks.find(([valid]) => !valid);
  if (failed) throw new Error(`cctp_attested_message_${failed[1]}_mismatch`);
  return decoded;
}

export async function getCctpAttestation(
  transactionHash: `0x${string}`,
  fetcher: typeof fetch = fetch,
) {
  const url = new URL(
    `/v2/messages/${CCTP_TESTNET.avalanche.domain}`,
    CCTP_SANDBOX_API,
  );
  url.searchParams.set("transactionHash", transactionHash);
  let response: Response;
  try {
    response = await fetcher(url, {
      method: "GET",
      headers: { accept: "application/json" },
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      signal: AbortSignal.timeout(CCTP_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && (
      error.name === "TimeoutError" || error.name === "AbortError"
    )) throw new Error("cctp_attestation_timeout");
    throw new Error("cctp_attestation_unreachable");
  }
  if (response.status === 404) {
    return { status: "pending" as const, message: null, attestation: null };
  }
  if (!response.ok) throw new Error(`cctp_attestation_http_${response.status}`);
  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > CCTP_MAX_RESPONSE_BYTES) {
    throw new Error("cctp_attestation_response_too_large");
  }
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error("cctp_attestation_json_invalid");
  }
  const parsed = attestationSchema.safeParse(payload);
  if (!parsed.success) throw new Error("cctp_attestation_payload_invalid");
  const item = parsed.data.messages[0];
  if (!item || item.status !== "complete") {
    return { status: "pending" as const, message: null, attestation: null };
  }
  return {
    status: "complete" as const,
    message: item.message,
    attestation: item.attestation,
  };
}
