import assert from "node:assert/strict";
import test from "node:test";
import { diagnoseEvmWallet } from "../app/wallets/evm-rpc";
import { getWalletNetwork } from "../app/wallets/networks";

test("diagnoses an activated Privy EVM wallet on Avalanche Fuji", async () => {
  const address = `0x${"a".repeat(40)}`;
  const results: Record<string, string> = {
    eth_chainId: "0xa869",
    eth_getBalance: "0xde0b6b3a7640000",
    eth_gasPrice: "0x5d21dba00",
    eth_getTransactionCount: "0x2",
  };
  const fetcher: typeof fetch = async (_input, init) => {
    const request = JSON.parse(String(init?.body));
    return Response.json({
      jsonrpc: "2.0",
      id: request.id,
      result: results[request.method],
    });
  };

  const result = await diagnoseEvmWallet(
    getWalletNetwork("avalanche:fuji"),
    address,
    fetcher,
  );

  assert.equal(result.chainId, 43113);
  assert.equal(result.balance, "1");
  assert.equal(result.nativeAsset, "AVAX");
  assert.equal(result.funded, true);
  assert.equal(result.nonce, 2);
});

test("rejects an RPC connected to the wrong EVM chain", async () => {
  const fetcher: typeof fetch = async (_input, init) => {
    const request = JSON.parse(String(init?.body));
    const result = request.method === "eth_chainId" ? "0x1" : "0x0";
    return Response.json({ jsonrpc: "2.0", id: request.id, result });
  };
  await assert.rejects(
    diagnoseEvmWallet(
      getWalletNetwork("avalanche:fuji"),
      `0x${"b".repeat(40)}`,
      fetcher,
    ),
    /evm_chain_id_mismatch/,
  );
});
