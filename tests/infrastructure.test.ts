import assert from "node:assert/strict";
import test from "node:test";
import {
  getChannelsReadiness,
  OPENZEPPELIN_CHANNELS_TESTNET_URL,
} from "../app/infrastructure/openzeppelin-channels";
import { normalizeMppRouterCatalog } from "../app/infrastructure/mpp-router";
import { stellar8004Draft } from "../app/infrastructure/stellar-8004";
import { getLangGraphReadiness } from "../app/orchestration/readiness";

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

test("MPP Router catalog exposes bounded live prices without payment execution", () => {
  const services = normalizeMppRouterCatalog(
    { services: [
      { id: "cg", name: "CoinGecko", price: "$0.003/request", public_path: "/v1/cg", payment_status: "verified" },
      { id: "search", name: "Search", price: "free", public_path: "/v1/search", payment_status: "available" },
    ] },
    1,
  );
  assert.deepEqual(services, [
    { id: "cg", name: "CoinGecko", price: "$0.003/request", path: "/v1/cg", paymentStatus: "verified" },
  ]);
});

test("Stellar 8004 material never claims registration before an on-chain proof", () => {
  assert.equal(stellar8004Draft.status, "draft-not-registered");
  assert.equal(stellar8004Draft.payments.mpp, "discovery-only");
});

test("LangGraph readiness exposes the shadow kernel without claiming production routing", () => {
  const readiness = getLangGraphReadiness();
  assert.equal(readiness.implemented, true);
  assert.equal(readiness.productionRouting, false);
  assert.equal(readiness.boundaries.modelCanSign, false);
  assert.equal(readiness.nodes.includes("approval_gate"), true);
  assert.equal(readiness.nodes.includes("execute_once"), true);
});
