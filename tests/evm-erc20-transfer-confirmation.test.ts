import assert from "node:assert/strict";
import test from "node:test";
import { confirmEvmErc20Transfer } from "../app/wallets/evm-rpc";
import { getWalletNetwork } from "../app/wallets/networks";

const FUJI = getWalletNetwork("avalanche:fuji");
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

const TOKEN = "0x5425890298aed601595a70AB815c96711a31Bc65";
const PAYER = `0x${"d".repeat(40)}`;
const PAY_TO = `0x${"b".repeat(40)}`;
const RELAYER = `0x${"9".repeat(40)}`;
const HASH = `0x${"f".repeat(64)}`;

const EXPECTED = { token: TOKEN, from: PAYER, to: PAY_TO, amountAtomic: "10000" };

function topic(address: string) {
  return `0x${address.slice(2).toLowerCase().padStart(64, "0")}`;
}

function transferLog(overrides: Record<string, unknown> = {}) {
  return {
    address: TOKEN,
    topics: [TRANSFER_TOPIC, topic(PAYER), topic(PAY_TO)],
    data: `0x${(10000).toString(16).padStart(64, "0")}`,
    ...overrides,
  };
}

/** Answers eth_chainId with Fuji and eth_getTransactionReceipt with `receipt`. */
function rpc(receipt: unknown, chainId = "0xa869") {
  const fetcher: typeof fetch = async (_input, init) => {
    const request = JSON.parse(String(init?.body));
    const result = request.method === "eth_chainId" ? chainId : receipt;
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), {
      headers: { "Content-Type": "application/json" },
    });
  };
  return fetcher;
}

test("confirms a gas-sponsored transfer whose sender is a relayer, not the payer", async () => {
  // The whole point: `from` on the transaction is the facilitator's relayer and
  // the payer holds zero AVAX. Only the Transfer log proves who actually paid.
  const receipt = {
    status: "0x1",
    blockNumber: "0x36d6a67",
    from: RELAYER,
    to: TOKEN,
    logs: [transferLog()],
  };

  const result = await confirmEvmErc20Transfer(FUJI, HASH, EXPECTED, rpc(receipt));

  assert.equal(result.kind, "confirmed");
  assert.equal(result.kind === "confirmed" ? result.blockNumber : null, 57502311);
});

test("treats an absent receipt as undecided rather than failed", async () => {
  const result = await confirmEvmErc20Transfer(FUJI, HASH, EXPECTED, rpc(null));
  assert.equal(result.kind, "pending");
});

test("treats a mined-but-unblocked receipt as undecided", async () => {
  const receipt = { status: "0x1", blockNumber: null, logs: [transferLog()] };
  const result = await confirmEvmErc20Transfer(FUJI, HASH, EXPECTED, rpc(receipt));
  assert.equal(result.kind, "pending");
});

test("reports a reverted transaction", async () => {
  const receipt = { status: "0x0", blockNumber: "0x36d6a67", logs: [] };
  const result = await confirmEvmErc20Transfer(FUJI, HASH, EXPECTED, rpc(receipt));
  assert.equal(result.kind, "reverted");
});

test("a successful receipt carrying no Transfer log is a mismatch, not a confirmation", async () => {
  const receipt = { status: "0x1", blockNumber: "0x36d6a67", logs: [] };
  const result = await confirmEvmErc20Transfer(FUJI, HASH, EXPECTED, rpc(receipt));
  assert.equal(result.kind, "mismatch");
});

test("rejects a transfer of the right amount to the wrong recipient", async () => {
  const receipt = {
    status: "0x1",
    blockNumber: "0x36d6a67",
    logs: [transferLog({ topics: [TRANSFER_TOPIC, topic(PAYER), topic(RELAYER)] })],
  };
  const result = await confirmEvmErc20Transfer(FUJI, HASH, EXPECTED, rpc(receipt));
  assert.equal(result.kind, "mismatch");
});

test("rejects a transfer from a payer who is not the one who signed", async () => {
  const receipt = {
    status: "0x1",
    blockNumber: "0x36d6a67",
    logs: [transferLog({ topics: [TRANSFER_TOPIC, topic(RELAYER), topic(PAY_TO)] })],
  };
  const result = await confirmEvmErc20Transfer(FUJI, HASH, EXPECTED, rpc(receipt));
  assert.equal(result.kind, "mismatch");
});

test("rejects a short payment, even by one atomic unit", async () => {
  const receipt = {
    status: "0x1",
    blockNumber: "0x36d6a67",
    logs: [transferLog({ data: `0x${(9999).toString(16).padStart(64, "0")}` })],
  };
  const result = await confirmEvmErc20Transfer(FUJI, HASH, EXPECTED, rpc(receipt));
  assert.equal(result.kind, "mismatch");
});

test("rejects a correct-looking Transfer emitted by a different token contract", async () => {
  const receipt = {
    status: "0x1",
    blockNumber: "0x36d6a67",
    logs: [transferLog({ address: `0x${"c".repeat(40)}` })],
  };
  const result = await confirmEvmErc20Transfer(FUJI, HASH, EXPECTED, rpc(receipt));
  assert.equal(result.kind, "mismatch");
});

test("finds the matching Transfer among unrelated logs in the same receipt", async () => {
  const receipt = {
    status: "0x1",
    blockNumber: "0x36d6a67",
    logs: [
      { address: `0x${"c".repeat(40)}`, topics: [`0x${"1".repeat(64)}`], data: "0x" },
      transferLog(),
      { address: TOKEN, topics: [`0x${"2".repeat(64)}`], data: "0x" },
    ],
  };
  const result = await confirmEvmErc20Transfer(FUJI, HASH, EXPECTED, rpc(receipt));
  assert.equal(result.kind, "confirmed");
});

test("refuses to read a chain that is not Fuji", async () => {
  const receipt = { status: "0x1", blockNumber: "0x36d6a67", logs: [transferLog()] };
  await assert.rejects(
    confirmEvmErc20Transfer(FUJI, HASH, EXPECTED, rpc(receipt, "0x1")),
    /evm_chain_id_mismatch/,
  );
});

test("rejects malformed inputs before making any RPC call", async () => {
  let called = false;
  const fetcher: typeof fetch = async () => {
    called = true;
    return new Response("{}");
  };

  await assert.rejects(
    confirmEvmErc20Transfer(FUJI, "0xnothex", EXPECTED, fetcher),
    /invalid_evm_transaction_hash/,
  );
  await assert.rejects(
    confirmEvmErc20Transfer(FUJI, HASH, { ...EXPECTED, to: "0x1" }, fetcher),
    /invalid_evm_address/,
  );
  await assert.rejects(
    confirmEvmErc20Transfer(FUJI, HASH, { ...EXPECTED, amountAtomic: "1.5" }, fetcher),
    /invalid_erc20_amount/,
  );
  assert.equal(called, false);
});
