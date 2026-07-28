import assert from "node:assert/strict";
import test from "node:test";
import { decodePaymentRequiredHeader, decodePaymentSignatureHeader } from "@x402/core/http";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { getAvalancheX402LiveConfig } from "../app/x402-avalanche/config";
import { createAvalancheX402Facilitator } from "../app/x402-avalanche/facilitator";
import { buildTransferWithAuthorizationTypedData, freezeAvalancheX402Payment } from "../app/x402-avalanche/payment";
import { buildAvalancheX402Requirement, createAvalanchePaymentRequired, encodeAvalanchePaymentSignature, validateAvalanchePaymentSignature } from "../app/x402-avalanche/protocol";

const payTo = `0x${"b".repeat(40)}`;
const resourceUrl = "http://localhost:3001/api/demo/avalanche-report?intent=req_12345678";
const bodyHash = "e".repeat(64);
const nowSeconds = 1_800_000_000;

async function signedFixture() {
  const account = privateKeyToAccount(generatePrivateKey());
  const requirement = buildAvalancheX402Requirement(payTo);
  const payment = freezeAvalancheX402Payment({ requirement, resourceUrl, method: "POST", bodyHash, payer: account.address, nonce: `0x${"c".repeat(64)}`, nowSeconds });
  const signature = await account.signTypedData(buildTransferWithAuthorizationTypedData(payment));
  const header = encodeAvalanchePaymentSignature({ payment, requirement, signature });
  return { account, payment, requirement, signature, header };
}

test("core codecs emit v2 PAYMENT-REQUIRED and PAYMENT-SIGNATURE payloads", async () => {
  const challenge = createAvalanchePaymentRequired({ resourceUrl, payTo });
  const decoded = decodePaymentRequiredHeader(challenge.header);
  assert.equal(decoded.x402Version, 2);
  assert.deepEqual(decoded.accepts, [challenge.requirement]);
  const fixture = await signedFixture();
  const payload = decodePaymentSignatureHeader(fixture.header);
  assert.equal(payload.x402Version, 2);
  assert.equal(payload.accepted.network, "eip155:43113");
  assert.equal((payload.extensions?.carmelita as { paymentId: string }).paymentId, fixture.payment.paymentId);
});

test("cryptographically recovers the exact persisted Privy payer", async () => {
  const fixture = await signedFixture();
  const validated = await validateAvalanchePaymentSignature({ header: fixture.header, payment: fixture.payment, requirement: fixture.requirement, method: "POST", resourceUrl, bodyHash, nowSeconds: nowSeconds + 1 });
  assert.equal(validated.recoveredSigner, fixture.account.address.toLowerCase());
  assert.equal(validated.signature, fixture.header);
});

test("request and requirement mutations fail closed", async () => {
  const fixture = await signedFixture();
  await assert.rejects(validateAvalanchePaymentSignature({ header: fixture.header, payment: fixture.payment, requirement: fixture.requirement, method: "GET", resourceUrl, bodyHash, nowSeconds: nowSeconds + 1 }), /request_binding_mismatch/);
  await assert.rejects(validateAvalanchePaymentSignature({ header: fixture.header, payment: fixture.payment, requirement: fixture.requirement, method: "POST", resourceUrl, bodyHash: "f".repeat(64), nowSeconds: nowSeconds + 1 }), /request_binding_mismatch/);
  await assert.rejects(validateAvalanchePaymentSignature({ header: fixture.header, payment: fixture.payment, requirement: { ...fixture.requirement, amount: "10001" }, method: "POST", resourceUrl, bodyHash, nowSeconds: nowSeconds + 1 }), /requirement_mismatch/);
  await assert.rejects(validateAvalanchePaymentSignature({ header: fixture.header, payment: fixture.payment, requirement: fixture.requirement, method: "POST", resourceUrl, bodyHash, nowSeconds: Number(fixture.payment.validBefore) }), /authorization_expired/);
});

test("signature from another wallet is rejected", async () => {
  const fixture = await signedFixture();
  const attacker = privateKeyToAccount(generatePrivateKey());
  const attackerSignature = await attacker.signTypedData(buildTransferWithAuthorizationTypedData(fixture.payment));
  const header = encodeAvalanchePaymentSignature({ payment: fixture.payment, requirement: fixture.requirement, signature: attackerSignature });
  await assert.rejects(validateAvalanchePaymentSignature({ header, payment: fixture.payment, requirement: fixture.requirement, method: "POST", resourceUrl, bodyHash, nowSeconds: nowSeconds + 1 }), /invalid_signer/);
});

test("live configuration requires non-zero payTo plus explicit localhost Fuji flags", () => {
  assert.equal(getAvalancheX402LiveConfig({}).enabled, false);
  assert.equal(getAvalancheX402LiveConfig({ AVALANCHE_X402_LIVE_ENABLED: "true", AVALANCHE_X402_ENVIRONMENT: "localhost-fuji", AVALANCHE_X402_PAY_TO: `0x${"0".repeat(40)}` }).enabled, false);
  const ready = getAvalancheX402LiveConfig({ AVALANCHE_X402_LIVE_ENABLED: "true", AVALANCHE_X402_ENVIRONMENT: "localhost-fuji", AVALANCHE_X402_PAY_TO: payTo });
  assert.equal(ready.enabled, true);
  assert.equal(ready.payTo, payTo);
});

test("facilitator is injectable and never contacts remote services in tests", async () => {
  const calls: string[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    calls.push(`${String(input)}:${String(init?.method)}`);
    return Response.json({ isValid: true, payer: `0x${"a".repeat(40)}` });
  };
  const fixture = await signedFixture();
  const payload = decodePaymentSignatureHeader(fixture.header);
  const facilitator = createAvalancheX402Facilitator(fetcher);
  assert.equal((await facilitator.verify(payload, fixture.requirement)).isValid, true);
  assert.deepEqual(calls, ["https://facilitator.ultravioletadao.xyz/verify:POST"]);
});
