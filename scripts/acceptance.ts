import { randomUUID } from "node:crypto";
import {
  getStellarTestnetAccount,
  isValidStellarAddress,
} from "../app/privy-stellar";
import { futureTravalaDates, searchTravalaHotels } from "../app/travala";
import {
  X402_DEMO_LIMIT_DISPLAY,
  X402_TESTNET_RESOURCE,
  X402_TESTNET_USDC,
} from "../app/x402/assets";
import { inspectX402Resource } from "../app/x402/protocol";
import {
  INTERNAL_TESTNET_USDC_DISTRIBUTOR_ADDRESS,
  INTERNAL_TESTNET_USDC_DRIP,
} from "../app/x402/testnet-faucet";

type Mode = "doctor" | "authenticated" | "execute" | "travala";
type CheckResult = {
  name: string;
  layer: "local" | "production" | "stellar" | "authenticated" | "travala";
  ok: boolean;
  durationMs: number;
  detail: string;
};
type JsonObject = Record<string, unknown>;

const mode = (process.argv[2] ?? "doctor") as Mode;
if (!(["doctor", "authenticated", "execute", "travala"] as string[]).includes(mode)) {
  throw new Error("usage: acceptance.ts <doctor|authenticated|execute|travala>");
}

const baseUrl = (process.env.AGENT_ACCEPTANCE_BASE_URL ?? "https://agente-asistente.vercel.app").replace(/\/$/, "");
const token = process.env.AGENT_ACCEPTANCE_PRIVY_TOKEN?.trim() ?? "";
const jsonOutput = process.argv.includes("--json");
const checks: CheckResult[] = [];

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function object(value: unknown, label: string): JsonObject {
  invariant(Boolean(value) && typeof value === "object" && !Array.isArray(value), `${label}_invalid`);
  return value as JsonObject;
}

function string(value: unknown, label: string) {
  invariant(typeof value === "string" && value.length > 0, `${label}_missing`);
  return value;
}

async function check(
  name: string,
  layer: CheckResult["layer"],
  operation: () => Promise<string> | string,
) {
  const started = performance.now();
  try {
    const detail = await operation();
    checks.push({ name, layer, ok: true, durationMs: Math.round(performance.now() - started), detail });
  } catch (error) {
    checks.push({
      name,
      layer,
      ok: false,
      durationMs: Math.round(performance.now() - started),
      detail: error instanceof Error ? error.message : "unknown_error",
    });
  }
}

async function fetchJson(path: string, init: RequestInit = {}) {
  const response = await fetch(baseUrl + path, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(20_000),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const body = payload && typeof payload === "object" ? JSON.stringify(payload) : "invalid_json";
    throw new Error(`http_${response.status}:${body.slice(0, 240)}`);
  }
  return object(payload, path.replace(/\W+/g, "_") || "root");
}

