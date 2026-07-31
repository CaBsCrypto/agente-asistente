import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { PaymentPayload, PaymentRequirements, SettleResponse, VerifyResponse } from "@x402/core/types";
import {
  type AvalancheX402Facilitator,
  createAvalancheX402Facilitator,
} from "../app/x402-avalanche/facilitator";
import type { FrozenAvalancheX402Payment } from "../app/x402-avalanche/payment";
import type { EvmErc20TransferConfirmation } from "../app/wallets/evm-rpc";
import {
  type AvalancheX402ChainVerifier,
  executeAvalancheX402Settlement,
} from "../app/x402-avalanche/settlement";
import {
  bindAvalancheX402Signature,
  prepareAvalancheX402Payment,
} from "../app/x402-avalanche/store";

type Row = Record<string, unknown>;

class MemorySql {
  payments = new Map<string, Row>();
  byKey = new Map<string, string>();
  conflictOnRecord = false;

  async query<T = Row>(query: string, params: unknown[] = []) {
    const compact = query.replace(/\s+/g, " ").trim();
    if (compact.startsWith("CREATE ") || compact.startsWith("CREATE INDEX")) {
      return { rows: [] as T[] };
    }
    if (compact.startsWith("INSERT INTO agent_avalanche_x402_payments")) {
      const key = String(params[2]);
      if (this.byKey.has(key)) return { rows: [] as T[] };
      const now = new Date().toISOString();
      const row: Row = {
        id: params[0], user_id: params[1], idempotency_key: key,
        wallet_id: params[3], wallet_address: params[4], resource_url: params[5],
        resource_method: params[6], request_body_hash: params[7], network: params[8],
        asset_contract: params[9], pay_to: params[10], amount_atomic: params[11],
        requirement: JSON.parse(String(params[12])), frozen_payment: JSON.parse(String(params[13])),
        signature_header: null, signature_hash: null, status: "prepared",
        settlement: null, transaction_hash: null, error: null, expires_at: params[14],
        settlement_claimed_at: null, created_at: now, updated_at: now,
      };
      this.payments.set(String(params[0]), row);
      this.byKey.set(key, String(params[0]));
      return { rows: [row] as T[] };
    }
    if (compact.includes("WHERE idempotency_key = $1")) {
      const id = this.byKey.get(String(params[0]));
      return { rows: (id ? [this.payments.get(id)!] : []) as T[] };
    }
    if (compact.startsWith("SELECT * FROM agent_avalanche_x402_payments")) {
      const row = this.payments.get(String(params[0]));
      return { rows: (row && row.user_id === params[1] ? [row] : []) as T[] };
    }
    if (compact.includes("SET signature_header=$1")) {
      const row = this.payments.get(String(params[2]));
      if (!row || row.user_id !== params[3] || row.status !== "prepared" || row.signature_hash) {
        return { rows: [] as T[] };
      }
      Object.assign(row, { signature_header: params[0], signature_hash: params[1], status: "signed" });
      return { rows: [row] as T[] };
    }
    if (compact.includes("SET status='settling'")) {
      const row = this.payments.get(String(params[0]));
      if (!row || row.user_id !== params[1] || row.status !== "signed") return { rows: [] as T[] };
      Object.assign(row, { status: "settling", settlement_claimed_at: new Date().toISOString() });
      return { rows: [row] as T[] };
    }
    if (compact.includes("SET status='settled'")) {
      const row = this.payments.get(String(params[2]));
      if (this.conflictOnRecord || !row || row.user_id !== params[3] || row.status !== "settling") {
        return { rows: [] as T[] };
      }
      Object.assign(row, { status: "settled", settlement: JSON.parse(String(params[0])), transaction_hash: params[1] });
      return { rows: [row] as T[] };
    }
    if (compact.includes("SET status=$1, error=$2")) {
      const row = this.payments.get(String(params[2]));
      if (row && row.user_id === params[3] && ["prepared", "signed", "settling"].includes(String(row.status))) {
        Object.assign(row, { status: params[0], error: params[1] });
        return { rows: [row] as T[] };
      }
      return { rows: [] as T[] };
    }
    throw new Error(`unexpected_sql:${compact}`);
  }
}

