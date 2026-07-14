import assert from "node:assert/strict";
import test from "node:test";
import {
  extractMarketSymbol,
  formatMarketQuote,
  getCoinMarketCapQuote,
} from "../app/connectors/coinmarketcap";

test("extracts common asset names and symbols", () => {
  assert.equal(extractMarketSymbol("What is the price of XLM?"), "XLM");
  assert.equal(extractMarketSymbol("precio de bitcoin"), "BTC");
  assert.equal(extractMarketSymbol("Add Avalanche to my watchlist"), "AVAX");
});

test("loads and normalizes a CoinMarketCap keyless quote", async () => {
  const fetcher: typeof fetch = async (input) => {
    const url = String(input);
    assert.ok(
      url.includes("trial-pro-api/v3/cryptocurrency/quotes/latest"),
    );
    assert.match(url, /symbol=XLM/);
    return new Response(
      JSON.stringify({
        data: [
          {
            id: 512,
            name: "Stellar",
            symbol: "XLM",
            cmc_rank: 13,
            last_updated: "2026-07-14T07:29:00.000Z",
            quote: [
              {
                symbol: "USD",
                price: 0.17915,
                volume_24h: 137224056,
                percent_change_24h: -2.55,
                percent_change_7d: -8.63,
                market_cap: 6122689488,
                last_updated: "2026-07-14T07:29:05.000Z",
              },
            ],
          },
        ],
        status: { error_code: "0" },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  const quote = await getCoinMarketCapQuote("xlm", fetcher);
  assert.equal(quote.symbol, "XLM");
  assert.equal(quote.price, 0.17915);
  assert.equal(quote.rank, 13);
  assert.equal(quote.source, "CoinMarketCap");
  assert.match(formatMarketQuote(quote), /read-only/);
});

test("does not present an absent CoinMarketCap asset as a quote", async () => {
  const fetcher: typeof fetch = async () =>
    new Response(JSON.stringify({ data: [], status: { error_code: "0" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  await assert.rejects(
    getCoinMarketCapQuote("ZZZZ", fetcher),
    /cmc_asset_not_found/,
  );
});