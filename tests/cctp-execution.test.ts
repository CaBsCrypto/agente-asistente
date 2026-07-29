import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { decodeFunctionData } from "viem";
import {
  CCTP_APPROVE_ABI,
  CCTP_BURN_ABI,
  CCTP_MAX_FEE_ATOMIC,
  CCTP_STANDARD_FINALITY,
  encodeCctpApprove,
  encodeCctpBurn,
} from "../app/cctp/evm";
import { getCctpAttestation } from "../app/cctp/attestation";
import {
  buildCctpFujiToStellarPlan,
  CCTP_TESTNET,
} from "../app/connectors/circle-cctp";

const EVM = "0x2BAa52Fa82FbFd5d103EB30181Bd0Fa11a04c0d0";
const STELLAR = "GBCTAHK3J56T4F2CSU3MQYQUMFO5ZS4IE3ZJGHOKFOYAAEN4ZAKAY5RZ";

function plan() {
  return buildCctpFujiToStellarPlan({
    amount: "1",
    sourceAddress: EVM,
    destinationAddress: STELLAR,
  });
}

test("CCTP approve grants only the exact bridge amount", () => {
  const decoded = decodeFunctionData({
    abi: CCTP_APPROVE_ABI,
    data: encodeCctpApprove("1000000"),
  });
  assert.equal(decoded.functionName, "approve");
  assert.deepEqual(decoded.args, [
    CCTP_TESTNET.avalanche.tokenMessengerV2,
    BigInt(1_000_000),
  ]);
});

test("CCTP burn is pinned to Stellar forwarder, standard finality and bounded fee", () => {
  const current = plan();
  const decoded = decodeFunctionData({
    abi: CCTP_BURN_ABI,
    data: encodeCctpBurn({
      amountAtomic: current.amountAtomic,
      mintRecipient: current.safety.mintRecipient,
      destinationCaller: current.safety.destinationCaller,
      hookData: current.safety.hookData,
    }),
  });
  assert.equal(decoded.functionName, "depositForBurnWithHook");
  assert.deepEqual(decoded.args?.slice(0, 7), [
    BigInt(1_000_000),
    CCTP_TESTNET.stellar.domain,
    current.safety.mintRecipient,
    CCTP_TESTNET.avalanche.usdc,
    current.safety.destinationCaller,
    CCTP_MAX_FEE_ATOMIC,
    CCTP_STANDARD_FINALITY,
  ]);
  assert.equal(decoded.args?.[2], decoded.args?.[4]);
});

test("CCTP burn rejects different mint recipient and destination caller", () => {
  const current = plan();
  assert.throws(() => encodeCctpBurn({
    amountAtomic: current.amountAtomic,
    mintRecipient: current.safety.mintRecipient,
    destinationCaller: `0x${"00".repeat(32)}`,
    hookData: current.safety.hookData,
  }), /cctp_forwarder_scope_mismatch/);
});

test("Circle attestation polling is one bounded read and reports pending", async () => {
  let calls = 0;
  const result = await getCctpAttestation(
    `0x${"11".repeat(32)}`,
    async (_input, init) => {
      calls += 1;
      assert.equal(init?.method, "GET");
      assert.equal(init?.credentials, "omit");
      return new Response("", { status: 404 });
    },
  );
  assert.equal(calls, 1);
  assert.equal(result.status, "pending");
});

test("Circle complete attestation is normalized without automatic mint", async () => {
  const result = await getCctpAttestation(
    `0x${"11".repeat(32)}`,
    async () => new Response(JSON.stringify({
      messages: [{
        message: `0x${"22".repeat(64)}`,
        attestation: `0x${"33".repeat(65)}`,
        status: "complete",
      }],
    }), { headers: { "content-type": "application/json" } }),
  );
  assert.equal(result.status, "complete");
  assert.match(result.message ?? "", /^0x22/);
});

test("CCTP execution API is authenticated, capped and confirmation-scoped", async () => {
  const source = await readFile(
    new URL("../app/api/agent/bridge/cctp/execute/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /verifyPrivyAccessToken/);
  assert.match(source, /sameOrigin/);
  assert.match(source, /MAX_TESTNET_USDC = 5/);
  assert.match(source, /explicitUserConfirmation: z\.literal\(true\)/);
  assert.match(source, /evaluateUserAction/);
  assert.match(source, /quarantineCctpTransfer/);
  assert.doesNotMatch(source, /privateKey|secretKey|process\.env.*KEY/i);
});

test("CCTP client persists a broadcast hash before server verification", async () => {
  const source = await readFile(
    new URL("../app/agent/cctp-bridge-action.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /useWallets/);
  assert.match(source, /useSignRawHash/);
  assert.match(source, /eth_sendTransaction/);
  assert.ok(
    source.indexOf("setSubmitted(submittedAction)") <
      source.indexOf("await recordEvm(submittedAction.kind"),
  );
  assert.doesNotMatch(source, /setInterval|privateKey|secretKey/i);
});

test("CCTP durable store rejects replacement hashes and quarantines ambiguity", async () => {
  const source = await readFile(
    new URL("../app/cctp/store.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /idempotency_key text NOT NULL UNIQUE/);
  assert.match(source, /approve_tx_hash text UNIQUE/);
  assert.match(source, /burn_tx_hash text UNIQUE/);
  assert.match(source, /mint_tx_hash text UNIQUE/);
  assert.match(source, /hash_replacement_rejected/);
  assert.match(source, /reconciliation_required/);
});
