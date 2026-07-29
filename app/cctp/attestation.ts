import { z } from "zod";
import {
  CCTP_MAX_RESPONSE_BYTES,
  CCTP_SANDBOX_API,
  CCTP_TESTNET,
  CCTP_TIMEOUT_MS,
} from "@/app/connectors/circle-cctp";

const attestationSchema = z.object({
  messages: z.array(z.object({
    message: z.string().regex(/^0x[0-9a-fA-F]+$/),
    attestation: z.string().regex(/^0x[0-9a-fA-F]+$/),
    status: z.string(),
  }).passthrough()).max(10),
}).passthrough();

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
  const parsed = attestationSchema.safeParse(JSON.parse(text));
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
