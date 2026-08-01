import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { getAvalancheCapability } from "../app/avalanche/capability-registry";
import { buildCctpFujiToStellarPlan, CCTP_TESTNET, getCctpFujiToStellarFees } from "../app/connectors/circle-cctp";
import { assertPangolinFujiDeployment, getPangolinAvaxToUsdcQuote, PANGOLIN_FUJI_FACTORY, PANGOLIN_FUJI_PAIR, PANGOLIN_FUJI_ROUTER, PANGOLIN_FUJI_USDC } from "../app/connectors/pangolin-fuji";
import { discoverAvalancheX402 } from "../app/x402-avalanche/discovery";

type Mode = "doctor" | "authenticated" | "prepare";
type Layer = "registry" | "pangolin" | "circle" | "x402" | "authenticated";
type Check = { name: string; layer: Layer; ok: boolean; durationMs: number; detail: string };
const EVM_FIXTURE = "0x2BAa52Fa82FbFd5d103EB30181Bd0Fa11a04c0d0";
const STELLAR_FIXTURE = "GBCTAHK3J56T4F2CSU3MQYQUMFO5ZS4IE3ZJGHOKFOYAAEN4ZAKAY5RZ";
const SWAP_AMOUNT_ATOMIC = "100000000000000000";
const mode = (process.argv[2] ?? "doctor") as Mode;
if (!(["doctor", "authenticated", "prepare"] as string[]).includes(mode)) throw new Error("usage: avalanche-acceptance.ts <doctor|authenticated|prepare> [--json]");
const baseUrl = (process.env.AGENT_ACCEPTANCE_BASE_URL ?? "http://localhost:3001").replace(/\/$/, "");
const token = process.env.AGENT_ACCEPTANCE_PRIVY_TOKEN?.trim() ?? "";
const outputPath = process.env.AVALANCHE_ACCEPTANCE_OUTPUT?.trim() ?? "";
const checks: Check[] = [];

