import { access, lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const fujiRpc = "https://api.avax-test.network/ext/bc/C/rpc";
const results = [];

function result(name, status, detail) {
  results.push({ status });
  console.log(`[${status}] ${name}: ${detail}`);
}
function tuple(value) { return value.replace(/^v/, "").split(".").slice(0, 3).map(Number); }
function atLeast(actual, minimum) {
  for (let i = 0; i < minimum.length; i += 1) {
    if ((actual[i] ?? 0) > minimum[i]) return true;
    if ((actual[i] ?? 0) < minimum[i]) return false;
  }
  return true;
}
async function exists(relative) {
  try { await access(path.join(root, relative)); return true; } catch { return false; }
}
async function rpc(method) {
  const response = await fetch(fujiRpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: [] }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = await response.json();
  if (body.error) throw new Error(body.error.message ?? "RPC error");
  return body.result;
}

console.log("Carmelita runtime doctor (read-only; no secrets or transactions)\n");
const nodeOk = atLeast(tuple(process.version), [22, 13, 0]);
result("Node.js", nodeOk ? "PASS" : "FAIL", `${process.version}; required >=22.13.0`);
const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
result("Package manager", pkg.packageManager === "npm@11.6.1" ? "PASS" : "WARN", pkg.packageManager ?? "not pinned");

if (!(await exists("node_modules"))) {
  result("Dependency install", "FAIL", "node_modules missing; run npm ci");
} else {
  const modules = path.join(root, "node_modules");
  const stats = await lstat(modules);
  const resolved = await realpath(modules);
  const local = !stats.isSymbolicLink() && resolved.toLowerCase() === modules.toLowerCase();
  result("Dependency isolation", local ? "PASS" : "FAIL", local ? resolved : `external link: ${resolved}`);
  const required = ["node_modules/next/package.json", "node_modules/tsx/package.json", "node_modules/@privy-io/react-auth/package.json"];
  const missing = [];
  for (const item of required) if (!(await exists(item))) missing.push(item);
  result("Required packages", missing.length ? "FAIL" : "PASS", missing.length ? `missing: ${missing.join(", ")}` : "Next.js, tsx and Privy installed");
}

const files = [
  "app/agent/page.tsx",
  "app/api/agent/wallets/route.ts",
  "app/wallets/networks.ts",
  "app/wallets/avalanche-distributor.ts",
  "app/api/agent/wallets/avalanche/fund/route.ts",
];
const missingFiles = [];
for (const item of files) if (!(await exists(item))) missingFiles.push(item);
result("Application files", missingFiles.length ? "FAIL" : "PASS", missingFiles.length ? `missing: ${missingFiles.join(", ")}` : "agent, wallet API and network registry present");

for (const [label, keys] of [
  ["Privy public app ID", ["NEXT_PUBLIC_PRIVY_APP_ID"]],
  ["Privy server secret", ["PRIVY_APP_SECRET"]],
  ["database URL", ["DATABASE_URL", "POSTGRES_URL", "STORAGE_URL"]],
]) {
  const configured = keys.some((key) => Boolean(process.env[key]));
  result(`Environment: ${label}`, configured ? "PASS" : "WARN", configured ? "configured (value hidden)" : `not present (${keys.join(" or ")})`);
}

const distributorEnabled = process.env.FUJI_DISTRIBUTOR_ENABLED === "true";
if (!distributorEnabled) {
  result("Fuji distributor", "PASS", "disabled (safe default; no external request possible)");
} else {
  const distributorUrl = process.env.FUJI_DISTRIBUTOR_URL;
  const distributorSecret = process.env.FUJI_DISTRIBUTOR_SECRET ?? "";
  const dailyLimit = Number(process.env.FUJI_DISTRIBUTOR_DAILY_LIMIT ?? "100");
  const timeoutMs = Number(process.env.FUJI_DISTRIBUTOR_TIMEOUT_MS ?? "5000");
  let endpointValid = false;
  try {
    const url = new URL(distributorUrl ?? "");
    const hostname = url.hostname.toLowerCase();
    const forbiddenHost = ["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(hostname)
      || hostname.endsWith(".localhost") || hostname.endsWith(".local")
      || /^10\./.test(hostname) || /^192\.168\./.test(hostname)
      || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) || /^169\.254\./.test(hostname);
    endpointValid = url.protocol === "https:"
      && !url.username && !url.password && !url.search && !url.hash && !forbiddenHost;
  } catch {}
  const controlsValid = endpointValid
    && distributorSecret.length >= 32
    && Number.isInteger(dailyLimit) && dailyLimit >= 1 && dailyLimit <= 500
    && Number.isInteger(timeoutMs) && timeoutMs >= 1_000 && timeoutMs <= 10_000;
  result(
    "Fuji distributor",
    controlsValid ? "PASS" : "FAIL",
    controlsValid
      ? `enabled; HTTPS endpoint configured, dailyLimit=${dailyLimit}, timeoutMs=${timeoutMs}, secret hidden`
      : "enabled but required HTTPS/secret/cap/timeout controls are incomplete",
  );
}

try {
  const [chainHex, gasHex, blockHex] = await Promise.all([rpc("eth_chainId"), rpc("eth_gasPrice"), rpc("eth_blockNumber")]);
  const chainId = Number.parseInt(chainHex, 16);
  result("Avalanche Fuji RPC", chainId === 43113 ? "PASS" : "FAIL", `chainId=${chainId}, block=${Number.parseInt(blockHex, 16)}, gasPriceWei=${BigInt(gasHex)}`);
} catch (error) {
  result("Avalanche Fuji RPC", "FAIL", error instanceof Error ? error.message : String(error));
}

const urlArg = process.argv.find((arg) => arg.startsWith("--url="));
const localUrl = urlArg?.slice(6) || process.env.LOCAL_APP_URL;
if (!localUrl) {
  result("Local HTTP", "WARN", "not requested; pass --url=http://localhost:3001");
} else {
  try {
    const response = await fetch(localUrl, { redirect: "manual", signal: AbortSignal.timeout(8_000) });
    const ok = response.status >= 200 && response.status < 400;
    result("Local HTTP", ok ? "PASS" : "FAIL", `${localUrl} returned HTTP ${response.status}`);
  } catch (error) {
    result("Local HTTP", "FAIL", error instanceof Error ? error.message : String(error));
  }
}

const failures = results.filter(({ status }) => status === "FAIL").length;
const warnings = results.filter(({ status }) => status === "WARN").length;
console.log(`\nSummary: ${results.length - failures - warnings} passed, ${warnings} warnings, ${failures} failed`);
process.exitCode = failures ? 1 : 0;
