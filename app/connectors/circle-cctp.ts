import { StrKey } from "@stellar/stellar-sdk";
import { z } from "zod";

export const CCTP_SANDBOX_API = "https://iris-api-sandbox.circle.com" as const;
export const CCTP_DOCS_URL =
  "https://developers.circle.com/cctp/quickstarts/transfer-usdc-stellar-arc" as const;
export const CCTP_TIMEOUT_MS = 10_000;
export const CCTP_MAX_RESPONSE_BYTES = 32 * 1024;

export const CCTP_TESTNET = {
  avalanche: {
    network: "avalanche:fuji",
    name: "Avalanche Fuji",
    domain: 1,
    chainId: 43113,
    usdc: "0x5425890298aed601595a70AB815c96711a31Bc65",
    tokenMessengerV2: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
    messageTransmitterV2: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
  },
  stellar: {
    network: "stellar:testnet",
    name: "Stellar Testnet",
    domain: 27,
    usdcIssuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    tokenMessengerMinter: "CDNG7HXAPBWICI2E3AUBP3YZWZELJLYSB6F5CC7WLDTLTHVM74SLRTHP",
    messageTransmitter: "CBJ6MTCKKZG73PMDZCJMSFRD7DQEMI4FKDH7CGDSV4W6FHCRBCQAVVJY",
    cctpForwarder: "CA66Q2WFBND6V4UEB7RD4SAXSVIWMD6RA4X3U32ELVFGXV5PJK4T4VSZ",
  },
} as const;

const feeSchema = z.array(z.object({
  finalityThreshold: z.number().int().nonnegative(),
  minimumFee: z.number().int().nonnegative(),
}).strict()).min(1).max(10);

const evmAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
const stellarAddressSchema = z.string().refine(
  (value) =>
    StrKey.isValidEd25519PublicKey(value) ||
    StrKey.isValidContract(value) ||
    StrKey.isValidMed25519PublicKey(value),
  "cctp_stellar_recipient_invalid",
);

export type CctpBridgeReadiness = {
  sourceAddress: string | null;
  destinationAddress: string | null;
  sourceGasReady: boolean | null;
  sourceUsdcBalance: string | null;
  destinationGasReady: boolean | null;
  destinationTrustlineReady: boolean | null;
};

function parseUsdcAmount(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,6})?$/.test(normalized)) {
    throw new Error("cctp_amount_invalid");
  }
  const [whole, fraction = ""] = normalized.split(".");
  const atomic = BigInt(whole) * BigInt(1_000_000) +
    BigInt(fraction.padEnd(6, "0"));
  if (atomic <= BigInt(0)) throw new Error("cctp_amount_invalid");
  if (atomic > BigInt("1000000000000")) throw new Error("cctp_amount_too_large");
  return { display: normalized, atomic: atomic.toString() };
}

function contractStrkeyToBytes32(value: string) {
  if (!StrKey.isValidContract(value)) {
    throw new Error("cctp_stellar_forwarder_invalid");
  }
  return `0x${Buffer.from(StrKey.decodeContract(value)).toString("hex")}` as const;
}

export function buildCctpForwarderHookData(forwardRecipient: string) {
  const recipient = stellarAddressSchema.parse(forwardRecipient);
  const recipientBytes = Buffer.from(recipient, "utf8");
  const hook = Buffer.alloc(32 + recipientBytes.length);
  hook.writeUInt32BE(0, 24);
  hook.writeUInt32BE(recipientBytes.length, 28);
  recipientBytes.copy(hook, 32);
  return `0x${hook.toString("hex")}` as const;
}

async function readBoundedJson(response: Response) {
  if (!response.ok) throw new Error(`cctp_fee_http_${response.status}`);
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error("cctp_fee_content_type_invalid");
  }
  const length = Number(response.headers.get("content-length"));
  if (Number.isFinite(length) && length > CCTP_MAX_RESPONSE_BYTES) {
    throw new Error("cctp_fee_response_too_large");
  }
  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > CCTP_MAX_RESPONSE_BYTES) {
    throw new Error("cctp_fee_response_too_large");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("cctp_fee_json_invalid");
  }
}

export async function getCctpFujiToStellarFees(
  fetcher: typeof fetch = fetch,
) {
  const url = new URL(
    `/v2/burn/USDC/fees/${CCTP_TESTNET.avalanche.domain}/${CCTP_TESTNET.stellar.domain}`,
    CCTP_SANDBOX_API,
  );
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
    )) {
      throw new Error("cctp_fee_timeout");
    }
    throw new Error("cctp_fee_unreachable");
  }
  const parsed = feeSchema.safeParse(await readBoundedJson(response));
  if (!parsed.success) throw new Error("cctp_fee_payload_invalid");
  return {
    sourceDomain: CCTP_TESTNET.avalanche.domain,
    destinationDomain: CCTP_TESTNET.stellar.domain,
    options: parsed.data.map((fee) => ({
      ...fee,
      minimumFeeUsdc: (fee.minimumFee / 1_000_000).toFixed(6),
    })),
    fetchedAt: new Date().toISOString(),
  };
}

export function buildCctpFujiToStellarPlan(input: {
  amount: string;
  sourceAddress: string;
  destinationAddress: string;
  readiness?: CctpBridgeReadiness;
}) {
  const amount = parseUsdcAmount(input.amount);
  const sourceAddress = evmAddressSchema.parse(input.sourceAddress);
  const destinationAddress = stellarAddressSchema.parse(input.destinationAddress);
  const readiness = input.readiness;
  const blockers: string[] = [];
  if (readiness) {
    if (readiness.sourceGasReady !== true) blockers.push("fuji_avax_required");
    if (
      readiness.sourceUsdcBalance === null ||
      Number(readiness.sourceUsdcBalance) < Number(amount.display)
    ) {
      blockers.push("fuji_usdc_required");
    }
    if (readiness.destinationGasReady !== true) blockers.push("stellar_xlm_required");
    if (readiness.destinationTrustlineReady !== true) {
      blockers.push("stellar_circle_usdc_trustline_required");
    }
  }
  const forwarderBytes32 = contractStrkeyToBytes32(
    CCTP_TESTNET.stellar.cctpForwarder,
  );
  return {
    protocol: "Circle CCTP V2",
    environment: "testnet",
    route: "avalanche:fuji->stellar:testnet",
    asset: "native USDC",
    amount: amount.display,
    amountAtomic: amount.atomic,
    source: {
      ...CCTP_TESTNET.avalanche,
      address: sourceAddress,
    },
    destination: {
      ...CCTP_TESTNET.stellar,
      address: destinationAddress,
    },
    safety: {
      nonCustodial: true,
      executionEnabled: false,
      approvalRequired: true,
      sourceApprovalRequired: true,
      destinationApprovalRequired: true,
      automaticRetryAfterAmbiguousResult: false,
      mintRecipient: forwarderBytes32,
      destinationCaller: forwarderBytes32,
      hookData: buildCctpForwarderHookData(destinationAddress),
    },
    stages: [
      "approve_source_usdc",
      "burn_on_fuji",
      "wait_for_circle_attestation",
      "mint_and_forward_on_stellar",
      "verify_destination_balance",
    ],
    blockers,
    readyToPrepare: blockers.length === 0,
    fundsMoved: false,
    transactionPrepared: false,
    docs: CCTP_DOCS_URL,
  } as const;
}
