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
import {
  proveX402ConfirmedReplay,
  proveX402FirstExecutionAndReplay,
  stellarAmountToAtomic,
} from "../app/x402/replay-proof";

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

test("converts Stellar decimal balances to exact atomic units", () => {
  assert.equal(stellarAmountToAtomic("0.0100000"), BigInt(100000));
  assert.equal(stellarAmountToAtomic("0.49"), BigInt(4900000));
  assert.throws(() => stellarAmountToAtomic("0.00000001"), /invalid_stellar_amount/);
});

test("proves one x402 debit and a zero-debit replay with the original receipt", async () => {
  let balance = BigInt(5_000_000);
  let calls = 0;
  const paymentId = "87c8a4e8-f60c-48d1-bdc8-35d9c6681f9c";
  const transactionHash = "14fcc8c31d26d8024a46e1509254502a9f722d6cbaa697af6c54d00e7803742e";
  const proof = await proveX402FirstExecutionAndReplay({
    paymentId,
    readUsdcBalance: async () => `${balance / BigInt(10_000_000)}.${(balance % BigInt(10_000_000)).toString().padStart(7, "0")}`,
    executeSameApproval: async () => {
      calls += 1;
      if (calls === 1) balance -= BigInt(100_000);
      return {
        replayed: calls > 1,
        payment: {
          id: paymentId,
          network: "stellar:testnet",
          amount: "0.0100000",
          status: "confirmed",
          transactionHash,
          resourcePreview: "delivered",
        },
      };
    },
  });
  assert.equal(proof.firstDebitAtomic, "100000");
  assert.equal(proof.replayDebitAtomic, "0");
  assert.equal(proof.transactionHash, transactionHash);
  assert.equal(proof.duplicatePrevented, true);
});

test("fails the replay proof if an adapter debits twice", async () => {
  let balance = BigInt(5_000_000);
  let calls = 0;
  const paymentId = "87c8a4e8-f60c-48d1-bdc8-35d9c6681f9c";
  await assert.rejects(
    proveX402FirstExecutionAndReplay({
      paymentId,
      readUsdcBalance: async () => `${balance / BigInt(10_000_000)}.${(balance % BigInt(10_000_000)).toString().padStart(7, "0")}`,
      executeSameApproval: async () => {
        calls += 1;
        balance -= BigInt(100_000);
        return {
          replayed: calls > 1,
          payment: {
            id: paymentId,
            network: "stellar:testnet",
            amount: "0.0100000",
            status: "confirmed",
            transactionHash: "a".repeat(64),
            resourcePreview: "delivered",
          },
        };
      },
    }),
    /x402_replay_balance_changed/,
  );
});

test("audits an already confirmed replay without another debit", async () => {
  const paymentId = "87c8a4e8-f60c-48d1-bdc8-35d9c6681f9c";
  const transactionHash = "ad55ea6adac08e9b09cce2bc51f8df6b40539ba1464cb768ee1c5174ff97d175";
  const proof = await proveX402ConfirmedReplay({
    paymentId,
    expectedTransactionHash: transactionHash,
    readUsdcBalance: async () => "0.4800000",
    replayConfirmedPayment: async () => ({
      replayed: true,
      payment: {
        id: paymentId,
        network: "stellar:testnet",
        amount: "0.0100000",
        status: "confirmed",
        transactionHash,
      },
    }),
  });
  assert.equal(proof.balanceBefore, proof.balanceAfterReplay);
  assert.equal(proof.replayDebitAtomic, "0");
});
