import assert from "node:assert/strict";
import test from "node:test";
import { decodePaymentRequiredHeader, encodePaymentSignatureHeader } from "@x402/core/http";
import type { PaymentPayload, SettleResponse } from "@x402/core/types";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { AVALANCHE_X402 } from "../app/x402-avalanche/config";
import {
  createAvalancheMerchantChallenge,
  defineAvalancheMerchantResource,
  merchantRequestBodyHash,
  validateAvalancheMerchantPayment,
} from "../app/x402-avalanche/merchant-protocol";
import { InMemoryAvalancheMerchantPaymentStore } from "../app/x402-avalanche/merchant-store";

const nowSeconds = 1_800_000_000;
const rawBody = JSON.stringify({ report: "avalanche-market" });
const bodyHash = merchantRequestBodyHash(rawBody);
const resource = defineAvalancheMerchantResource({
  merchantId: "merchant-demo",
  resourceId: "avalanche-report-v1",
  canonicalUrl: "http://localhost:3001/api/demo/merchant/avalanche-report",
  description: "Avalanche market report",
  mimeType: "application/json",
  amountAtomic: "10000",
  payTo: `0x${"b".repeat(40)}`,
});

async function signedFixture(paymentIdentifier = "merchant_payment_00000001") {
  const account = privateKeyToAccount(generatePrivateKey());
  const challenge = createAvalancheMerchantChallenge(resource, bodyHash);
  const authorization = {
    from: account.address,
    to: resource.payTo,
    value: resource.amountAtomic,
    validAfter: String(nowSeconds - 1),
    validBefore: String(nowSeconds + 60),
    nonce: `0x${"c".repeat(64)}` as `0x${string}`,
  };
  const signature = await account.signTypedData({
    domain: {
      name: AVALANCHE_X402.asset.eip712Name,
      version: AVALANCHE_X402.asset.eip712Version,
      chainId: BigInt(AVALANCHE_X402.chainId),
      verifyingContract: AVALANCHE_X402.asset.address,
    },
    types: {
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    },
    primaryType: "TransferWithAuthorization",
    message: {
      from: authorization.from,
      to: authorization.to as `0x${string}`,
      value: BigInt(authorization.value),
      validAfter: BigInt(authorization.validAfter),
      validBefore: BigInt(authorization.validBefore),
      nonce: authorization.nonce,
    },
  });
  const payload: PaymentPayload = {
    x402Version: 2,
    resource: challenge.paymentRequired.resource,
    accepted: challenge.requirement,
    payload: { signature, authorization },
    extensions: {
      ...challenge.extensions,
      "payment-identifier": {
        ...challenge.extensions["payment-identifier"],
        info: { required: true, id: paymentIdentifier },
      },
    },
  };
  const header = encodePaymentSignatureHeader(payload);
  return { account, authorization, challenge, header, payload };
}

test("merchant challenge is canonical x402 v2 for Fuji USDC", () => {
  const challenge = createAvalancheMerchantChallenge(resource, bodyHash);
  const decoded = decodePaymentRequiredHeader(challenge.header);
  assert.equal(decoded.x402Version, 2);
  assert.equal(decoded.accepts[0]?.network, "eip155:43113");
  assert.equal(decoded.accepts[0]?.asset, AVALANCHE_X402.asset.address);
  assert.equal(decoded.accepts[0]?.amount, "10000");
  assert.equal(decoded.accepts[0]?.extra.assetTransferMethod, "eip3009");
  assert.equal((decoded.extensions?.["payment-identifier"] as { info: { required: boolean } }).info.required, true);
});

test("merchant payment recovers payer and binds raw body plus resource", async () => {
  const fixture = await signedFixture();
  const valid = await validateAvalancheMerchantPayment({
    header: fixture.header,
    resource,
    bodyHash,
    nowSeconds,
  });
  assert.equal(valid.recoveredSigner, fixture.account.address.toLowerCase());
  assert.equal(valid.paymentIdentifier, "merchant_payment_00000001");
  await assert.rejects(
    validateAvalancheMerchantPayment({
      header: fixture.header,
      resource,
      bodyHash: merchantRequestBodyHash(`${rawBody} `),
      nowSeconds,
    }),
    /request_binding_mismatch/,
  );
  await assert.rejects(
    validateAvalancheMerchantPayment({
      header: fixture.header,
      resource: { ...resource, canonicalUrl: "https://evil.example/api/report" },
      bodyHash,
      nowSeconds,
    }),
    /requirement_mismatch|resource_mismatch/,
  );
  await assert.rejects(
    validateAvalancheMerchantPayment({
      header: fixture.header,
      resource,
      bodyHash,
      nowSeconds: Number(fixture.authorization.validBefore),
    }),
    /authorization_expired/,
  );
});

test("merchant store prevents identifier, signature and nonce replays", async () => {
  const store = new InMemoryAvalancheMerchantPaymentStore();
  const fixture = await signedFixture();
  const valid = await validateAvalancheMerchantPayment({ header: fixture.header, resource, bodyHash, nowSeconds });
  const input = {
    resource,
    paymentIdentifier: valid.paymentIdentifier,
    fingerprint: valid.fingerprint,
    signatureHash: valid.signatureHash,
    authorization: valid.authorization,
    requirement: valid.requirement,
    payload: valid.payload,
  };
  assert.equal((await store.claim(input)).replayed, false);
  assert.equal((await store.claim(input)).replayed, true);
  await assert.rejects(store.claim({ ...input, fingerprint: "different" }), /idempotency_conflict/);
  const secondResource = { ...resource, resourceId: "another-report" };
  await assert.rejects(
    store.claim({ ...input, resource: secondResource, paymentIdentifier: "merchant_payment_00000002" }),
    /signature_replay/,
  );

  const settling = await store.beginSettlement({ merchantId: resource.merchantId, resourceId: resource.resourceId, paymentIdentifier: valid.paymentIdentifier });
  assert.equal(settling.status, "settling");
  await assert.rejects(
    store.beginSettlement({ merchantId: resource.merchantId, resourceId: resource.resourceId, paymentIdentifier: valid.paymentIdentifier }),
    /settlement_in_progress/,
  );
  const settlement: SettleResponse = { success: true, transaction: `0x${"d".repeat(64)}`, network: "eip155:43113", payer: fixture.account.address };
  const settled = await store.settle({ merchantId: resource.merchantId, resourceId: resource.resourceId, paymentIdentifier: valid.paymentIdentifier, settlement });
  assert.equal(settled.status, "settled");
  const firstDelivery = await store.deliver({ merchantId: resource.merchantId, resourceId: resource.resourceId, paymentIdentifier: valid.paymentIdentifier, body: { ok: true }, bodyHash: "delivery-hash" });
  assert.equal(firstDelivery.record.status, "delivered");
  assert.equal((await store.deliver({ merchantId: resource.merchantId, resourceId: resource.resourceId, paymentIdentifier: valid.paymentIdentifier, body: { ok: true }, bodyHash: "delivery-hash" })).replayed, true);
  await assert.rejects(store.deliver({ merchantId: resource.merchantId, resourceId: resource.resourceId, paymentIdentifier: valid.paymentIdentifier, body: { ok: false }, bodyHash: "changed" }), /delivery_conflict/);
});