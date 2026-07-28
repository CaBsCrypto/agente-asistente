import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { AVALANCHE_X402 } from "../app/x402-avalanche/config";
import { validateAvalancheX402Supported } from "../app/x402-avalanche/discovery";
import { buildTransferWithAuthorizationTypedData, freezeAvalancheX402Payment } from "../app/x402-avalanche/payment";
import { bindAvalancheX402Signature, signAvalancheX402WithPrivy } from "../app/x402-avalanche/privy";

const payer = `0x${"a".repeat(40)}`;
const payTo = `0x${"b".repeat(40)}`;
const nonce = `0x${"c".repeat(64)}` as const;
const signature = `0x${"d".repeat(130)}`;
const requirement = { scheme: "exact", network: "eip155:43113", amount: "10000", asset: AVALANCHE_X402.asset.address, payTo, maxTimeoutSeconds: 60, extra: { name: "USD Coin", version: "2" } };
function prepare(overrides: Partial<Parameters<typeof freezeAvalancheX402Payment>[0]> = {}) {
  return freezeAvalancheX402Payment({ requirement, resourceUrl: "https://merchant.example/report", method: "POST", bodyHash: "e".repeat(64), payer, nonce, nowSeconds: 1_800_000_000, ...overrides });
}

test("discovery requires exact Fuji v2 and verified USDC", () => {
  const good = validateAvalancheX402Supported({ kinds: [{ x402Version: 2, scheme: "exact", network: "eip155:43113", extra: { tokens: [{ token: "usdc", address: AVALANCHE_X402.asset.address, decimals: 6 }] } }] });
  assert.equal(good.ready, true);
  assert.equal(validateAvalancheX402Supported({ kinds: [] }).ready, false);
  assert.equal(validateAvalancheX402Supported({ kinds: [{ x402Version: 2, scheme: "exact", network: "eip155:43114", extra: { tokens: [] } }] }).ready, false);
});

test("freezes exact EIP-3009 authorization and stable payment identity", () => {
  const payment = prepare();
  const typed = buildTransferWithAuthorizationTypedData(payment);
  assert.equal(typed.domain.name, "USD Coin");
  assert.equal(typed.domain.version, "2");
  assert.equal(typed.domain.chainId, 43113);
  assert.equal(typed.domain.verifyingContract, AVALANCHE_X402.asset.address);
  assert.equal(typed.primaryType, "TransferWithAuthorization");
  assert.deepEqual(typed.message, { from: payer, to: payTo, value: "10000", validAfter: "1799999995", validBefore: "1800000060", nonce });
  assert.equal(prepare().paymentId, payment.paymentId);
  assert.notEqual(prepare({ bodyHash: "f".repeat(64) }).paymentId, payment.paymentId);
  assert.notEqual(prepare({ nonce: `0x${"1".repeat(64)}` }).paymentId, payment.paymentId);
});

test("wrong network, token metadata, amount and nonce fail closed", () => {
  assert.throws(() => prepare({ requirement: { ...requirement, network: "eip155:43114" } }), /not_fuji_v2_exact/);
  assert.throws(() => prepare({ requirement: { ...requirement, extra: { name: "Fake USD", version: "2" } } }), /token_name_mismatch/);
  assert.throws(() => prepare({ requirement: { ...requirement, amount: "1000001" } }), /above_safety_cap/);
  assert.throws(() => prepare({ nonce: "0x1234" as `0x${string}` }), /invalid_nonce/);
});

test("Privy checks confirmation, Fuji chain and requests typed-data v4", async () => {
  const calls: { method: string; params?: unknown[] }[] = [];
  const provider = { async request(args: { method: string; params?: unknown[] }) { calls.push(args); return args.method === "eth_chainId" ? "0xa869" : signature; } };
  const payment = prepare();
  const result = await signAvalancheX402WithPrivy({ provider, payment, explicitUserConfirmation: true, nowSeconds: 1_800_000_001 });
  assert.equal(result.authorization.paymentId, payment.paymentId);
  assert.deepEqual(calls.map((call) => call.method), ["eth_chainId", "eth_signTypedData_v4"]);
  assert.equal(calls[1]?.params?.[0], payer);
  assert.match(String(calls[1]?.params?.[1]), /TransferWithAuthorization/);
  await assert.rejects(signAvalancheX402WithPrivy({ provider, payment, explicitUserConfirmation: false, nowSeconds: 1_800_000_001 }), /explicit_confirmation_required/);
  await assert.rejects(signAvalancheX402WithPrivy({
    provider,
    payment,
    explicitUserConfirmation: true,
    nowSeconds: Number(payment.validBefore),
  }), /authorization_expired/);
  assert.equal(calls.length, 2);
});

test("one payment binds one signature and replays only that signature", () => {
  const payment = prepare();
  const first = bindAvalancheX402Signature({ payment, existing: null, signature, nowSeconds: 1_800_000_001 });
  assert.deepEqual(bindAvalancheX402Signature({ payment, existing: first, signature, nowSeconds: 1_800_000_002 }), first);
  assert.throws(() => bindAvalancheX402Signature({ payment, existing: first, signature: `0x${"e".repeat(130)}`, nowSeconds: 1_800_000_002 }), /signature_already_bound/);
});

test("preparation layer has no custody or settlement primitive", async () => {
  const source = (await Promise.all(["config.ts", "discovery.ts", "payment.ts", "privy.ts"].map((file) => readFile(new URL(`../app/x402-avalanche/${file}`, import.meta.url), "utf8")))).join("\n");
  assert.doesNotMatch(source, /privateKey|mnemonic|rawSign|exportWallet/);
  assert.doesNotMatch(source, /\/settle|eth_sendTransaction/);
  assert.match(source, /eth_signTypedData_v4/);
});
