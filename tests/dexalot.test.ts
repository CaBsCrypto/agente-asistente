import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  DEXALOT_DOCS_URL,
  DEXALOT_TESTNET_API,
  DEXALOT_TESTNET_CHAIN_ID,
  getDexalotTestnetQuote,
  listDexalotTestnetPairs,
} from "../app/connectors/dexalot";
import {
  parseAvalancheKnowledgeIntent,
  parseDexalotReadIntent,
} from "../app/connectors/avalanche-read-intents";

const pair = {
  env: "fuji-multi-subnet",
  pair: "AVAX/USDC",
  base: "AVAX",
  quote: "USDC",
  basedisplaydecimals: 3,
  quotedisplaydecimals: 3,
  baseaddress: "0x0000000000000000000000000000000000000000",
  quoteaddress: "0x68B773B8C10F2ACE8aC51980A1548B6B48a2eC54",
  mintrade_amnt: "5",
  maxtrade_amnt: "100000",
  allowswap: true,
  auctionmode: 0,
  status: "deployed",
  maker_rate_bps: 10,
  taker_rate_bps: 12,
  allowed_slippage_pct: 5,
};

function json(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" },
  });
}

test("Dexalot connector is pinned to Testnet and read-only endpoints", async () => {
  const requests: URL[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    assert.equal(init?.method, "GET");
    assert.equal(init?.credentials, "omit");
    assert.equal(init?.redirect, "error");
    const url = new URL(String(input));
    requests.push(url);
    return json([pair]);
  };
  const result = await listDexalotTestnetPairs(fetcher);
  assert.equal(DEXALOT_TESTNET_API, "https://api.dexalot-test.com");
  assert.equal(DEXALOT_TESTNET_CHAIN_ID, 43113);
  assert.equal(result.readOnly, true);
  assert.equal(result.source, DEXALOT_DOCS_URL);
  assert.equal(result.pairs[0]?.pair, "AVAX/USDC");
  assert.equal(requests[0]?.pathname, "/privapi/trading/pairs");
});

test("Dexalot simple quote resolves direction and never requests a firm quote", async () => {
  const requests: URL[] = [];
  const fetcher: typeof fetch = async (input) => {
    const url = new URL(String(input));
    requests.push(url);
    if (url.pathname === "/privapi/trading/pairs") return json([pair]);
    return json({
      success: true,
      pair: "AVAX/USDC",
      side: 1,
      price: "8.93",
      baseAmount: "1",
      quoteAmount: "8.93",
    });
  };
  const quote = await getDexalotTestnetQuote({
    amount: "1",
    assetIn: "AVAX",
    assetOut: "USDC",
  }, fetcher);
  assert.equal(quote.amountIn, "1");
  assert.equal(quote.amountOut, "8.93");
  assert.equal(quote.firm, false);
  assert.equal(quote.readOnly, true);
  assert.equal(requests[1]?.pathname, "/api/rfq/pairprice");
  assert.equal(requests[1]?.searchParams.get("side"), "1");
  assert.equal(requests[1]?.searchParams.get("isbase"), "1");
  assert.ok(requests.every((url) => !url.pathname.includes("firm")));
});

test("Dexalot parser supports Spanish, English and Portuguese", () => {
  assert.deepEqual(
    parseDexalotReadIntent("Cotiza 1 AVAX a USDC en Dexalot"),
    { operation: "quote", amount: "1", assetIn: "AVAX", assetOut: "USDC" },
  );
  assert.equal(
    parseDexalotReadIntent("Show Dexalot Testnet pairs")?.operation,
    "pairs",
  );
  assert.equal(
    parseDexalotReadIntent("Cote 2 AVAX para USDC na Dexalot")?.operation,
    "quote",
  );
});

test("Avalanche knowledge parser does not intercept wallet or Dexalot actions", () => {
  assert.equal(
    parseAvalancheKnowledgeIntent("Busca protocolos de lending en Avalanche")?.operation,
    "search",
  );
  assert.equal(
    parseAvalancheKnowledgeIntent("Muestra mi wallet Avalanche"),
    null,
  );
  assert.equal(
    parseAvalancheKnowledgeIntent("Lista los pares de Dexalot en Avalanche"),
    null,
  );
});

test("Dexalot route requires Privy and has no execution surface", async () => {
  const source = await readFile(
    new URL("../app/api/agent/avalanche/dexalot/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /verifyPrivyAccessToken/);
  assert.match(source, /sameOrigin/);
  assert.match(source, /action: z\.literal\("pairs"\)/);
  assert.match(source, /action: z\.literal\("quote"\)/);
  assert.doesNotMatch(
    source,
    /privateKey|secretKey|sendTransaction|firmquote|eth_sendTransaction/i,
  );
});

test("live Dexalot Testnet smoke is explicit", {
  skip: process.env.DEXALOT_LIVE !== "1",
}, async () => {
  const catalog = await listDexalotTestnetPairs();
  assert.ok(catalog.pairs.some((item) => item.pair === "AVAX/USDC"));
  const quote = await getDexalotTestnetQuote({
    amount: "1",
    assetIn: "AVAX",
    assetOut: "USDC",
  });
  assert.equal(quote.readOnly, true);
  assert.ok(Number(quote.amountOut) > 0);
});

