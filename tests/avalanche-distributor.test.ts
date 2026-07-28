import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  createFujiClaimKey,
  requestFujiDrip,
} from "../app/wallets/avalanche-distributor";
import {
  getFujiDistributorConfig,
  type EnabledFujiDistributorConfig,
} from "../app/wallets/avalanche-policy";

const secret = "test-only-distributor-secret-32-bytes-minimum";
const recipient = `0x${"a".repeat(40)}`;
const hash = `0x${"b".repeat(64)}`;
const config: EnabledFujiDistributorConfig = {
  enabled: true,
  endpoint: "https://distributor.example.test/v1/fuji/drip",
  secret,
  dailyLimit: 25,
  timeoutMs: 5_000,
  amount: "0.005",
  chainId: 43113,
  protocol: "carmelita-fuji-drip-v1",
};

function confirmedRpcFetcher(options: {
  to?: string;
  value?: string;
  status?: string | null;
} = {}): typeof fetch {
  return async (_url, init) => {
    const request = JSON.parse(String(init?.body));
    const result = request.method === "eth_chainId"
      ? "0xa869"
      : request.method === "eth_getTransactionByHash"
        ? {
            hash, chainId: "0xa869", from: `0x${"d".repeat(40)}`,
            to: options.to ?? recipient,
            value: options.value ?? "0x11c37937e08000",
            nonce: "0x1", gas: "0x5208", gasPrice: "0x2", blockNumber: "0x10",
          }
        : options.status === null ? null : { status: options.status ?? "0x1", blockNumber: "0x10" };
    return Response.json({ jsonrpc: "2.0", id: request.id, result });
  };
}

test("distributor input exposes a separate type-safe Fuji RPC verifier", () => {
  type DripInput = Parameters<typeof requestFujiDrip>[0];
  const rpcFetcher: DripInput["rpcFetcher"] = confirmedRpcFetcher();
  assert.equal(typeof rpcFetcher, "function");
});

test("distributor configuration is fail-closed", () => {
  assert.deepEqual(getFujiDistributorConfig({}), {
    enabled: false,
    reason: "fuji_distributor_disabled",
  });
  for (const url of [
    "http://distributor.example.test",
    "https://localhost/drip",
    "https://127.0.0.1/drip",
    "https://10.1.2.3/drip",
    "https://example.test/drip?unsafe=true",
  ]) {
    assert.equal(getFujiDistributorConfig({
      FUJI_DISTRIBUTOR_ENABLED: "true",
      FUJI_DISTRIBUTOR_URL: url,
      FUJI_DISTRIBUTOR_SECRET: secret,
    }).enabled, false);
  }
  assert.deepEqual(getFujiDistributorConfig({
    FUJI_DISTRIBUTOR_ENABLED: "true",
    FUJI_DISTRIBUTOR_URL: config.endpoint,
    FUJI_DISTRIBUTOR_SECRET: secret,
    FUJI_DISTRIBUTOR_DAILY_LIMIT: "0",
  }), { enabled: false, reason: "fuji_distributor_daily_limit_invalid" });
  assert.deepEqual(getFujiDistributorConfig({
    FUJI_DISTRIBUTOR_ENABLED: "true",
    FUJI_DISTRIBUTOR_URL: config.endpoint,
    FUJI_DISTRIBUTOR_SECRET: secret,
    FUJI_DISTRIBUTOR_TIMEOUT_MS: "30000",
  }), { enabled: false, reason: "fuji_distributor_timeout_invalid" });
});

test("claim identity is stable per user and never exposes the raw Privy ID", async () => {
  const userId = "did:privy:user-sensitive-id";
  const claimKey = createFujiClaimKey(userId, secret);
  assert.equal(claimKey, createFujiClaimKey(userId, secret));
  assert.notEqual(claimKey, createFujiClaimKey(`${userId}-other`, secret));
  let capturedBody = "";
  let capturedHeaders = new Headers();
  const fetcher: typeof fetch = async (_url, init) => {
    capturedBody = String(init?.body);
    capturedHeaders = new Headers(init?.headers);
    const body = JSON.parse(capturedBody);
    return Response.json({
      status: "confirmed",
      transactionHash: hash,
      chainId: 43113,
      amount: "0.005",
      recipient,
      claimKey: body.claimKey,
      idempotencyKey: body.idempotencyKey,
      replayed: false,
      dailyClaims: 1,
    });
  };
  const receipt = await requestFujiDrip({
    config, userId, recipient, explicitUserConfirmation: true, fetcher,
    rpcFetcher: confirmedRpcFetcher(),
  });
  const body = JSON.parse(capturedBody);
  assert.doesNotMatch(capturedBody, /user-sensitive-id/);
  assert.equal(body.amount, "0.005");
  assert.equal(body.chainId, 43113);
  assert.equal(body.claimWindow, "once_per_authenticated_user");
  assert.equal(capturedHeaders.get("idempotency-key"), body.idempotencyKey);
  assert.equal(capturedHeaders.get("authorization"), `Bearer ${secret}`);
  assert.equal(receipt.transactionHash, hash);
  assert.match(receipt.explorerUrl, new RegExp(hash));
});

