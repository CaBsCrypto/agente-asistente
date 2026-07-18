import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSoroswapSwap,
  getSoroswapQuote,
  getSoroswapHealth,
  sendSoroswapSwap,
  SOROSWAP_TESTNET,
  soroswapAmountToAtomic,
  soroswapAtomicToAmount,
} from "../app/connectors/soroswap";

const wallet = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("converts Stellar Testnet amounts without floating point loss", () => {
  assert.equal(soroswapAmountToAtomic("1.25"), "12500000");
  assert.equal(soroswapAtomicToAmount("12500000"), "1.25");
  assert.throws(() => soroswapAmountToAtomic("100.0000001"));
  assert.throws(() => soroswapAmountToAtomic("0"));
});

test("requests an authenticated XLM to USDC quote on Testnet only", async () => {
  const originalKey = process.env.SOROSWAP_API_KEY;
  process.env.SOROSWAP_API_KEY = "sk_test_example";
  let requestUrl = "";
  let requestBody: Record<string, unknown> = {};
  let authorization = "";
  const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestBody = JSON.parse(String(init?.body));
    authorization = new Headers(init?.headers).get("authorization") ?? "";
    return jsonResponse({
      assetIn: SOROSWAP_TESTNET.assets.XLM.contract,
      assetOut: SOROSWAP_TESTNET.assets.USDC.contract,
      amountIn: "10000000",
      amountOut: "5200000",
      otherAmountThreshold: "5174000",
      tradeType: "EXACT_IN",
      priceImpactPct: "0.12",
      platform: "aggregator",
      routePlan: [
        {
          swapInfo: {
            protocol: "soroswap",
            path: [
              SOROSWAP_TESTNET.assets.XLM.contract,
              SOROSWAP_TESTNET.assets.USDC.contract,
            ],
          },
          percent: "100",
        },
      ],
    });
  }) as typeof fetch;

  try {
    const quote = await getSoroswapQuote(
      { assetIn: "XLM", assetOut: "USDC", amount: "1" },
      fetcher,
    );
    assert.equal(requestUrl, "https://api.soroswap.finance/quote?network=testnet");
    assert.equal(authorization, "Bearer sk_test_example");
    assert.equal(requestBody.amount, "10000000");
    assert.deepEqual(requestBody.protocols, ["soroswap", "aqua"]);
    assert.equal(quote.amountOut, "0.52");
    assert.equal(quote.minimumAmountOut, "0.5174");
  } finally {
    process.env.SOROSWAP_API_KEY = originalKey;
  }
});

test("builds unsigned XDR from the server quote and user wallet", async () => {
  const originalKey = process.env.SOROSWAP_API_KEY;
  process.env.SOROSWAP_API_KEY = "sk_test_example";
  const quote = {
    network: "testnet" as const,
    assetIn: "XLM" as const,
    assetOut: "USDC" as const,
    amountIn: "1",
    amountOut: "0.52",
    minimumAmountOut: "0.5174",
    priceImpactPct: "0.12",
    platform: "aggregator" as const,
    slippageBps: 50,
    routePlan: [],
    raw: {
      assetIn: SOROSWAP_TESTNET.assets.XLM.contract,
      assetOut: SOROSWAP_TESTNET.assets.USDC.contract,
      amountIn: "10000000",
      amountOut: "5200000",
      otherAmountThreshold: "5174000",
      tradeType: "EXACT_IN" as const,
      priceImpactPct: "0.12",
      platform: "aggregator" as const,
      routePlan: [],
    },
  };
  const xdr = "A".repeat(80);
  const fetcher = (async (_input: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    assert.equal(body.from, wallet);
    assert.equal(body.to, wallet);
    assert.equal(body.quote.tradeType, "EXACT_IN");
    return jsonResponse({ xdr });
  }) as typeof fetch;
  try {
    assert.deepEqual(await buildSoroswapSwap({ quote, walletAddress: wallet }, fetcher), {
      xdr,
    });
  } finally {
    process.env.SOROSWAP_API_KEY = originalKey;
  }
});

test("submits only a signed XDR and requires a transaction hash", async () => {
  const originalKey = process.env.SOROSWAP_API_KEY;
  process.env.SOROSWAP_API_KEY = "sk_test_example";
  const fetcher = (async (_input: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    assert.equal(body.xdr, "A".repeat(80));
    return jsonResponse({ txHash: "abc123", status: "success" });
  }) as typeof fetch;
  try {
    const result = await sendSoroswapSwap("A".repeat(80), fetcher);
    assert.equal(result.hash, "abc123");
  } finally {
    process.env.SOROSWAP_API_KEY = originalKey;
  }
});

test("maps authentication failures without leaking upstream content", async () => {
  const originalKey = process.env.SOROSWAP_API_KEY;
  process.env.SOROSWAP_API_KEY = "sk_test_example";
  const fetcher = (async () =>
    jsonResponse({ message: "secret upstream detail" }, 403)) as typeof fetch;
  try {
    await assert.rejects(
      () =>
        getSoroswapQuote(
          { assetIn: "XLM", assetOut: "USDC", amount: "1" },
          fetcher,
        ),
      /soroswap_auth_failed/,
    );
  } finally {
    process.env.SOROSWAP_API_KEY = originalKey;
  }
});

test("reports when Soroswap Testnet has no live protocols", async () => {
  const fetcher = (async () =>
    jsonResponse({
      status: { indexer: { testnet: [] }, reachable: true },
    })) as typeof fetch;
  const result = await getSoroswapHealth(fetcher);
  assert.equal(result.available, false);
  assert.deepEqual(result.protocols, []);
});
