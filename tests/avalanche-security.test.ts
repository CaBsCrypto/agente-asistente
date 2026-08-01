import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  getEvmTransactionEvidence,
  prepareEvmContractCall,
  verifyEvmContractCall,
} from "../app/wallets/evm-rpc";

const fujiNetwork = {
  id: "avalanche:fuji" as const,
  family: "evm" as const,
  name: "Avalanche Fuji",
  nativeAsset: "AVAX",
  testnet: true as const,
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  explorerUrl: "https://subnets-test.avax.network/c-chain",
  chainId: 43113,
  rollout: "experimental" as const,
};

test("RPC evidence binds hash, tx chain, nonce, gas and gas price", async () => {
  const hash = `0x${"c".repeat(64)}`;
  const fetcher: typeof fetch = async (_input, init) => {
    const request = JSON.parse(String(init?.body));
    const result = request.method === "eth_chainId"
      ? "0xa869"
      : request.method === "eth_getTransactionByHash"
        ? {
            hash,
            chainId: "0xa869",
            from: `0x${"a".repeat(40)}`,
            to: `0x${"b".repeat(40)}`,
            value: "0x38d7ea4c68000",
            nonce: "0x7",
            gas: "0x5208",
            gasPrice: "0x3b9aca00",
            blockNumber: "0x10",
          }
        : { status: "0x1", blockNumber: "0x10" };
    return Response.json({ jsonrpc: "2.0", id: request.id, result });
  };
  const evidence = await getEvmTransactionEvidence(
    fujiNetwork,
    hash,
    fetcher,
  );
  assert.equal(evidence.transactionHash, hash);
  assert.equal(evidence.chainId, 43113);
  assert.equal(evidence.transactionChainId, 43113);
  assert.equal(evidence.nonce, 7);
  assert.equal(evidence.gasLimit, "21000");
  assert.equal(evidence.gasPriceWei, "1000000000");
});

function contractCallFetcher(input: string): typeof fetch {
  const hash = `0x${"d".repeat(64)}`;
  return async (_input, init) => {
    const request = JSON.parse(String(init?.body));
    const result = request.method === "eth_chainId"
      ? "0xa869"
      : request.method === "eth_estimateGas"
        ? "0x186a0"
        : request.method === "eth_gasPrice"
          ? "0x3b9aca00"
          : request.method === "eth_getTransactionCount"
            ? "0x7"
            : request.method === "eth_getBalance"
              ? "0x38d7ea4c68000"
              : request.method === "eth_getTransactionByHash"
                ? {
                    hash,
                    chainId: "0xa869",
                    from: `0x${"a".repeat(40)}`,
                    to: `0x${"b".repeat(40)}`,
                    value: "0x0",
                    nonce: "0x7",
                    gas: "0x186a0",
                    gasPrice: "0x3b9aca00",
                    blockNumber: "0x10",
                    input,
                  }
                : { status: "0x1", blockNumber: "0x10" };
    return Response.json({ jsonrpc: "2.0", id: request.id, result });
  };
}

test("contract call preview carries calldata and evidence binds it byte-for-byte", async () => {
  const calldata = `0x70a08231${"0".repeat(128)}`;
  const from = `0x${"a".repeat(40)}`;
  const to = `0x${"b".repeat(40)}`;
  const preview = await prepareEvmContractCall(
    fujiNetwork,
    from,
    to,
    calldata,
    undefined,
    contractCallFetcher(calldata),
  );
  assert.equal(preview.data, calldata);
  assert.equal(preview.valueWei, "0");
  assert.equal(preview.nonce, 7);

  const hash = `0x${"d".repeat(64)}`;
  const evidence = await getEvmTransactionEvidence(
    fujiNetwork,
    hash,
    contractCallFetcher(calldata),
    { data: calldata },
  );
  assert.equal(evidence.transactionHash, hash);

  const altered = `0x70a08231${"0".repeat(127)}1`;
  await assert.rejects(
    getEvmTransactionEvidence(
      fujiNetwork,
      hash,
      contractCallFetcher(altered),
      { data: calldata },
    ),
    { message: "evm_transaction_scope_mismatch" },
  );
});

