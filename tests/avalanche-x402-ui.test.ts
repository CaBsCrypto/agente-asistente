import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  AVALANCHE_X402_CLIENT,
  canonicalAvalancheX402Delivery,
  validateAvalancheX402Delivery,
} from "../app/agent/avalanche-x402-client";
import { parseAvalancheChatIntent } from "../app/wallets/avalanche-intents";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const PAYMENT_ID = "avax_x402_fixture_payment";

function deliveryFixture() {
  return {
    deliveryId: `avax_delivery_${"a".repeat(64)}`,
    report: "Carmelita Avalanche agent readiness",
    network: AVALANCHE_X402_CLIENT.network,
    paid: { asset: "USDC", amountAtomic: AVALANCHE_X402_CLIENT.amountAtomic },
    transactionHash: `0x${"1".repeat(64)}`,
    paymentId: PAYMENT_ID,
  };
}

function verified(body: unknown, overrides: Partial<{
  paymentId: string;
  deliveryIdHeader: string | null;
  bodyHashHeader: string | null;
  computedBodyHash: string;
}> = {}) {
  const hash = createHash("sha256")
    .update(canonicalAvalancheX402Delivery(body))
    .digest("hex");
  return validateAvalancheX402Delivery({
    body,
    paymentId: PAYMENT_ID,
    deliveryIdHeader: (body as { deliveryId: string }).deliveryId,
    bodyHashHeader: hash,
    computedBodyHash: hash,
    ...overrides,
  });
}

test("paid-report intent is recognised in the three supported languages", () => {
  for (const message of [
    "buy the avalanche readiness report",
    "quiero comprar el reporte de avalanche",
    "pague o relatorio da avalanche",
    "run the avalanche x402 payment",
  ]) {
    assert.deepEqual(parseAvalancheChatIntent(message), { operation: "x402" }, message);
  }
});

test("paid-report intent never hijacks activation, funding, status or transfer", () => {
  assert.deepEqual(parseAvalancheChatIntent("activa mi wallet de avalanche"), { operation: "activate" });
  assert.deepEqual(parseAvalancheChatIntent("fondea mi wallet fuji"), { operation: "fund" });
  assert.deepEqual(parseAvalancheChatIntent("cual es mi saldo en avalanche"), { operation: "status" });
  assert.deepEqual(
    parseAvalancheChatIntent(`envia 0.001 AVAX a 0x${"a".repeat(40)} en fuji`),
    { operation: "send", amount: "0.001", destination: `0x${"a".repeat(40)}` },
  );
  assert.equal(parseAvalancheChatIntent("buy a stellar report"), null);
});

test("canonical delivery serialization sorts keys like the server", () => {
  assert.equal(
    canonicalAvalancheX402Delivery({ b: 1, a: { d: [2, 3], c: "x" } }),
    '{"a":{"c":"x","d":[2,3]},"b":1}',
  );
});

test("a delivery bound to this payment, amount and network is accepted", () => {
  const body = deliveryFixture();
  const delivery = verified(body);
  assert.equal(delivery.paymentId, PAYMENT_ID);
  assert.equal(delivery.paid.amountAtomic, "10000");
});

test("delivery validation fails closed on every substitution", () => {
  const cases: Array<[string, () => unknown]> = [
    ["another payment", () => verified({ ...deliveryFixture(), paymentId: "avax_x402_other" })],
    ["mainnet network", () => verified({ ...deliveryFixture(), network: "eip155:43114" })],
    ["different amount", () => verified({
      ...deliveryFixture(),
      paid: { asset: "USDC", amountAtomic: "10001" },
    })],
    ["missing settlement hash", () => verified({ ...deliveryFixture(), transactionHash: null })],
    ["delivery id header mismatch", () => verified(deliveryFixture(), {
      deliveryIdHeader: `avax_delivery_${"b".repeat(64)}`,
    })],
    ["body hash header mismatch", () => verified(deliveryFixture(), {
      bodyHashHeader: "0".repeat(64),
    })],
    ["locally recomputed hash mismatch", () => verified(deliveryFixture(), {
      computedBodyHash: "0".repeat(64),
    })],
    ["empty body", () => verified(null)],
  ];

  for (const [label, run] of cases) {
    assert.throws(run, /avalanche_x402_delivery_mismatch/, label);
  }
});

test("the x402 chat card asks for exactly one signature and never broadcasts", () => {
  const component = source("app/agent/avalanche-x402-action.tsx");

  assert.ok(
    component.includes("readStoredSignature"),
    "a stored signature must be reused instead of prompting again",
  );
  assert.ok(
    component.indexOf("storeSignature(current.payment.id, signature)") <
      component.indexOf("encodePreparedAvalancheX402Signature"),
    "the approved signature must be persisted before settlement is attempted",
  );
  assert.ok(
    component.includes("validatePreparedAvalancheX402(body, window.location.origin)"),
    "the prepared intent must be validated against this origin",
  );
  assert.ok(
    component.includes("validateAvalancheX402Delivery"),
    "the delivered report must be independently verified",
  );
  assert.ok(
    !component.includes("eth_sendTransaction"),
    "x402 settles through the facilitator, never by broadcasting from the browser",
  );
  assert.ok(
    !/private[Kk]ey|mnemonic|exportWallet/.test(component),
    "no key material may be touched in the browser",
  );
});

test("the chat routes the x402 action to its own card", () => {
  const chat = source("app/agent/agent-chat.tsx");
  assert.ok(chat.includes('action.walletAction?.type === "avalanche.x402"'));
  assert.ok(
    chat.indexOf('=== "avalanche.x402"') < chat.indexOf("action.walletAction ? ("),
    "the x402 branch must be matched before the generic wallet action",
  );
});