const USER_ID = "user-1";
const TRANSACTION = `0x${"f".repeat(64)}`;
const requirement: PaymentRequirements = {
  scheme: "exact",
  network: "eip155:43113",
  asset: `0x${"a".repeat(40)}`,
  amount: "10000",
  payTo: `0x${"b".repeat(40)}`,
  maxTimeoutSeconds: 60,
  extra: { name: "USD Coin", version: "2" },
};
const payment: FrozenAvalancheX402Payment = {
  paymentId: "avax_x402_settle_outcomes",
  x402Version: 2,
  scheme: "exact",
  network: "eip155:43113",
  resource: { url: "http://localhost:3001/api/demo/avalanche-report", method: "POST", bodyHash: "c".repeat(64) },
  payer: `0x${"d".repeat(40)}`,
  payTo: requirement.payTo,
  asset: requirement.asset,
  amount: requirement.amount,
  validAfter: "1800000000",
  validBefore: "1800000060",
  nonce: `0x${"e".repeat(64)}`,
  status: "prepared",
  signature: null,
};
const payload: PaymentPayload = {
  x402Version: 2,
  resource: {
    url: payment.resource.url,
    description: "Carmelita Avalanche Fuji deterministic report",
    mimeType: "application/json",
  },
  accepted: requirement,
  payload: {
    signature: `0x${"a".repeat(130)}`,
    authorization: {
      from: payment.payer,
      to: payment.payTo,
      value: payment.amount,
      validAfter: payment.validAfter,
      validBefore: payment.validBefore,
      nonce: payment.nonce,
    },
  },
};

async function signedPayment(sql: MemorySql) {
  await prepareAvalancheX402Payment({
    userId: USER_ID,
    idempotencyKey: "request-1",
    walletId: "wallet-1",
    payment,
    requirement,
  }, sql);
  await bindAvalancheX402Signature({
    userId: USER_ID,
    paymentId: payment.paymentId,
    signatureHeader: "payment-signature-one",
  }, sql);
  return sql.payments.get(payment.paymentId)!;
}

function settledPayload(overrides: Record<string, unknown> = {}): SettleResponse {
  return {
    success: true,
    transaction: TRANSACTION,
    network: "eip155:43113",
    payer: payment.payer,
    ...overrides,
  };
}

function stubFacilitator(handlers: {
  verify?: () => Promise<VerifyResponse>;
  settle?: () => Promise<SettleResponse>;
} = {}) {
  const calls = { verify: 0, settle: 0 };
  const facilitator: AvalancheX402Facilitator = {
    verify: async () => {
      calls.verify += 1;
      return handlers.verify ? handlers.verify() : { isValid: true };
    },
    settle: async () => {
      calls.settle += 1;
      return handlers.settle ? handlers.settle() : settledPayload();
    },
  };
  return { calls, facilitator };
}

function httpFacilitator(respond: (endpoint: string) => Promise<Response>) {
  const calls: string[] = [];
  const fetcher: typeof fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    return respond(url.slice(url.lastIndexOf("/") + 1));
  };
  return { calls, facilitator: createAvalancheX402Facilitator(fetcher) };
}

type ChainExpectation = { token: string; from: string; to: string; amountAtomic: string };

/**
 * Stands in for the Fuji RPC. Every settlement test runs against this so the
 * suite never touches the network, and so the on-chain gate is exercised
 * explicitly rather than skipped by default.
 */
function stubChain(
  results: EvmErc20TransferConfirmation[] = [{ kind: "confirmed", blockNumber: 57475367 }],
) {
  const seen: ChainExpectation[] = [];
  const waits: number[] = [];
  let call = 0;
  const chain: AvalancheX402ChainVerifier = {
    confirm: async (_transactionHash, expected) => {
      seen.push(expected);
      const result = results[Math.min(call, results.length - 1)];
      call += 1;
      return result;
    },
    attempts: results.length > 1 ? results.length : 3,
    delayMs: 0,
    wait: async (ms) => { waits.push(ms); },
  };
  return { chain, seen, waits, calls: () => call };
}

function execute(
  sql: MemorySql,
  facilitator: AvalancheX402Facilitator,
  chain: AvalancheX402ChainVerifier = stubChain().chain,
) {
  return executeAvalancheX402Settlement(
    { userId: USER_ID, paymentId: payment.paymentId, payload, requirement },
    { facilitator, sql, chain },
  );
}

