import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildCctpForwarderHookData,
  buildCctpFujiToStellarPlan,
  CCTP_SANDBOX_API,
  CCTP_TESTNET,
  getCctpFujiToStellarFees,
} from "../app/connectors/circle-cctp";
import { parseCctpBridgeIntent } from "../app/connectors/circle-cctp-intents";

const EVM = "0x2BAa52Fa82FbFd5d103EB30181Bd0Fa11a04c0d0";
const STELLAR = "GBCTAHK3J56T4F2CSU3MQYQUMFO5ZS4IE3ZJGHOKFOYAAEN4ZAKAY5RZ";

test("CCTP constants pin the first bridge to official Fuji and Stellar Testnet deployments", () => {
  assert.equal(CCTP_TESTNET.avalanche.domain, 1);
  assert.equal(CCTP_TESTNET.avalanche.chainId, 43113);
  assert.equal(
    CCTP_TESTNET.avalanche.tokenMessengerV2,
    "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
  );
  assert.equal(CCTP_TESTNET.stellar.domain, 27);
  assert.equal(
    CCTP_TESTNET.stellar.cctpForwarder,
    "CA66Q2WFBND6V4UEB7RD4SAXSVIWMD6RA4X3U32ELVFGXV5PJK4T4VSZ",
  );
});

test("CCTP forwarder hook encodes the final Stellar strkey without a private key", () => {
  const hook = buildCctpForwarderHookData(STELLAR);
  const bytes = Buffer.from(hook.slice(2), "hex");
  assert.equal(bytes.readUInt32BE(24), 0);
  assert.equal(bytes.readUInt32BE(28), STELLAR.length);
  assert.equal(bytes.subarray(32).toString("utf8"), STELLAR);
});

test("CCTP plan is noncustodial, testnet-only and execution-disabled", () => {
  const plan = buildCctpFujiToStellarPlan({
    amount: "1.000001",
    sourceAddress: EVM,
    destinationAddress: STELLAR,
    readiness: {
      sourceAddress: EVM,
      destinationAddress: STELLAR,
      sourceGasReady: true,
      sourceUsdcBalance: "2",
      destinationGasReady: true,
      destinationTrustlineReady: true,
    },
  });
  assert.equal(plan.environment, "testnet");
  assert.equal(plan.route, "avalanche:fuji->stellar:testnet");
  assert.equal(plan.amountAtomic, "1000001");
  assert.equal(plan.safety.nonCustodial, true);
  assert.equal(plan.safety.executionEnabled, false);
  assert.equal(plan.safety.approvalRequired, true);
  assert.equal(plan.safety.mintRecipient, plan.safety.destinationCaller);
  assert.equal(plan.readyToPrepare, true);
  assert.equal(plan.fundsMoved, false);
  assert.equal(plan.transactionPrepared, false);
});

test("CCTP plan exposes every balance and trustline blocker", () => {
  const plan = buildCctpFujiToStellarPlan({
    amount: "1",
    sourceAddress: EVM,
    destinationAddress: STELLAR,
    readiness: {
      sourceAddress: EVM,
      destinationAddress: STELLAR,
      sourceGasReady: false,
      sourceUsdcBalance: "0.5",
      destinationGasReady: false,
      destinationTrustlineReady: false,
    },
  });
  assert.deepEqual(plan.blockers, [
    "fuji_avax_required",
    "fuji_usdc_required",
    "stellar_xlm_required",
    "stellar_circle_usdc_trustline_required",
  ]);
  assert.equal(plan.readyToPrepare, false);
});

test("Circle Sandbox fee lookup is fixed to domains 1 -> 27 and read-only", async () => {
  const calls: URL[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    calls.push(new URL(String(input)));
    assert.equal(init?.method, "GET");
    assert.equal(init?.credentials, "omit");
    assert.equal(init?.redirect, "error");
    return new Response(JSON.stringify([
      { finalityThreshold: 1000, minimumFee: 1 },
      { finalityThreshold: 2000, minimumFee: 0 },
    ]), { headers: { "content-type": "application/json" } });
  };
  const fees = await getCctpFujiToStellarFees(fetcher);
  assert.equal(CCTP_SANDBOX_API, "https://iris-api-sandbox.circle.com");
  assert.equal(calls[0]?.pathname, "/v2/burn/USDC/fees/1/27");
  assert.equal(fees.options[0]?.minimumFeeUsdc, "0.000001");
  assert.equal(fees.options[1]?.minimumFeeUsdc, "0.000000");
});

test("CCTP chat parser supports Spanish, English and Portuguese", () => {
  assert.deepEqual(
    parseCctpBridgeIntent("Puentea 1 USDC desde Avalanche Fuji a Stellar Testnet"),
    {
      operation: "plan",
      amount: "1",
      source: "avalanche:fuji",
      destination: "stellar:testnet",
    },
  );
  assert.equal(
    parseCctpBridgeIntent("Bridge 0.5 USDC from Avalanche to Stellar")?.operation,
    "plan",
  );
  assert.equal(
    parseCctpBridgeIntent("Transfira 2 USDC pela ponte de Avalanche para Stellar")?.operation,
    "plan",
  );
  assert.equal(
    parseCctpBridgeIntent("Can I use a multichain bridge?")?.operation,
    "readiness",
  );
  assert.equal(
    parseCctpBridgeIntent("Bridge 1 USDC from Stellar to Avalanche")?.operation,
    "unsupported_route",
  );
});

test("CCTP API exposes readiness, fees and plan but no execution endpoint", async () => {
  const route = await readFile(
    new URL("../app/api/agent/bridge/cctp/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(route, /verifyPrivyAccessToken/);
  assert.match(route, /sameOrigin/);
  assert.match(route, /z\.literal\("readiness"\)/);
  assert.match(route, /z\.literal\("fees"\)/);
  assert.match(route, /z\.literal\("plan"\)/);
  assert.doesNotMatch(
    route,
    /privateKey|secretKey|sendTransaction|signTransaction|depositForBurn|mint_and_forward/i,
  );
});
