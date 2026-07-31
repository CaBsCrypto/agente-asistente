import { z } from "zod";

export const DEXALOT_TESTNET_API = "https://api.dexalot-test.com" as const;
export const DEXALOT_TESTNET_CHAIN_ID = 43113 as const;
export const DEXALOT_TIMEOUT_MS = 10_000;
export const DEXALOT_MAX_RESPONSE_BYTES = 128 * 1024;
export const DEXALOT_DOCS_URL =
  "https://docs.dexalot.com/en/apiv2/RestApi.html" as const;

const symbolSchema = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,10}$/);
const amountSchema = z.string().trim().regex(/^\d+(?:\.\d{1,18})?$/).refine(
  (value) => Number(value) > 0 && Number.isFinite(Number(value)),
  "dexalot_amount_invalid",
);

const pairSchema = z.object({
  env: z.string(),
  pair: z.string(),
  base: symbolSchema,
  quote: symbolSchema,
  basedisplaydecimals: z.number().int().nonnegative(),
  quotedisplaydecimals: z.number().int().nonnegative(),
  baseaddress: z.string(),
  quoteaddress: z.string(),
  mintrade_amnt: z.string(),
  maxtrade_amnt: z.string(),
  allowswap: z.boolean(),
  auctionmode: z.number().int(),
  status: z.string(),
  maker_rate_bps: z.number().nonnegative(),
  taker_rate_bps: z.number().nonnegative(),
  allowed_slippage_pct: z.number().nonnegative(),
}).passthrough();

const pairsSchema = z.array(pairSchema).max(200);
const quoteSchema = z.object({
  success: z.literal(true),
  pair: z.string(),
  side: z.union([z.literal(0), z.literal(1)]),
  price: z.string(),
  baseAmount: z.string(),
  quoteAmount: z.string(),
}).passthrough();

export type DexalotPair = z.infer<typeof pairSchema>;

async function readBoundedJson(response: Response) {
  if (!response.ok) throw new Error(`dexalot_http_${response.status}`);
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error("dexalot_content_type_invalid");
  }
  const length = Number(response.headers.get("content-length"));
  if (Number.isFinite(length) && length > DEXALOT_MAX_RESPONSE_BYTES) {
    throw new Error("dexalot_response_too_large");
  }
  if (!response.body) throw new Error("dexalot_response_empty");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > DEXALOT_MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("dexalot_response_too_large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new Error("dexalot_json_invalid");
  }
}

async function dexalotGet(
  path: string,
  fetcher: typeof fetch,
  signal: AbortSignal,
) {
  let response: Response;
  try {
    response = await fetcher(new URL(path, DEXALOT_TESTNET_API), {
      method: "GET",
      headers: { accept: "application/json" },
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      signal,
    });
  } catch (error) {
    if (error instanceof Error && (
      error.name === "TimeoutError" || error.name === "AbortError"
    )) {
      throw new Error("dexalot_timeout");
    }
    throw new Error("dexalot_unreachable");
  }
  return readBoundedJson(response);
}

export async function listDexalotTestnetPairs(
  fetcher: typeof fetch = fetch,
  signal: AbortSignal = AbortSignal.timeout(DEXALOT_TIMEOUT_MS),
) {
  const parsed = pairsSchema.safeParse(await dexalotGet(
    "/privapi/trading/pairs",
    fetcher,
    signal,
  ));
  if (!parsed.success) throw new Error("dexalot_pairs_invalid");
  return {
    network: "Dexalot Testnet" as const,
    chainId: DEXALOT_TESTNET_CHAIN_ID,
    pairs: parsed.data.filter((pair) => pair.status === "deployed"),
    source: DEXALOT_DOCS_URL,
    readOnly: true as const,
  };
}

export async function getDexalotTestnetQuote(input: {
  amount: string;
  assetIn: string;
  assetOut: string;
}, fetcher: typeof fetch = fetch) {
  const amount = amountSchema.parse(input.amount);
  const assetIn = symbolSchema.parse(input.assetIn);
  const assetOut = symbolSchema.parse(input.assetOut);
  if (assetIn === assetOut) throw new Error("dexalot_pair_invalid");

  const signal = AbortSignal.timeout(DEXALOT_TIMEOUT_MS);
  const catalog = await listDexalotTestnetPairs(fetcher, signal);
  const direct = catalog.pairs.find(
    (pair) => pair.base === assetIn && pair.quote === assetOut,
  );
  const inverse = catalog.pairs.find(
    (pair) => pair.base === assetOut && pair.quote === assetIn,
  );
  const pair = direct ?? inverse;
  if (!pair || !pair.allowswap) throw new Error("dexalot_pair_unavailable");

  const side = direct ? 1 : 0;
  const isbase = direct ? 1 : 0;
  const query = new URLSearchParams({
    chainid: String(DEXALOT_TESTNET_CHAIN_ID),
    pair: pair.pair,
    amount,
    side: String(side),
    isbase: String(isbase),
  });
  const parsed = quoteSchema.safeParse(await dexalotGet(
    `/api/rfq/pairprice?${query.toString()}`,
    fetcher,
    signal,
  ));
  if (!parsed.success) throw new Error("dexalot_quote_invalid");
  const quote = parsed.data;
  return {
    network: "Avalanche Fuji / Dexalot Testnet" as const,
    chainId: DEXALOT_TESTNET_CHAIN_ID,
    pair: pair.pair,
    assetIn,
    assetOut,
    amountIn: direct ? quote.baseAmount : quote.quoteAmount,
    amountOut: direct ? quote.quoteAmount : quote.baseAmount,
    price: quote.price,
    makerFeeBps: pair.maker_rate_bps,
    takerFeeBps: pair.taker_rate_bps,
    allowedSlippagePct: pair.allowed_slippage_pct,
    source: DEXALOT_DOCS_URL,
    readOnly: true as const,
    firm: false as const,
  };
}