async function authenticatedRequest(path: string, body?: JsonObject) {
  invariant(token.length > 0, "AGENT_ACCEPTANCE_PRIVY_TOKEN_required");
  return fetchJson(path, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

await check("Safety constants are Testnet-only", "local", () => {
  invariant(X402_TESTNET_USDC.network === "stellar:testnet", "x402_network_not_testnet");
  invariant(X402_DEMO_LIMIT_DISPLAY === "0.0100000", "x402_limit_changed");
  invariant(INTERNAL_TESTNET_USDC_DRIP === "0.5000000", "faucet_drip_changed");
  invariant(isValidStellarAddress(INTERNAL_TESTNET_USDC_DISTRIBUTOR_ADDRESS), "distributor_address_invalid");
  return "Stellar Testnet, 0.01 USDC payment cap, 0.50 USDC drip";
});

await check("Production health contract", "production", async () => {
  const health = await fetchJson("/api/health");
  invariant(health.status === "ok", "health_not_ok");
  invariant(health.environment === "stellar-testnet", "health_environment_mismatch");
  const payments = object(health.payments, "health_payments");
  invariant(payments.x402StellarTestnet === "enabled", "x402_not_enabled");
  invariant(payments.mainnet === "disabled", "mainnet_not_disabled");
  return `persistence=${String(health.persistence)}, mainnet=disabled`;
});

await check("Production agent page", "production", async () => {
  const response = await fetch(baseUrl + "/agent", {
    redirect: "manual",
    signal: AbortSignal.timeout(20_000),
  });
  invariant(response.status === 200, `agent_http_${response.status}`);
  invariant((response.headers.get("content-type") ?? "").includes("text/html"), "agent_not_html");
  return "HTTP 200";
});

await check("MCP discovery contract", "production", async () => {
  const discovery = await fetchJson("/.well-known/mcp");
  const security = object(discovery.security, "mcp_security");
  const payments = object(security.payments, "mcp_payments");
  invariant(payments.mainnet === "disabled", "mcp_mainnet_not_disabled");
  invariant(payments.x402StellarTestnet === "explicit-user-approval", "mcp_x402_boundary_missing");
  return "sandbox, personal-agent and provider surfaces advertised";
});

await check("Official x402 live challenge", "stellar", async () => {
  const inspected = await inspectX402Resource(X402_TESTNET_RESOURCE);
  invariant(inspected.requirement.network === X402_TESTNET_USDC.network, "challenge_network_changed");
  invariant(inspected.requirement.asset === X402_TESTNET_USDC.contract, "challenge_asset_changed");
  invariant(inspected.amountDisplay === X402_DEMO_LIMIT_DISPLAY, "challenge_amount_changed");
  invariant(isValidStellarAddress(inspected.requirement.payTo), "challenge_recipient_invalid");
  return `${inspected.amountDisplay} USDC -> ${inspected.requirement.payTo.slice(0, 8)}...`;
});

await check("Internal distributor readiness", "stellar", async () => {
  const account = await getStellarTestnetAccount(INTERNAL_TESTNET_USDC_DISTRIBUTOR_ADDRESS);
  invariant(account.exists, "distributor_account_missing");
  const usdc = account.balances.find(
    (balance) => balance.asset === "USDC" && balance.issuer === X402_TESTNET_USDC.issuer,
  );
  const xlm = account.balances.find((balance) => balance.asset === "XLM");
  invariant(Boolean(usdc), "distributor_trustline_missing");
  invariant(Number(usdc?.balance ?? 0) >= Number(INTERNAL_TESTNET_USDC_DRIP), "distributor_usdc_low");
  invariant(Number(xlm?.balance ?? 0) > 1, "distributor_xlm_low");
  return `${usdc?.balance} USDC, ${xlm?.balance} XLM`;
});


if (mode === "travala") {
  await check("Live Travala read-only search", "travala", async () => {
    const location = process.env.TRAVALA_ACCEPTANCE_LOCATION?.trim() || "Santiago, Chile";
    const dates = futureTravalaDates(new Date(), 45, 2);
    const result = await searchTravalaHotels({
      location,
      ...dates,
      guests: 2,
    });
    invariant(result.sessionId.length > 0, "travala_session_missing");
    invariant(result.hotels.length > 0, "travala_inventory_empty");
    invariant(result.hotels.every((hotel) => hotel.totalPriceUSD >= 0), "travala_price_invalid");
    const first = result.hotels[0];
    return `${location}, ${dates.checkIn} to ${dates.checkOut}: ${result.hotels.length} options; first=${first.name}`;
  });
}
if (mode === "authenticated" || mode === "execute") {
  let walletAddress = "";
  let paymentId = "";
  let firstHash = "";

  await check("Privy bootstrap", "authenticated", async () => {
    const bootstrap = await authenticatedRequest("/api/agent/bootstrap", {});
    const wallet = object(bootstrap.wallet, "bootstrap_wallet");
    walletAddress = string(wallet.address, "wallet_address");
    invariant(isValidStellarAddress(walletAddress), "wallet_address_invalid");
    return `${walletAddress.slice(0, 8)}... on Stellar Testnet`;
  });

  await check("Authenticated x402 status", "authenticated", async () => {
    const status = await authenticatedRequest("/api/agent/x402");
    const wallet = object(status.wallet, "x402_wallet");
    invariant(string(wallet.address, "x402_wallet_address") === walletAddress, "wallet_identity_mismatch");
    return "Privy identity and persisted wallet agree";
  });

  if (mode === "execute") {
    invariant(
      process.env.ACCEPT_TESTNET_MUTATIONS === "I_UNDERSTAND_TESTNET_ONLY",
      "Set ACCEPT_TESTNET_MUTATIONS=I_UNDERSTAND_TESTNET_ONLY to execute",
    );
    const origin = new URL(baseUrl);
    invariant(
      origin.hostname === "agente-asistente.vercel.app" || origin.hostname === "localhost",
      "execute_base_url_not_allowlisted",
    );

    await check("Trustline and automatic funding", "authenticated", async () => {
      let status = await authenticatedRequest("/api/agent/x402");
      let usdc = object(status.x402Usdc, "x402_usdc");
      if (usdc.trustlineActive !== true) {
        const prepared = await authenticatedRequest("/api/agent/x402", {
          action: "prepare_trustline",
          requestId: `acceptance-${randomUUID()}`,
        });
        if (prepared.alreadyComplete !== true) {
          const approval = object(prepared.approval, "trustline_approval");
          await authenticatedRequest("/api/agent/x402", {
            action: "execute_trustline",
            approvalId: string(approval.id, "trustline_approval_id"),
            explicitConfirmation: true,
          });
        }
      }
      status = await authenticatedRequest("/api/agent/x402");
      usdc = object(status.x402Usdc, "x402_usdc_after_trustline");
      invariant(usdc.trustlineActive === true, "trustline_not_active");
      if (Number(usdc.balance ?? 0) < 0.01) {
        await authenticatedRequest("/api/agent/x402", { action: "claim_testnet_usdc" });
      }
      status = await authenticatedRequest("/api/agent/x402");
      usdc = object(status.x402Usdc, "x402_usdc_after_funding");
      invariant(Number(usdc.balance ?? 0) >= 0.01, "automatic_funding_failed");
      return `${String(usdc.balance)} USDC available`;
    });

    await check("Live x402 payment", "authenticated", async () => {
      const prepared = await authenticatedRequest("/api/agent/x402", {
        action: "prepare",
        requestId: `acceptance-${randomUUID()}`,
      });
      const payment = object(prepared.payment, "prepared_payment");
      paymentId = string(payment.id, "payment_id");
      invariant(payment.network === "stellar:testnet", "prepared_network_not_testnet");
      invariant(payment.amount === X402_DEMO_LIMIT_DISPLAY, "prepared_amount_changed");
      const executed = await authenticatedRequest("/api/agent/x402", {
        action: "execute",
        paymentId,
        explicitConfirmation: true,
      });
      const receipt = object(executed.payment, "executed_payment");
      firstHash = string(receipt.transactionHash, "payment_transaction_hash");
      invariant(receipt.status === "confirmed", "payment_not_confirmed");
      invariant(typeof receipt.resourcePreview === "string", "resource_not_delivered");
      return `confirmed ${firstHash.slice(0, 12)}...`;
    });

    await check("Duplicate-resistant replay", "authenticated", async () => {
      invariant(paymentId.length > 0 && firstHash.length > 0, "first_payment_missing");
      const replay = await authenticatedRequest("/api/agent/x402", {
        action: "execute",
        paymentId,
        explicitConfirmation: true,
      });
      invariant(replay.replayed === true, "replay_flag_missing");
      const receipt = object(replay.payment, "replayed_payment");
      invariant(receipt.transactionHash === firstHash, "replay_hash_changed");
      return `same receipt ${firstHash.slice(0, 12)}...`;
    });
  }
}

const failed = checks.filter((result) => !result.ok);
const report = {
  mode,
  baseUrl,
  generatedAt: new Date().toISOString(),
  passed: checks.length - failed.length,
  failed: failed.length,
  checks,
};

if (jsonOutput) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`\nagent-assistant acceptance - ${mode}\n`);
  for (const result of checks) {
    console.log(`${result.ok ? "PASS" : "FAIL"}  ${result.name} (${result.durationMs}ms)`);
    console.log(`      ${result.detail}`);
  }
  console.log(`\n${report.passed} passed - ${report.failed} failed\n`);
  if (mode === "doctor") {
    console.log("Next: use authenticated mode with a temporary Privy token; execute mode additionally requires the explicit Testnet mutation flag.\n");
  }
}

if (failed.length > 0) process.exitCode = 1;
