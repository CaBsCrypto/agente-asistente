import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildAgentReply } from "../app/agent-chat-logic";
import { parseAvalancheChatIntent } from "../app/wallets/avalanche-intents";
import {
  FUJI_DISTRIBUTION_AMOUNT,
  getFujiDistributorConfig,
} from "../app/wallets/avalanche-policy";
import {
  estimateEvmNativeTransfer,
  getEvmTransactionEvidence,
} from "../app/wallets/evm-rpc";
import { getWalletNetwork } from "../app/wallets/networks";

const destination = `0x${"b".repeat(40)}` as const;
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

test("parses activate, status, fund and exact send intents in EN/ES/PT", () => {
  assert.deepEqual(parseAvalancheChatIntent("Activa mi wallet en Avalanche Fuji"), {
    operation: "activate",
  });
  assert.deepEqual(parseAvalancheChatIntent("Show my AVAX wallet balance"), {
    operation: "status",
  });
  assert.deepEqual(parseAvalancheChatIntent("Recarregue minha wallet Fuji"), {
    operation: "fund",
  });
  assert.deepEqual(
    parseAvalancheChatIntent(`Envía 0.001 AVAX a ${destination}`),
    { operation: "send", amount: "0.001", destination },
  );
  assert.equal(
    parseAvalancheChatIntent(`Envía 0.01 AVAX a ${destination}`),
    null,
  );
});

test("chat reply returns structured in-chat actions and never claims execution", () => {
  const activate = buildAgentReply("Activa Avalanche Fuji");
  assert.equal(activate.actions[0]?.walletAction?.type, "avalanche.activate");
  assert.match(activate.content, /no mueve fondos/i);

  const fund = buildAgentReply("Recarga AVAX en Fuji");
  assert.equal(fund.actions[0]?.walletAction?.type, "avalanche.fund");
  assert.match(fund.content, /0\.005 AVAX/);
  assert.match(fund.content, /deshabilitada/i);

  const send = buildAgentReply(`Envía 0.001 AVAX a ${destination}`);
  assert.equal(send.actions[0]?.walletAction?.type, "avalanche.send");
  assert.equal(send.actions[0]?.walletAction?.destination, destination);
  assert.equal(send.actions[0]?.walletAction?.amount, "0.001");
  assert.match(send.content, /Privy.*approval/i);
});

test("distributor is fail-closed without every server-side control", () => {
  assert.deepEqual(getFujiDistributorConfig({}), {
    enabled: false,
    reason: "fuji_distributor_disabled",
  });
  assert.equal(
    getFujiDistributorConfig({
      FUJI_DISTRIBUTOR_ENABLED: "true",
      FUJI_DISTRIBUTOR_URL: "https://distributor.example.test",
    }).enabled,
    false,
  );
  const config = getFujiDistributorConfig({
    FUJI_DISTRIBUTOR_ENABLED: "true",
    FUJI_DISTRIBUTOR_URL: "https://distributor.example.test",
    FUJI_DISTRIBUTOR_SECRET: "a-secure-test-secret-with-24-chars",
    FUJI_DISTRIBUTOR_DAILY_LIMIT: "12",
  });
  assert.equal(config.enabled, true);
  if (config.enabled) {
    assert.equal(config.amount, FUJI_DISTRIBUTION_AMOUNT);
    assert.equal(config.dailyLimit, 12);
  }
});

test("freezes exact Fuji transfer value, nonce and gas after RPC validation", async () => {
  const methods: Record<string, string> = {
    eth_chainId: "0xa869",
    eth_estimateGas: "0x5208",
    eth_gasPrice: "0x3b9aca00",
    eth_getTransactionCount: "0x7",
    eth_getBalance: "0x2386f26fc10000",
  };
  const fetcher: typeof fetch = async (_input, init) => {
    const request = JSON.parse(String(init?.body));
    return Response.json({
      jsonrpc: "2.0",
      id: request.id,
      result: methods[request.method],
    });
  };
  const preview = await estimateEvmNativeTransfer(
    fujiNetwork,
    `0x${"a".repeat(40)}`,
    destination,
    "0.001",
    fetcher,
  );
  assert.equal(preview.chainId, 43113);
  assert.equal(preview.valueWei, "1000000000000000");
  assert.equal(preview.valueHex, "0x38d7ea4c68000");
  assert.equal(preview.gasLimitHex, "0x5208");
  assert.equal(preview.nonce, 7);
});

test("receipt evidence verifies Fuji chain and transaction fields", async () => {
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
            to: destination,
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
  assert.equal(evidence.chainId, 43113);
  assert.equal(evidence.transactionHash, hash);
  assert.equal(evidence.transactionChainId, 43113);
  assert.equal(evidence.valueWei, "1000000000000000");
  assert.equal(evidence.nonce, 7);
  assert.equal(evidence.gasLimit, "21000");
  assert.equal(evidence.gasPriceWei, "1000000000");
  assert.equal(evidence.receiptStatus, "0x1");
});

test("client action is locked to preview nonce/value and does not enable sponsorship", async () => {
  const source = await readFile(
    new URL("../app/agent/avalanche-chat-action.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /submissionLock/);
  assert.match(source, /nonce: hex\(preview\.nonce\)/);
  assert.match(source, /value: preview\.valueHex/);
  assert.match(source, /gas: preview\.gasLimitHex/);
  assert.match(source, /method: "eth_sendTransaction"/);
  assert.doesNotMatch(source, /sponsor\s*:\s*true/);
  assert.match(source, /Open official Fuji faucet/);
  assert.match(source, /const \{ refreshUser \} = useUser\(\)/);
  assert.match(source, /await refreshUser\(\)/);
  assert.match(source, /setSubmittedHash\(normalizedHash\)/);
  assert.match(source, /setSubmittedHash\(persistedHash\)/);
  assert.match(source, /verifySubmittedTransaction\(submittedHash\)/);
  assert.match(source, /preview\.status !== "prepared"/);
  assert.match(source, /preview\.transactionHash/);
  assert.match(source, /walletClientType === "privy"/);
  assert.match(source, /method: "eth_chainId"/);
});
test("submitted receipt retries re-query the same hash instead of returning stale evidence", async () => {
  const source = await readFile(
    new URL("../app/wallets/avalanche-transfer.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /let isSubmittedRetry/);
  assert.match(source, /currentHash\(\) === transactionHash/);
  assert.match(source, /getEvmTransactionEvidence/);
  assert.match(source, /replayProtected: isSubmittedRetry/);
  assert.match(source, /fuji_preview_already_consumed/);
});