test("verifyEvmContractCall confirms only a byte-identical calldata", async () => {
  const calldata = `0x70a08231${"0".repeat(128)}`;
  const from = `0x${"a".repeat(40)}`;
  const to = `0x${"b".repeat(40)}`;
  const preview = await prepareEvmContractCall(
    fujiNetwork,
    from,
    to,
    calldata,
    undefined,
    contractCallFetcher(calldata),
  );
  const hash = `0x${"d".repeat(64)}`;
  const confirmed = await verifyEvmContractCall(
    fujiNetwork,
    preview,
    hash,
    contractCallFetcher(calldata),
  );
  assert.equal(confirmed.status, "confirmed");
  assert.equal(confirmed.transactionHash, hash);
  await assert.rejects(
    verifyEvmContractCall(
      fujiNetwork,
      preview,
      hash,
      contractCallFetcher(`0x70a08231${"f".repeat(128)}`),
    ),
    { message: "evm_transaction_scope_mismatch" },
  );
});

test("prepare and record use persisted atomic winners, never local race losers", async () => {
  const source = await readFile(
    new URL("../app/wallets/avalanche-transfer.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /onConflictDoNothing\(\)\.returning/);
  assert.match(source, /concurrent request won the unique preview ID/i);
  assert.match(source, /fuji_preview_conflict_unresolved/);
  assert.match(source, /status\x27 = \x27prepared/);
  assert.match(source, /transactionHash\x27, \x27\x27/);
  assert.match(source, /returning\(\{ metadata: agentActivities\.metadata \}\)/);
});

test("hash becomes durable before RPC evidence and retries only the same hash", async () => {
  const source = await readFile(
    new URL("../app/wallets/avalanche-transfer.ts", import.meta.url),
    "utf8",
  );
  const transition = source.indexOf("avalanche.transfer.submitted");
  const evidence = source.indexOf("getEvmTransactionEvidence(", transition);
  assert.ok(transition > 0);
  assert.ok(evidence > transition);
  assert.match(source, /input\.transactionHash\.toLowerCase\(\)/);
  assert.match(source, /persistedHash !== transactionHash/);
  assert.match(source, /fuji_preview_already_consumed/);
});

test("receipt failure is terminal and every frozen transaction field is verified", async () => {
  const source = await readFile(
    new URL("../app/wallets/avalanche-transfer.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /evidence\.receiptStatus === "0x0"/);
  assert.match(source, /\? "failed"/);
  for (const field of [
    "transactionChainId",
    "transactionHash",
    "valueWei",
    "nonce",
    "gasLimit",
    "gasPriceWei",
  ]) {
    assert.match(source, new RegExp(`evidence\\.${field}`));
  }
});

test("client uses only Privy wallet, checks Fuji and expiry, and cannot rebroadcast", async () => {
  const source = await readFile(
    new URL("../app/agent/avalanche-chat-action.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /walletClientType === "privy"/);
  assert.match(source, /provider\.request\(\{ method: "eth_chainId" \}\)/);
  assert.match(source, /Number\(BigInt\(providerChainId\)\) !== 43113/);
  assert.match(source, /new Date\(preview\.expiresAt\)\.getTime\(\) <= Date\.now\(\)/);
  assert.match(source, /preview\.status !== "prepared"/);
  assert.match(source, /preview\.transactionHash/);
  assert.match(source, /submittedHash/);
  assert.match(source, /submissionLock\.current/);
  assert.match(source, /setSubmittedHash\(normalizedHash\)/);
  assert.match(source, /setSubmittedHash\(persistedHash\)/);
  assert.match(source, /preview\.status === "submitted"/);
  assert.doesNotMatch(source, /sponsor\s*:\s*true/);
});


test("recording preserves a broadcast hash if expiry crosses during Privy approval", async () => {
  const source = await readFile(
    new URL("../app/wallets/avalanche-transfer.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /expiresAt' > \$\{now\}/);
  assert.match(source, /status' = 'prepared'/);
  assert.match(source, /transactionHash', ''\) = ''/);
});