test("duplicate claims reuse one idempotency key and one verifiable hash", async () => {
  const keys: string[] = [];
  const fetcher: typeof fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    keys.push(body.idempotencyKey);
    return Response.json({
      status: "confirmed", transactionHash: hash, chainId: 43113,
      amount: "0.005", recipient, claimKey: body.claimKey,
      idempotencyKey: body.idempotencyKey, replayed: keys.length > 1, dailyClaims: 1,
    });
  };
  const input = {
    config, userId: "user-1", recipient, explicitUserConfirmation: true as const, fetcher,
    rpcFetcher: confirmedRpcFetcher(),
  };
  const first = await requestFujiDrip(input);
  const replay = await requestFujiDrip(input);
  assert.equal(keys[0], keys[1]);
  assert.equal(first.transactionHash, replay.transactionHash);
  assert.equal(replay.replayed, true);
});

test("receipt mismatch and daily-cap overrun fail closed", async () => {
  const mismatch: typeof fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    return Response.json({
      status: "submitted", transactionHash: hash, chainId: 43113,
      amount: "0.005", recipient: `0x${"c".repeat(40)}`,
      claimKey: body.claimKey, idempotencyKey: body.idempotencyKey,
      replayed: false, dailyClaims: 26,
    });
  };
  await assert.rejects(
    requestFujiDrip({ config, userId: "user-1", recipient, explicitUserConfirmation: true, fetcher: mismatch }),
    /fuji_distributor_receipt_mismatch/,
  );
});

test("fund route authenticates, checks ownership and never contains a signer", async () => {
  const source = await readFile(
    new URL("../app/api/agent/wallets/avalanche/fund/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /verifyPrivyAccessToken/);
  assert.match(source, /listPersistedUserWallets/);
  assert.match(source, /candidate\.network === "avalanche:fuji"/);
  assert.match(source, /explicitUserConfirmation: z\.literal\(true\)/);
  assert.match(source, /getFujiDistributorConfig/);
  assert.match(source, /sameOrigin/);
  assert.match(source, /status: 503/);
  assert.match(source, /code\.includes\("transaction_pending"\) \? 425/);
  assert.match(source, /code\.includes\("transaction_failed"\)/);
  assert.match(source, /code\.includes\("mismatch"\) \? 502/);
  assert.doesNotMatch(source, /privateKey|secretKey|eth_sendRawTransaction|walletClient|signTransaction/i);
});

test("external receipt is accepted only after Fuji RPC verifies exact value and recipient", async () => {
  const distributor: typeof fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    return Response.json({
      status: "submitted", transactionHash: hash, chainId: 43113,
      amount: "0.005", recipient, claimKey: body.claimKey,
      idempotencyKey: body.idempotencyKey, replayed: false, dailyClaims: 1,
    });
  };
  await assert.rejects(
    requestFujiDrip({
      config, userId: "user-2", recipient, explicitUserConfirmation: true,
      fetcher: distributor, rpcFetcher: confirmedRpcFetcher({ value: "0x1" }),
    }),
    /fuji_distributor_onchain_mismatch/,
  );
  await assert.rejects(
    requestFujiDrip({
      config, userId: "user-2", recipient, explicitUserConfirmation: true,
      fetcher: distributor, rpcFetcher: confirmedRpcFetcher({ status: null }),
    }),
    /fuji_distributor_transaction_pending/,
  );
  await assert.rejects(
    requestFujiDrip({
      config, userId: "user-2", recipient, explicitUserConfirmation: true,
      fetcher: distributor, rpcFetcher: confirmedRpcFetcher({ status: "0x0" }),
    }),
    /fuji_distributor_transaction_failed/,
  );
});

test("runtime doctor treats an unconfigured distributor as the safe passing state", async () => {
  const source = await readFile(
    new URL("../scripts/runtime-doctor.mjs", import.meta.url),
    "utf8",
  );
  assert.match(source, /FUJI_DISTRIBUTOR_ENABLED/);
  assert.match(source, /disabled \(safe default; no external request possible\)/);
  assert.match(source, /FUJI_DISTRIBUTOR_SECRET/);
  assert.match(source, /distributorSecret\.length >= 32/);
  assert.match(source, /timeoutMs >= 1_000 && timeoutMs <= 10_000/);
  assert.doesNotMatch(source, /console\.log\([^\n]*distributorSecret/);
});
