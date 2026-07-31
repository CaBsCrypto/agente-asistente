import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { listAvalancheCapabilities, planAvalancheCapability } from "../app/avalanche/capability-registry";

test("Avalanche registry separates reads from approval-bound financial actions", () => {
  const capabilities = listAvalancheCapabilities();
  assert.equal(capabilities.length, 7);
  assert.equal(capabilities.find((item) => item.id === "dexalot.quote.read")?.approval, "none");
  assert.equal(capabilities.find((item) => item.id === "x402.report.purchase")?.approval, "privy_single");
  assert.equal(capabilities.find((item) => item.id === "circle.cctp.fuji_to_stellar")?.approval, "privy_dual");
});

test("x402 preflight requires Fuji USDC but not AVAX", () => {
  const plan = planAvalancheCapability("x402.report.purchase", { authenticated: true, evmWallet: true });
  assert.deepEqual(plan.blockers, ["fuji_usdc"]);
  assert.equal(plan.approvalRequired, true);
  assert.equal(plan.executable, false);
});

test("CCTP preflight enumerates cross-chain blockers deterministically", () => {
  const plan = planAvalancheCapability("circle.cctp.fuji_to_stellar", { authenticated: true, evmWallet: true, stellarWallet: true });
  assert.deepEqual(plan.blockers, ["fuji_avax", "fuji_usdc", "stellar_usdc_trustline"]);
  assert.equal(plan.boundary, "prepare_then_explicit_privy_approval");
});

test("personal MCP exposes discovery and planning without execution", async () => {
  const source = await readFile(new URL("../app/api/mcp/agent/route.ts", import.meta.url), "utf8");
  assert.match(source, /list_avalanche_capabilities/);
  assert.match(source, /plan_avalanche_capability/);
  assert.match(source, /readOnlyHint: true/);
  const section = source.slice(source.indexOf("list_avalanche_capabilities"), source.indexOf("send_agent_message"));
  assert.doesNotMatch(section, /sendTransaction|signTypedData|broadcast\s*\(|privateKey/i);
});

test("capability API is authenticated and same-origin", async () => {
  const source = await readFile(new URL("../app/api/agent/avalanche/capabilities/route.ts", import.meta.url), "utf8");
  assert.match(source, /verifyPrivyAccessToken/);
  assert.match(source, /sameOrigin/);
  assert.doesNotMatch(source, /sendTransaction|signTypedData|privateKey/i);
});


test("capability parser supports English, Spanish and Portuguese", async () => {
  const { parseAvalancheCapabilitiesIntent } = await import("../app/connectors/avalanche-read-intents");
  assert.equal(parseAvalancheCapabilitiesIntent("¿Qué puedo hacer en Avalanche?")?.operation, "capabilities");
  assert.equal(parseAvalancheCapabilitiesIntent("What can I do on Fuji?")?.operation, "capabilities");
  assert.equal(parseAvalancheCapabilitiesIntent("O que posso fazer na Avalanche?")?.operation, "capabilities");
  assert.equal(parseAvalancheCapabilitiesIntent("Show my Stellar wallet"), null);
});
