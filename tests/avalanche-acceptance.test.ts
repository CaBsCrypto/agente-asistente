import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getAvalancheCapability, planAvalancheCapability } from "../app/avalanche/capability-registry";

test("Pangolin remains ready_to_test until a Fuji receipt exists", () => {
  const capability = getAvalancheCapability("pangolin.swap.avax_to_usdc");
  assert.equal(capability.status, "ready_to_test");
  assert.equal(capability.operation, "financial");
  assert.equal(capability.approval, "privy_single");
  assert.match(capability.evidence, /No Fuji swap hash/i);
});

test("Pangolin policy blocks unfunded wallets and requires Privy approval", () => {
  const blocked = planAvalancheCapability("pangolin.swap.avax_to_usdc", {
    authenticated: true,
    evmWallet: true,
    fujiAvax: false,
  });
  assert.equal(blocked.executable, false);
  assert.ok(blocked.blockers.includes("fuji_avax"));

  const funded = planAvalancheCapability("pangolin.swap.avax_to_usdc", {
    authenticated: true,
    evmWallet: true,
    fujiAvax: true,
  });
  assert.equal(funded.executable, true);
  assert.equal(funded.approvalRequired, true);
  assert.equal(funded.capability.approval, "privy_single");
});

test("Avalanche acceptance runner cannot broadcast or handle private keys", () => {
  const source = readFileSync(new URL("../scripts/avalanche-acceptance.ts", import.meta.url), "utf8");
  assert.match(source, /doctor\|authenticated\|prepare/);
  assert.match(source, /I_UNDERSTAND_NO_FUNDS_MOVE/);
  assert.match(source, /transactionHash === null/);
  assert.match(source, /browserPrivyApprovalRequired: true/);
  assert.match(source, /Live Pangolin 0\.1 AVAX quote/);
  assert.match(source, /Live Circle CCTP fee/);
  assert.match(source, /Live Avalanche x402 discovery/);
  assert.doesNotMatch(source, /eth_sendTransaction|privateKey|secretKey|signRawHash/);
});