function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
function object(value: unknown, label: string): Record<string, unknown> {
  invariant(Boolean(value) && typeof value === "object" && !Array.isArray(value), `${label}_invalid`);
  return value as Record<string, unknown>;
}
function array(value: unknown, label: string): unknown[] { invariant(Array.isArray(value), `${label}_invalid`); return value; }
function string(value: unknown, label: string) { invariant(typeof value === "string" && value.length > 0, `${label}_missing`); return value; }
async function check(name: string, layer: Layer, operation: () => Promise<string> | string) {
  const started = performance.now();
  try { const detail = await operation(); checks.push({ name, layer, ok: true, durationMs: Math.round(performance.now() - started), detail }); }
  catch (error) { checks.push({ name, layer, ok: false, durationMs: Math.round(performance.now() - started), detail: error instanceof Error ? error.message : "unknown_error" }); }
}
function assertBaseUrl() {
  const url = new URL(baseUrl);
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  const preview = url.protocol === "https:" && url.hostname.endsWith(".vercel.app");
  invariant(local || preview, "acceptance_base_url_not_allowlisted");
}
async function fetchJson(path: string, init: RequestInit = {}) {
  assertBaseUrl();
  const response = await fetch(baseUrl + path, { ...init, headers: { Accept: "application/json", ...(init.headers ?? {}) }, signal: AbortSignal.timeout(20_000) });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`http_${response.status}:${JSON.stringify(payload).slice(0, 300)}`);
  return object(payload, "response");
}
async function authenticated(path: string, body?: Record<string, unknown>) {
  invariant(token.length > 0, "AGENT_ACCEPTANCE_PRIVY_TOKEN_required");
  return fetchJson(path, { method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
}

await check("Capability truth", "registry", () => {
  const pangolin = getAvalancheCapability("pangolin.swap.avax_to_usdc");
  const cctp = getAvalancheCapability("circle.cctp.fuji_to_stellar");
  const x402 = getAvalancheCapability("x402.report.purchase");
  invariant(pangolin.status === "ready_to_test" && cctp.status === "ready_to_test", "unproven_write_marked_live");
  invariant(x402.status === "live", "proven_x402_not_live");
  invariant(pangolin.approval === "privy_single" && cctp.approval === "privy_dual", "privy_boundary_changed");
  return "Pangolin=ready_to_test, CCTP=ready_to_test, x402=live";
});
await check("Pinned Pangolin + Circle USDC contracts", "pangolin", () => {
  invariant(PANGOLIN_FUJI_ROUTER === "0x2D99ABD9008Dc933ff5c0CD271B88309593aB921", "pangolin_router_changed");
  invariant(PANGOLIN_FUJI_FACTORY.toLowerCase() === "0xe4a575550c2b460d2307b82dcd7afe84ad1484dd", "pangolin_factory_changed");
  invariant(PANGOLIN_FUJI_PAIR.toLowerCase() === "0x8aa1d713454bd21d10c9d25d717c59ad75406888", "pangolin_pair_changed");
  invariant(PANGOLIN_FUJI_USDC.toLowerCase() === CCTP_TESTNET.avalanche.usdc.toLowerCase(), "circle_usdc_mismatch");
  return `router=${PANGOLIN_FUJI_ROUTER}; USDC=${PANGOLIN_FUJI_USDC}`;
});
await check("Live Pangolin Fuji deployment", "pangolin", async () => {
  const deployment = await assertPangolinFujiDeployment();
  return `factory=${deployment.factory}; pair=${deployment.pair}; block=${deployment.blockNumber}`;
});
await check("Live Pangolin 0.1 AVAX quote", "pangolin", async () => {
  const quote = await getPangolinAvaxToUsdcQuote(SWAP_AMOUNT_ATOMIC);
  invariant(quote.amountIn === "0.1" && Number(quote.amountOut) > 0, "pangolin_quote_invalid");
  return `0.1 AVAX -> ${quote.amountOut} USDC; block=${quote.blockNumber}`;
});
await check("Bounded non-executing CCTP plan", "circle", () => {
  const plan = buildCctpFujiToStellarPlan({ amount: "1", sourceAddress: EVM_FIXTURE, destinationAddress: STELLAR_FIXTURE });
  invariant(plan.source.domain === 1 && plan.destination.domain === 27, "cctp_domain_mismatch");
  invariant(plan.amountAtomic === "1000000", "cctp_amount_changed");
  invariant(!plan.safety.executionEnabled && plan.safety.sourceApprovalRequired && plan.safety.destinationApprovalRequired, "cctp_safety_changed");
  invariant(!plan.fundsMoved && !plan.transactionPrepared, "cctp_doctor_mutated");
  return `domains 1->27; stages=${plan.stages.join(",")}`;
});
await check("Live Circle CCTP fee", "circle", async () => {
  const fees = await getCctpFujiToStellarFees();
  invariant(fees.sourceDomain === 1 && fees.destinationDomain === 27 && fees.options.length > 0, "cctp_fee_invalid");
  return fees.options.map((item) => `${item.finalityThreshold}:${item.minimumFeeUsdc} USDC`).join(", ");
});
await check("Live Avalanche x402 discovery", "x402", async () => {
  const result = await discoverAvalancheX402();
  invariant(result.ready && result.evidence, `x402_blocked:${result.blockers.join(",")}`);
  invariant(result.evidence.network === "eip155:43113", "x402_network_changed");
  invariant(result.evidence.tokenAddress.toLowerCase() === PANGOLIN_FUJI_USDC.toLowerCase(), "x402_usdc_mismatch");
  return `${result.evidence.provider}; ${result.evidence.settlement}; sponsored=${result.evidence.gasSponsored}`;
});

let evmAddress = "";
if (mode === "authenticated" || mode === "prepare") {
  await check("Privy multichain wallets", "authenticated", async () => {
    const response = await authenticated("/api/agent/wallets");
    const wallets = array(response.wallets, "wallets").map((item) => object(item, "wallet"));
    const evm = wallets.find((item) => item.network === "avalanche:fuji" && item.status === "active");
    const stellar = wallets.find((item) => item.network === "stellar:testnet" && item.status === "active");
    evmAddress = string(evm?.address, "fuji_wallet");
    return `Fuji=${evmAddress}; Stellar=${string(stellar?.address, "stellar_wallet")}`;
  });
  await check("Fuji diagnostics", "authenticated", async () => {
    const response = await authenticated("/api/agent/wallets/avalanche");
    invariant(response.chainId === 43113, "fuji_chain_mismatch");
    const balances = object(response.balances, "balances");
    return `${String(object(balances.native, "native").balance)} AVAX; ${String(object(balances.usdc, "usdc").balance)} USDC`;
  });
  await check("User CCTP readiness + plan", "authenticated", async () => {
    const readiness = await authenticated("/api/agent/bridge/cctp", { action: "readiness" });
    invariant(readiness.fundsMoved === false && readiness.transactionPrepared === false, "cctp_readiness_mutated");
    const response = await authenticated("/api/agent/bridge/cctp", { action: "plan", amount: "1", source: "avalanche:fuji", destination: "stellar:testnet" });
    invariant(response.fundsMoved === false && response.transactionPrepared === false, "cctp_plan_mutated");
    const blockers = array(object(response.plan, "plan").blockers, "blockers").map(String);
    return blockers.length ? `blockers=${blockers.join(",")}` : "ready for two scoped Privy approvals";
  });
}
if (mode === "prepare") {
  invariant(process.env.ACCEPT_AVALANCHE_PREPARATION === "I_UNDERSTAND_NO_FUNDS_MOVE", "Set ACCEPT_AVALANCHE_PREPARATION=I_UNDERSTAND_NO_FUNDS_MOVE to prepare");
  await check("Prepare Pangolin without broadcast", "authenticated", async () => {
    const preview = await authenticated("/api/agent/wallets/avalanche/pangolin-swap", { action: "prepare", requestId: `acceptance-${randomUUID()}`, amountInAtomic: SWAP_AMOUNT_ATOMIC, explicitUserConfirmation: true });
    invariant(preview.status === "prepared" && preview.transactionHash === null, "pangolin_prepare_broadcast");
    invariant(preview.from === evmAddress && preview.amountInAtomic === SWAP_AMOUNT_ATOMIC, "pangolin_preview_changed");
    return `preview=${string(preview.previewId, "preview_id")}; expires=${string(preview.expiresAt, "expires")}; no funds moved`;
  });
}

const failed = checks.filter((item) => !item.ok);
const report = {
  mode,
  baseUrl: mode === "doctor" ? null : baseUrl,
  generatedAt: new Date().toISOString(),
  safety: { testnetOnly: true, fundsMoved: false, transactionBroadcast: false, browserPrivyApprovalRequired: true },
  passed: checks.length - failed.length,
  failed: failed.length,
  checks,
};
if (outputPath) {
  const target = resolve(outputPath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, JSON.stringify(report, null, 2) + "\n", "utf8");
}
if (process.argv.includes("--json")) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`\nCarmelita Avalanche acceptance - ${mode}\n`);
  for (const item of checks) console.log(`${item.ok ? "PASS" : "FAIL"}  ${item.name} (${item.durationMs}ms)\n      ${item.detail}`);
  console.log(`\n${report.passed} passed - ${report.failed} failed\n`);
  console.log(mode === "doctor" ? "Next: authenticated mode with a temporary Privy token. No funds move.\n" : mode === "authenticated" ? "Next: prepare mode with the explicit no-broadcast flag.\n" : "Next: review the frozen preview in Carmelita and approve only when ready.\n");
}
if (failed.length) process.exitCode = 1;
