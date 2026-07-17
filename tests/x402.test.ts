import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  atomicToDisplay,
  X402_TESTNET_USDC,
} from "../app/x402/assets";
import {
  freezeRequirement,
  sameRequirement,
  selectSafeX402Requirement,
} from "../app/x402/protocol";
import { x402AuthEntryDigest } from "../app/x402/privy-signer";
import {
  isPreparedX402Authorization,
  stellarClientSignatureBytes,
} from "../app/x402/client-authorization";

function challenge(overrides: Record<string, unknown> = {}) {
  return {
    x402Version: 2,
    resource: { url: "https://stellar.org/x402-demo/api/protected/testnet", description: "demo", mimeType: "text/html" },
    accepts: [{
      scheme: "exact",
      network: X402_TESTNET_USDC.network,
      asset: X402_TESTNET_USDC.contract,
      amount: "100000",
      payTo: "GBCTAHK3JJ56T4F2CSU3MQYQUMFO5ZS4IE3ZJGHOKFOYAAEN4ZAKAY5RZ",
      maxTimeoutSeconds: 60,
      extra: { areFeesSponsored: true },
      ...overrides,
    }],
  } as never;
}

test("formats Stellar atomic USDC amounts", () => {
  assert.equal(atomicToDisplay("100000"), "0.0100000");
  assert.equal(atomicToDisplay("1"), "0.0000001");
});

test("accepts only the capped official Stellar x402 Testnet USDC option", () => {
  const selected = selectSafeX402Requirement(challenge());
  assert.equal(selected.amount, "100000");
  assert.equal(selected.asset, X402_TESTNET_USDC.contract);
  assert.throws(() => selectSafeX402Requirement(challenge({ network: "stellar:pubnet" })), /safe_testnet_option_not_found/);
  assert.throws(() => selectSafeX402Requirement(challenge({ amount: "100001" })), /safe_testnet_option_not_found/);
});

test("freezes every payment field before Privy approval", () => {
  const selected = selectSafeX402Requirement(challenge());
  const frozen = freezeRequirement(selected);
  assert.equal(sameRequirement(selected, frozen), true);
  assert.equal(sameRequirement({ ...selected, payTo: "GCHANGED" }, frozen), false);
});

test("Privy signer hashes the auth-entry bytes exactly as SEP-43 expects", () => {
  const authEntry = Buffer.from("stellar-x402-auth-entry").toString("base64");
  const expected = createHash("sha256").update(Buffer.from(authEntry, "base64")).digest("hex");
  assert.equal(Buffer.from(x402AuthEntryDigest(authEntry)).toString("hex"), expected);
});

test("accepts only a complete client-signature authorization envelope", () => {
  const prepared = {
    format: "stellar-x402-client-signature-v1",
    x402Version: 2,
    requirement: {
      network: X402_TESTNET_USDC.network,
      asset: X402_TESTNET_USDC.contract,
      amount: "100000",
      payTo: "GBCTAHK3JJ56T4F2CSU3MQYQUMFO5ZS4IE3ZJGHOKFOYAAEN4ZAKAY5RZ",
    },
    transactionJson: "{}",
    authorizationHash: `0x${"ab".repeat(32)}`,
    maxLedger: 123,
  };
  assert.equal(isPreparedX402Authorization(prepared), true);
  assert.equal(isPreparedX402Authorization({ ...prepared, authorizationHash: "0x12" }), false);
});

test("rejects malformed Privy Stellar signatures before submission", () => {
  assert.equal(stellarClientSignatureBytes(`0x${"ab".repeat(64)}`).length, 64);
  assert.throws(() => stellarClientSignatureBytes("0x12"), /invalid_stellar_client_signature/);
});
