import assert from "node:assert/strict";
import test from "node:test";
import type { PaymentPayload, PaymentRequirements } from "@x402/core/types";
import {
  AvalancheX402FacilitatorHttpError,
  buildGaslessEnvelope,
  createAvalancheX402Facilitator,
} from "../app/x402-avalanche/facilitator";

const requirement: PaymentRequirements = {
  scheme: "exact",
  network: "eip155:43113",
  asset: "0x5425890298aed601595a70AB815c96711a31Bc65",
  amount: "10000",
  payTo: `0x${"b".repeat(40)}`,
  maxTimeoutSeconds: 60,
  extra: { name: "USD Coin", version: "2" },
};
const resource = {
  url: "http://localhost:3001/api/demo/avalanche-report",
  description: "Carmelita Avalanche Fuji deterministic report",
  mimeType: "application/json",
};
const payload: PaymentPayload = {
  x402Version: 2,
  resource,
  accepted: requirement,
  payload: {
    signature: `0x${"a".repeat(130)}`,
    authorization: {
      from: `0x${"c".repeat(40)}`,
      to: requirement.payTo,
      value: requirement.amount,
      validAfter: "1800000000",
      validBefore: "1800000060",
      nonce: `0x${"d".repeat(64)}`,
    },
  },
};

test("0xGasless envelope maps canonical v2 data without leaking Carmelita extensions", () => {
  const envelope = buildGaslessEnvelope(payload, requirement);
  assert.deepEqual(Object.keys(envelope).sort(), [
    "paymentPayload",
    "paymentRequirements",
  ]);
  assert.deepEqual(envelope.paymentRequirements, { chainId: 43113 });
  assert.equal(envelope.paymentPayload.token, requirement.asset);
  assert.equal(envelope.paymentPayload.payload.signature, `0x${"a".repeat(130)}`);
  assert.equal(envelope.paymentPayload.payload.authorization.validAfter, 1800000000);
  assert.equal(envelope.paymentPayload.payload.authorization.validBefore, 1800000060);
  assert.equal("resource" in envelope, false);
  assert.equal("accepted" in envelope, false);
  assert.equal("extensions" in envelope.paymentPayload, false);
});

test("0xGasless adapter fails closed on legacy, missing-resource, or mismatched input", () => {
  assert.throws(
    () => buildGaslessEnvelope({ ...payload, x402Version: 1 }, requirement),
    /facilitator_requires_v2/,
  );
  assert.throws(
    () => buildGaslessEnvelope({ ...payload, resource: undefined }, requirement),
    /facilitator_resource_required/,
  );
  assert.throws(
    () => buildGaslessEnvelope(payload, { ...requirement, amount: "10001" }),
    /facilitator_requirement_mismatch/,
  );
});

test("facilitator sends the exact 0xGasless wire shape to both endpoints", async () => {
  const bodies: Record<string, unknown>[] = [];
  const fetcher: typeof fetch = async (_input, init) => {
    bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    return Response.json({ isValid: true, success: true });
  };
  const facilitator = createAvalancheX402Facilitator(fetcher);
  await facilitator.verify(payload, requirement);
  await facilitator.settle(payload, requirement);
  assert.equal(bodies.length, 2);
  for (const body of bodies) {
    assert.deepEqual(Object.keys(body).sort(), [
      "paymentPayload",
      "paymentRequirements",
    ]);
    assert.deepEqual(body.paymentRequirements, { chainId: 43113 });
  }
});

test("facilitator normalizes the Fuji slug to the persisted CAIP-2 network", async () => {
  const facilitator = createAvalancheX402Facilitator(async () =>
    Response.json({
      success: true,
      transaction: `0x${"f".repeat(64)}`,
      network: "avalanche-fuji",
      payer: `0x${"c".repeat(40)}`,
    }));
  const settlement = await facilitator.settle(payload, requirement);
  assert.equal(settlement.network, "eip155:43113");
});

test("facilitator errors retain only allowlisted diagnostic tokens", async () => {
  const safe = createAvalancheX402Facilitator(async () =>
    Response.json({ invalidReason: "contract_call_failed" }, { status: 400 }));
  await assert.rejects(safe.verify(payload, requirement), (error: unknown) => {
    assert.ok(error instanceof AvalancheX402FacilitatorHttpError);
    assert.equal(error.message, "avalanche_x402_facilitator_http_400");
    assert.equal(error.reason, "contract_call_failed");
    return true;
  });

  const nested = createAvalancheX402Facilitator(async () =>
    Response.json({ error: { message: "Contract call failed while checking authorization" } }, { status: 400 }));
  await assert.rejects(nested.verify(payload, requirement), (error: unknown) => {
    assert.ok(error instanceof AvalancheX402FacilitatorHttpError);
    assert.equal(error.reason, "contract_call_failed");
    return true;
  });

  const secretLike = `0x${"f".repeat(130)}`;
  const unsafe = createAvalancheX402Facilitator(async () =>
    Response.json({ error: `bad signature ${secretLike}` }, { status: 400 }));
  await assert.rejects(unsafe.verify(payload, requirement), (error: unknown) => {
    assert.ok(error instanceof AvalancheX402FacilitatorHttpError);
    assert.equal(error.message, "avalanche_x402_facilitator_http_400");
    assert.equal(error.reason, null);
    assert.equal(error.message.includes(secretLike), false);
    return true;
  });
});
