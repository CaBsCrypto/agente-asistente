import assert from "node:assert/strict";
import test from "node:test";
import {
  getInternalTestnetFaucetReadiness,
  INTERNAL_TESTNET_USDC_DRIP,
} from "../app/x402/testnet-faucet";

test("internal USDC faucet stays disabled without a dedicated Testnet secret", () => {
  const current = process.env.STELLAR_TESTNET_USDC_DISTRIBUTOR_SECRET;
  delete process.env.STELLAR_TESTNET_USDC_DISTRIBUTOR_SECRET;
  try {
    assert.deepEqual(getInternalTestnetFaucetReadiness(), {
      configured: false, address: null, amount: INTERNAL_TESTNET_USDC_DRIP,
    });
  } finally {
    if (current) process.env.STELLAR_TESTNET_USDC_DISTRIBUTOR_SECRET = current;
  }
});