test("a valid settle is recorded with evidence bound to the persisted payment", async () => {
  const sql = new MemorySql();
  await signedPayment(sql);
  const { calls, facilitator } = stubFacilitator();

  const outcome = await execute(sql, facilitator);

  assert.equal(outcome.kind, "settled");
  assert.equal(outcome.payment.status, "settled");
  assert.equal(outcome.payment.transaction_hash, TRANSACTION);
  assert.equal(outcome.payment.error, null);
  assert.equal((outcome.payment.settlement as SettleResponse).transaction, TRANSACTION);
  assert.deepEqual(calls, { verify: 1, settle: 1 });
});

test("an invalid verification fails terminally, maps to a fresh 402 challenge and never settles", async () => {
  const sql = new MemorySql();
  await signedPayment(sql);
  const { calls, facilitator } = stubFacilitator({
    verify: async () => ({ isValid: false, invalidReason: "avalanche_x402_bad_signature" }),
  });

  const outcome = await execute(sql, facilitator);

  assert.equal(outcome.kind, "verification_failed");
  assert.equal(outcome.payment.status, "failed");
  assert.equal(outcome.payment.error, "avalanche_x402_bad_signature");
  assert.equal(calls.settle, 0, "settle must not be called after a failed verification");
  const row = sql.payments.get(payment.paymentId)!;
  assert.equal(row.status, "failed");
  assert.equal(row.transaction_hash, null);
});

test("a settle response with success:false is terminally failed with the facilitator reason", async () => {
  const sql = new MemorySql();
  await signedPayment(sql);
  const { facilitator } = stubFacilitator({
    settle: async () => ({
      success: false,
      errorReason: "insufficient_usdc_allowance",
      transaction: "",
      network: "eip155:43113",
    }),
  });

  await assert.rejects(execute(sql, facilitator), /insufficient_usdc_allowance/);
  const row = sql.payments.get(payment.paymentId)!;
  assert.equal(row.status, "failed");
  assert.equal(row.error, "insufficient_usdc_allowance");
  assert.equal(row.transaction_hash, null);
});

test("a reverted settle response is terminally reverted", async () => {
  const sql = new MemorySql();
  await signedPayment(sql);
  const { facilitator } = stubFacilitator({
    settle: async () => ({
      success: false,
      errorReason: "execution reverted: transfer failed",
      transaction: "",
      network: "eip155:43113",
    }),
  });

  await assert.rejects(execute(sql, facilitator), /execution reverted/);
  const row = sql.payments.get(payment.paymentId)!;
  assert.equal(row.status, "reverted");
  assert.equal(row.error, "execution reverted: transfer failed");
  assert.equal(row.transaction_hash, null);
});

test("facilitator settle 4xx rejections are definitive terminal failures", async () => {
  for (const status of [400, 402, 422]) {
    const sql = new MemorySql();
    await signedPayment(sql);
    const { calls, facilitator } = httpFacilitator(async (endpoint) =>
      endpoint === "verify"
        ? Response.json({ isValid: true })
        : Response.json({ success: false, errorReason: "rejected" }, { status }));

    await assert.rejects(execute(sql, facilitator), new RegExp(`facilitator_http_${status}`));
    const row = sql.payments.get(payment.paymentId)!;
    assert.equal(row.status, "failed", `HTTP ${status}`);
    assert.equal(row.error, `avalanche_x402_facilitator_http_${status}`);
    assert.equal(row.transaction_hash, null);
    assert.deepEqual(calls, [
      "https://x402.0xgasless.com/verify",
      "https://x402.0xgasless.com/settle",
    ]);
  }
});

test("facilitator settle 5xx quarantines the payment and a retry never auto-settles", async () => {
  const sql = new MemorySql();
  await signedPayment(sql);
  const { facilitator } = httpFacilitator(async (endpoint) =>
    endpoint === "verify"
      ? Response.json({ isValid: true })
      : Response.json({ error: "boom" }, { status: 500 }));

  await assert.rejects(execute(sql, facilitator), /settle_ambiguous:avalanche_x402_facilitator_http_500/);
  const row = sql.payments.get(payment.paymentId)!;
  assert.equal(row.status, "reconciliation_required");
  assert.equal(row.error, "avalanche_x402_settle_ambiguous:avalanche_x402_facilitator_http_500");
  assert.equal(row.transaction_hash, null);

  const retry = stubFacilitator();
  await assert.rejects(execute(sql, retry.facilitator), /settlement_not_allowed:reconciliation_required/);
  assert.equal(retry.calls.settle, 0, "a parked payment must never be settled again automatically");
});

