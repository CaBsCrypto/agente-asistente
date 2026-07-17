import {
  proveX402ConfirmedReplay,
  proveX402FirstExecutionAndReplay,
  type X402ExecutionResult,
} from "../app/x402/replay-proof";
import { X402_TESTNET_USDC } from "../app/x402/assets";

type Mode = "confirmed" | "execute";
type JsonObject = Record<string, unknown>;

const mode = (process.argv[2] ?? "confirmed") as Mode;
if (mode !== "confirmed" && mode !== "execute") {
  throw new Error("usage: x402-replay-proof.ts <confirmed|execute>");
}

const baseUrl = (
  process.env.AGENT_ACCEPTANCE_BASE_URL ?? "https://agente-asistente.vercel.app"
).replace(/\/$/, "");
const token = process.env.AGENT_ACCEPTANCE_PRIVY_TOKEN?.trim() ?? "";
const configuredPaymentId = process.env.AGENT_ACCEPTANCE_X402_PAYMENT_ID?.trim() ?? "";
const configuredTransactionHash =
  process.env.AGENT_ACCEPTANCE_X402_TRANSACTION_HASH?.trim() ?? "";
const configuredSignature = process.env.AGENT_ACCEPTANCE_X402_SIGNATURE?.trim() ?? "";

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function object(value: unknown, label: string) {
  invariant(Boolean(value) && typeof value === "object" && !Array.isArray(value), `${label}_invalid`);
  return value as JsonObject;
}

function string(value: unknown, label: string) {
  invariant(typeof value === "string" && value.length > 0, `${label}_missing`);
  return value;
}

const origin = new URL(baseUrl);
invariant(
  origin.hostname === "agente-asistente.vercel.app" ||
    origin.hostname === "localhost" ||
    origin.hostname === "127.0.0.1",
  "x402_replay_base_url_not_allowlisted",
);
invariant(origin.protocol === "https:" || origin.hostname === "localhost" || origin.hostname === "127.0.0.1", "x402_replay_insecure_origin");
invariant(token.length > 0, "AGENT_ACCEPTANCE_PRIVY_TOKEN_required");

async function fetchJson(path: string, init: RequestInit = {}) {
  const response = await fetch(baseUrl + path, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(30_000),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`http_${response.status}:${JSON.stringify(payload).slice(0, 400)}`);
  }
  return object(payload, path.replace(/\W+/g, "_") || "root");
}

async function status() {
  const payload = await fetchJson("/api/agent/x402");
  const usdc = object(payload.x402Usdc, "x402_usdc");
  invariant(usdc.issuer === X402_TESTNET_USDC.issuer, "x402_replay_usdc_issuer_changed");
  invariant(usdc.trustlineActive === true, "x402_replay_usdc_trustline_missing");
  return payload;
}

async function balance() {
  const payload = await status();
  return string(object(payload.x402Usdc, "x402_usdc").balance, "x402_usdc_balance");
}

async function postExact(serializedBody: string) {
  const payload = await fetchJson("/api/agent/x402", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: serializedBody,
  });
  return payload as unknown as X402ExecutionResult;
}

async function verifyTestnetReceipt(transactionHash: string) {
  invariant(/^[0-9a-f]{64}$/i.test(transactionHash), "x402_replay_transaction_hash_invalid");
  const response = await fetch(
    `https://horizon-testnet.stellar.org/transactions/${transactionHash}`,
    { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(20_000) },
  );
  invariant(response.ok, `x402_replay_horizon_http_${response.status}`);
  const receipt = object(await response.json(), "horizon_receipt");
  invariant(receipt.successful === true, "x402_replay_transaction_not_successful");
  invariant(receipt.hash === transactionHash, "x402_replay_horizon_hash_changed");
  return `https://stellar.expert/explorer/testnet/tx/${transactionHash}`;
}

const healthResponse = await fetch(baseUrl + "/api/health", {
  headers: { Accept: "application/json" },
  signal: AbortSignal.timeout(20_000),
});
invariant(healthResponse.ok, `x402_replay_health_http_${healthResponse.status}`);
const health = object(await healthResponse.json(), "health");
invariant(health.environment === "stellar-testnet", "x402_replay_environment_not_testnet");
invariant(object(health.payments, "health_payments").mainnet === "disabled", "x402_replay_mainnet_not_disabled");

if (mode === "execute") {
  invariant(
    process.env.ACCEPT_TESTNET_MUTATIONS === "I_UNDERSTAND_TESTNET_ONLY",
    "ACCEPT_TESTNET_MUTATIONS_must_confirm_testnet_only",
  );
  invariant(/^[0-9a-f-]{36}$/i.test(configuredPaymentId), "AGENT_ACCEPTANCE_X402_PAYMENT_ID_required");
  invariant(/^0x[0-9a-f]{128}$/i.test(configuredSignature), "AGENT_ACCEPTANCE_X402_SIGNATURE_required");
  const exactExecutionBody = JSON.stringify({
    action: "execute",
    paymentId: configuredPaymentId,
    explicitConfirmation: true,
    signature: configuredSignature,
  });
  const proof = await proveX402FirstExecutionAndReplay({
    paymentId: configuredPaymentId,
    readUsdcBalance: balance,
    executeSameApproval: () => postExact(exactExecutionBody),
  });
  const explorerUrl = await verifyTestnetReceipt(proof.transactionHash);
  console.log(JSON.stringify({ mode, ...proof, explorerUrl }, null, 2));
} else {
  const current = await status();
  const recent = Array.isArray(current.recent) ? current.recent.map((entry) => object(entry, "recent_payment")) : [];
  const selected = configuredPaymentId
    ? recent.find((payment) => payment.id === configuredPaymentId)
    : recent.find((payment) => payment.status === "confirmed" && typeof payment.transactionHash === "string");
  const paymentId = configuredPaymentId || string(selected?.id, "latest_confirmed_payment_id");
  const transactionHash = configuredTransactionHash || string(selected?.transactionHash, "latest_confirmed_transaction_hash");
  invariant(/^[0-9a-f-]{36}$/i.test(paymentId), "x402_replay_payment_id_invalid");

  // A confirmed replay is read-only. The API requires the authenticated owner,
  // but no stale signature, because the execution guard returns the receipt
  // before it enters any signing or settlement path.
  const exactReplayBody = JSON.stringify({
    action: "execute",
    paymentId,
    explicitConfirmation: true,
  });
  const proof = await proveX402ConfirmedReplay({
    paymentId,
    expectedTransactionHash: transactionHash,
    readUsdcBalance: balance,
    replayConfirmedPayment: () => postExact(exactReplayBody),
  });
  const explorerUrl = await verifyTestnetReceipt(proof.transactionHash);
  console.log(JSON.stringify({ mode, ...proof, explorerUrl }, null, 2));
}
