import assert from "node:assert/strict";
import test from "node:test";
import {
  getChannelsReadiness,
  OPENZEPPELIN_CHANNELS_TESTNET_URL,
} from "../app/infrastructure/openzeppelin-channels";
import { parseMppRouterCatalog } from "../app/infrastructure/mpp-router";
import { stellar8004Draft } from "../app/infrastructure/stellar-8004";

test("OpenZeppelin Channels is pinned to Testnet and does not expose its key", () => {
  const previous = process.env.OPENZEPPELIN_CHANNELS_TESTNET_API_KEY;
  process.env.OPENZEPPELIN_CHANNELS_TESTNET_API_KEY = "secret-test-key";
  try {
    const readiness = getChannelsReadiness();
    assert.equal(readiness.configured, true);
    assert.equal(readiness.network, "testnet");
    assert.equal(readiness.custody, false);
    assert.equal(readiness.userSignatureRequired, true);
    assert.equal(JSON.stringify(readiness).includes("secret-test-key"), false);
    assert.equal(OPENZEPPELIN_CHANNELS_TESTNET_URL.endsWith("/testnet"), true);
  } finally {
    if (previous === undefined) {
      delete process.env.OPENZEPPELIN_CHANNELS_TESTNET_API_KEY;
    } else {
      process.env.OPENZEPPELIN_CHANNELS_TESTNET_API_KEY = previous;
    }
  }
});

test("MPP Router parser de-duplicates and bounds service links", () => {
  const services = parseMppRouterCatalog(
    "# Catalog\n- [CoinGecko](https://example.com/cg)\n- [CoinGecko](https://example.com/cg)\n- [Search](https://example.com/search)",
    1,
  );
  assert.deepEqual(services, [
    { name: "CoinGecko", url: "https://example.com/cg" },
  ]);
});

test("Stellar 8004 material never claims registration before an on-chain proof", () => {
  assert.equal(stellar8004Draft.status, "draft-not-registered");
  assert.equal(stellar8004Draft.payments.mpp, "discovery-only");
});