test("a network failure during settle quarantines the payment", async () => {
  const sql = new MemorySql();
  await signedPayment(sql);
  const { facilitator } = httpFacilitator(async (endpoint) => {
    if (endpoint === "verify") return Response.json({ isValid: true });
    throw new TypeError("fetch failed");
  });

  await assert.rejects(execute(sql, facilitator), /settle_ambiguous:fetch failed/);
  const row = sql.payments.get(payment.paymentId)!;
  assert.equal(row.status, "reconciliation_required");
  assert.equal(row.transaction_hash, null);
});

test("a settle abort quarantines the payment for reconciliation", async () => {
  const sql = new MemorySql();
  await signedPayment(sql);
  const { facilitator } = httpFacilitator(async (endpoint) => {
    if (endpoint === "verify") return Response.json({ isValid: true });
    throw new DOMException("The operation was aborted.", "AbortError");
  });

  await assert.rejects(execute(sql, facilitator), /settle_ambiguous:avalanche_x402_settle_ambiguous/);
  const row = sql.payments.get(payment.paymentId)!;
  assert.equal(row.status, "reconciliation_required");
  assert.equal(row.transaction_hash, null);
});

test("a record conflict after a successful settle quarantines instead of wedging", async () => {
  const sql = new MemorySql();
  await signedPayment(sql);
  sql.conflictOnRecord = true;
  const { calls, facilitator } = stubFacilitator();

  await assert.rejects(execute(sql, facilitator), /settle_ambiguous:avalanche_x402_settlement_state_conflict/);
  assert.equal(calls.settle, 1, "the facilitator did settle; the conflict is local");
  const row = sql.payments.get(payment.paymentId)!;
  assert.equal(row.status, "reconciliation_required");
  assert.equal(row.transaction_hash, null, "conflicting evidence must not be recorded");
});

test("a settle payload from another network is quarantined, not recorded", async () => {
  const sql = new MemorySql();
  await signedPayment(sql);
  const { facilitator } = stubFacilitator({
    settle: async () => settledPayload({ network: "eip155:43114" }),
  });

  await assert.rejects(execute(sql, facilitator), /settle_ambiguous:settlement_network_mismatch/);
  const row = sql.payments.get(payment.paymentId)!;
  assert.equal(row.status, "reconciliation_required");
  assert.equal(row.transaction_hash, null);
});

test("a settle payload from another payer is quarantined, not recorded", async () => {
  const sql = new MemorySql();
  await signedPayment(sql);
  const { facilitator } = stubFacilitator({
    settle: async () => settledPayload({ payer: `0x${"9".repeat(40)}` }),
  });

  await assert.rejects(execute(sql, facilitator), /settle_ambiguous:settlement_payer_mismatch/);
  const row = sql.payments.get(payment.paymentId)!;
  assert.equal(row.status, "reconciliation_required");
  assert.equal(row.transaction_hash, null);
});

test("a success payload without a usable transaction is quarantined as malformed", async () => {
  for (const transaction of ["", "not-a-transaction"]) {
    const sql = new MemorySql();
    await signedPayment(sql);
    const { facilitator } = stubFacilitator({
      settle: async () => settledPayload({ transaction }),
    });

    await assert.rejects(execute(sql, facilitator), /settle_ambiguous:settlement_payload_malformed/);
    const row = sql.payments.get(payment.paymentId)!;
    assert.equal(row.status, "reconciliation_required", `transaction=${JSON.stringify(transaction)}`);
    assert.equal(row.transaction_hash, null);
  }
});

test("a success payload that omits network and payer still settles", async () => {
  const sql = new MemorySql();
  await signedPayment(sql);
  const { facilitator } = stubFacilitator({
    settle: async () => ({ success: true, transaction: TRANSACTION }) as SettleResponse,
  });

  const outcome = await execute(sql, facilitator);

  assert.equal(outcome.kind, "settled");
  assert.equal(outcome.payment.status, "settled");
  assert.equal(outcome.payment.transaction_hash, TRANSACTION);
});

