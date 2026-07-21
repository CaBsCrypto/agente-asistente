import type { MarketQuote } from "@/app/connectors/coinmarketcap";
import { getCoinMarketCapQuote } from "@/app/connectors/coinmarketcap";

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

// Ticker → CoinGecko coin id (their API keys on ids, not symbols).
const ids: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  XLM: "stellar",
  SOL: "solana",
  AVAX: "avalanche-2",
  BNB: "binancecoin",
  USDC: "usd-coin",
  USDT: "tether",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
};

type CoinGeckoMarket = {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number | null;
  market_cap_rank: number | null;
  total_volume: number | null;
  price_change_percentage_24h: number | null;
  price_change_percentage_7d_in_currency?: number | null;
  last_updated: string;
};

export function toCoinGeckoId(symbol: string): string | null {
  return ids[symbol.trim().toUpperCase()] ?? null;
}

// Read-only price from CoinGecko. Works keyless; uses the demo key when present.
export async function getCoinGeckoQuote(
  symbol: string,
  fetcher: typeof fetch = fetch,
): Promise<MarketQuote> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const id = ids[normalizedSymbol];
  if (!id) throw new Error("coingecko_symbol_unsupported");

  const url = new URL(COINGECKO_BASE + "/coins/markets");
  url.searchParams.set("vs_currency", "usd");
  url.searchParams.set("ids", id);
  url.searchParams.set("price_change_percentage", "24h,7d");

  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "agent-assistant/0.1.0",
  };
  const key = (process.env.COINGECKO_API_KEY ?? "").trim();
  if (key) headers["x-cg-demo-api-key"] = key;

  const response = await fetcher(url, { headers, cache: "no-store" });
  if (!response.ok) {
    if (response.status === 429) throw new Error("coingecko_rate_limited");
    throw new Error("coingecko_request_failed");
  }

  const data = (await response.json()) as CoinGeckoMarket[];
  const asset = Array.isArray(data) ? data[0] : undefined;
  if (!asset || !Number.isFinite(asset.current_price)) {
    throw new Error("coingecko_asset_not_found");
  }

  return {
    id: asset.id,
    name: asset.name,
    symbol: asset.symbol.toUpperCase(),
    currency: "USD",
    price: asset.current_price,
    rank: asset.market_cap_rank ?? null,
    change24h: asset.price_change_percentage_24h ?? null,
    change7d: asset.price_change_percentage_7d_in_currency ?? null,
    marketCap: asset.market_cap ?? null,
    volume24h: asset.total_volume ?? null,
    updatedAt: asset.last_updated,
    source: "CoinGecko",
    access: key ? "demo-key" : "keyless",
  };
}

// Primary market source is CoinGecko; CoinMarketCap is the fallback so a single
// provider outage never leaves the agent without a price.
export async function getMarketQuote(
  symbol: string,
  fetcher: typeof fetch = fetch,
): Promise<MarketQuote> {
  try {
    return await getCoinGeckoQuote(symbol, fetcher);
  } catch (primaryError) {
    try {
      return await getCoinMarketCapQuote(symbol, fetcher);
    } catch {
      throw primaryError instanceof Error ? primaryError : new Error("market_quote_failed");
    }
  }
}
