import assert from "node:assert/strict";
import test from "node:test";
import { encodePaymentSignatureHeader } from "@x402/core/http";
import type { PaymentPayload } from "@x402/core/types";
import { privateKeyToAccount } from "viem/accounts";
import { AVALANCHE_X402 } from "../app/x402-avalanche/config";
import type { AvalancheX402Facilitator } from "../app/x402-avalanche/facilitator";
import {
  deliverAvalancheMerchantResource,
  processAvalancheMerchantPayment,
  type AvalancheMerchantReceiptVerifier,
} from "../app/x402-avalanche/merchant";
import {
  createAvalancheMerchantChallenge,
  defineAvalancheMerchantResource,
  merchantRequestBodyHash,
} from "../app/x402-avalanche/merchant-protocol";
import { InMemoryAvalancheMerchantPaymentStore } from "../app/x402-avalanche/merchant-store";

const account = privateKeyToAccount(`0x${"1".repeat(64)}`);
const nowSeconds = 1_800_000_000;
const bodyHash = merchantRequestBodyHash('{"report":"avax"}');
const resource = defineAvalancheMerchantResource({
  merchantId: "merchant-flow",
  resourceId: "report-v1",
  canonicalUrl: "http://localhost:3001/api/demo/merchant/avalanche-report",
  description: "Avalanche report",
  mimeType: "application/json",
  amountAtomic: "10000",
  payTo: `0x${"b".repeat(40)}`,
});

async function paymentHeader(paymentIdentifier: string, nonceCharacter: string) {
  const challenge = createAvalancheMerchantChallenge(resource, bodyHash);
  const authorization = {
    from: account.address,
    to: resource.payTo,
    value: resource.amountAtomic,
    validAfter: String(nowSeconds - 1),
    validBefore: String(nowSeconds + 60),
    nonce: `0x${nonceCharacter.repeat(64)}` as `0x${string}`,
  };
  const signature = await account.signTypedData({
    domain: { name: "USD Coin", version: "2", chainId: BigInt(43113), verifyingContract: AVALANCHE_X402.asset.address },
    types: { TransferWithAuthorization: [
      { name: "from", type: "address" }, { name: "to", type: "address" },
      { name: "value", type: "uint256" }, { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" }, { name: "nonce", type: "bytes32" },
    ] },
    primaryType: "TransferWithAuthorization",
    message: { from: account.address, to: resource.payTo as `0x${string}`, value: BigInt(10000), validAfter: BigInt(authorization.validAfter), validBefore: BigInt(authorization.validBefore), nonce: authorization.nonce },
  });
  const payload: PaymentPayload = {
    x402Version: 2,
    resource: challenge.paymentRequired.resource,
    accepted: challenge.requirement,
    payload: { authorization, signature },
    extensions: {
      ...challenge.extensions,
      "payment-identifier": { ...challenge.extensions["payment-identifier"], info: { required: true, id: paymentIdentifier } },
    },
  };
  return encodePaymentSignatureHeader(payload);
}

function receiptVerifier(transaction: string): AvalancheMerchantReceiptVerifier {
  return {
    async verify({ record }) {
      return {
        transactionHash: transaction,
        network: AVALANCHE_X402.network,
        payer: record.authorization.from,
        payTo: record.authorization.to,
        asset: record.requirement.asset,
        amountAtomic: record.authorization.value,
      };
    },
  };
}

test("merchant flow settles and delivers once, then replays without a second charge", async () => {
  const header = await paymentHeader("merchant_flow_payment_0001", "c");
  const store = new InMemoryAvalancheMerchantPaymentStore();
  const transaction = `0x${"d".repeat(64)}`;
  let verifyCalls = 0;
  let settleCalls = 0;
  const facilitator: AvalancheX402Facilitator = {
    async verify() { verifyCalls += 1; return { isValid: true, payer: account.address }; },
    async settle() { settleCalls += 1; return { success: true, transaction, network: AVALANCHE_X402.network, payer: account.address }; },
  };
  const first = await processAvalancheMerchantPayment({ paymentSignature: header, resource, bodyHash, nowSeconds, store, facilitator, receiptVerifier: receiptVerifier(transaction) });
  assert.equal(first.kind, "paid");
  if (first.kind !== "paid") return;
  assert.equal(first.replayed, false);
  const delivered = await deliverAvalancheMerchantResource({ store, record: first.record, body: { report: "paid" } });
  assert.equal(delivered.record.status, "delivered");

  const replay = await processAvalancheMerchantPayment({ paymentSignature: header, resource, bodyHash, nowSeconds, store, facilitator, receiptVerifier: receiptVerifier(transaction) });
  assert.equal(replay.kind, "paid");
  if (replay.kind === "paid") assert.equal(replay.replayed, true);
  assert.equal(verifyCalls, 1);
  assert.equal(settleCalls, 1);
});

test("ambiguous settlement is quarantined and never delivered", async () => {
  const header = await paymentHeader("merchant_flow_payment_0002", "e");
  const store = new InMemoryAvalancheMerchantPaymentStore();
  const facilitator: AvalancheX402Facilitator = {
    async verify() { return { isValid: true, payer: account.address }; },
    async settle() { throw new Error("avalanche_x402_settle_ambiguous"); },
  };
  const result = await processAvalancheMerchantPayment({ paymentSignature: header, resource, bodyHash, nowSeconds, store, facilitator, receiptVerifier: receiptVerifier(`0x${"f".repeat(64)}`) });
  assert.equal(result.kind, "reconciliation_required");
  if (result.kind !== "reconciliation_required") return;
  await assert.rejects(deliverAvalancheMerchantResource({ store, record: result.record, body: { report: "must-not-leak" } }), /delivery_not_allowed/);
});