test("the route truthfully maps each settle outcome to the client", () => {
  const route = readFileSync(
    new URL("../app/api/demo/avalanche-report/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(route, /executeAvalancheX402Settlement\(/);
  assert.match(route, /outcome\.kind === "verification_failed"\) return challenge\(/);
  assert.match(route, /message\.includes\("reconciliation_required"\) \? 409/);
  assert.match(route, /message\.includes\("ambiguous"\) \? 503/);
  assert.match(route, /status:\s*"reconciliation_required"/);
});

test("the on-chain gate is asked about the exact frozen payment, not the facilitator's claim", async () => {
  const sql = new MemorySql();
  await signedPayment(sql);
  const { facilitator } = stubFacilitator();
  const { chain, seen } = stubChain();

  const outcome = await execute(sql, facilitator, chain);

  assert.equal(outcome.kind, "settled");
  assert.deepEqual(seen, [{
    token: payment.asset,
    from: payment.payer,
    to: payment.payTo,
    amountAtomic: payment.amount,
  }]);
});

test("a facilitator success the chain never confirms is quarantined, not delivered", async () => {
  const sql = new MemorySql();
  await signedPayment(sql);
  const { facilitator } = stubFacilitator();
  const { chain, calls } = stubChain([{ kind: "pending" }]);

  await assert.rejects(
    execute(sql, facilitator, chain),
    /avalanche_x402_settle_ambiguous:settlement_unconfirmed_on_chain/,
  );

  const row = sql.payments.get(payment.paymentId)!;
  assert.equal(row.status, "reconciliation_required");
  assert.equal(row.transaction_hash, null);
  assert.equal(calls(), 3, "exhausts its attempts before giving up");
});

test("a receipt whose Transfer log does not match the frozen payment is quarantined", async () => {
  const sql = new MemorySql();
  await signedPayment(sql);
  const { facilitator } = stubFacilitator();
  const { chain } = stubChain([
    { kind: "mismatch", reason: "erc20_transfer_log_absent", blockNumber: 57475367 },
  ]);

  await assert.rejects(
    execute(sql, facilitator, chain),
    /avalanche_x402_settle_ambiguous:erc20_transfer_log_absent/,
  );

  const row = sql.payments.get(payment.paymentId)!;
  assert.equal(row.status, "reconciliation_required");
  assert.equal(row.transaction_hash, null);
});

test("a reverted transaction is recorded as reverted even when the facilitator reported success", async () => {
  const sql = new MemorySql();
  await signedPayment(sql);
  const { facilitator } = stubFacilitator();
  const { chain } = stubChain([{ kind: "reverted", blockNumber: 57475367 }]);

  await assert.rejects(
    execute(sql, facilitator, chain),
    /avalanche_x402_settlement_reverted_on_chain/,
  );

  const row = sql.payments.get(payment.paymentId)!;
  assert.equal(row.status, "reverted");
  assert.equal(row.transaction_hash, null);
});

test("a transfer that is pending and then confirms is settled without a second facilitator call", async () => {
  const sql = new MemorySql();
  await signedPayment(sql);
  const { calls, facilitator } = stubFacilitator();
  const { chain, waits } = stubChain([
    { kind: "pending" },
    { kind: "pending" },
    { kind: "confirmed", blockNumber: 57475367 },
  ]);

  const outcome = await execute(sql, facilitator, chain);

  assert.equal(outcome.kind, "settled");
  assert.equal(outcome.payment.transaction_hash, TRANSACTION);
  assert.deepEqual(calls, { verify: 1, settle: 1 }, "polling never re-settles");
  assert.equal(waits.length, 2, "waits between polls, not before the first read");
});

test("an unreachable RPC is quarantined rather than treated as a successful delivery", async () => {
  const sql = new MemorySql();
  await signedPayment(sql);
  const { facilitator } = stubFacilitator();
  const chain: AvalancheX402ChainVerifier = {
    confirm: async () => { throw new Error("evm_rpc_http_502"); },
    attempts: 3,
    delayMs: 0,
    wait: async () => {},
  };

  await assert.rejects(
    execute(sql, facilitator, chain),
    /avalanche_x402_settle_ambiguous:evm_rpc_http_502/,
  );

  assert.equal(sql.payments.get(payment.paymentId)!.status, "reconciliation_required");
});

test("settlement.ts actually reads the chain instead of trusting a well-formed hash", () => {
  const source = readFileSync(
    new URL("../app/x402-avalanche/settlement.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /confirmEvmErc20Transfer/);
  assert.match(source, /confirmSettlementOnChain\(payment, settlement\.transaction/);
  const gate = source.indexOf("confirmSettlementOnChain(payment");
  const record = source.indexOf("recordAvalancheX402Settlement({");
  assert.ok(gate > 0 && record > gate, "the chain is consulted before anything is recorded");
});
