import { z } from "zod";

const API_BASE_URL = "https://api.soroswap.finance";
const MAX_TESTNET_AMOUNT = 100;
const DEFAULT_SLIPPAGE_BPS = 50;

export const SOROSWAP_TESTNET = {
  network: "testnet" as const,
  explorerUrl: "https://stellar.expert/explorer/testnet",
  assets: {
    XLM: {
      code: "XLM" as const,
      contract: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
      decimals: 7,
    },
    USDC: {
      code: "USDC" as const,
      contract: "CBBHRKEP5M3NUDRISGLJKGHDHX3DA2CN2AZBQY6WLVUJ7VNLGSKBDUCM",
      decimals: 7,
    },
  },
};

export type SoroswapAsset = keyof typeof SOROSWAP_TESTNET.assets;

const healthResponseSchema = z.object({
  status: z.object({
    indexer: z.object({
      testnet: z.array(z.string()),
    }),
    reachable: z.boolean(),
  }),
});

const quoteResponseSchema = z
  .object({
    assetIn: z.string().regex(/^C[A-Z2-7]{55}$/),
    assetOut: z.string().regex(/^C[A-Z2-7]{55}$/),
    amountIn: z.union([z.string(), z.number()]).transform(String),
    amountOut: z.union([z.string(), z.number()]).transform(String),
    otherAmountThreshold: z.union([z.string(), z.number()]).transform(String),
    tradeType: z.literal("EXACT_IN"),
    priceImpactPct: z.union([z.string(), z.number()]).transform(String),
    platform: z.enum(["router", "aggregator", "sdex"]),
    routePlan: z
      .array(
        z.object({
          swapInfo: z.object({
            protocol: z.string(),
            path: z.array(z.string()),
          }),
          percent: z.union([z.string(), z.number()]).transform(String),
        }),
      )
      .optional()
      .default([]),
  })
  .passthrough();

const buildResponseSchema = z.object({
  xdr: z.string().trim().min(40).max(100_000),
});

const sendResponseSchema = z
  .object({
    hash: z.string().optional(),
    txHash: z.string().optional(),
    status: z.string().optional(),
  })
  .passthrough();

function apiKey() {
  const key = process.env.SOROSWAP_API_KEY?.trim();
  if (!key) throw new Error("soroswap_not_configured");
  return key;
}

function normalizeAmount(value: string) {
  const match = value.trim().match(/^(\d+)(?:\.(\d{1,7}))?$/);
  if (!match) throw new Error("invalid_soroswap_amount");
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0 || numeric > MAX_TESTNET_AMOUNT) {
    throw new Error("soroswap_amount_out_of_bounds");
  }
  return match[1] + "." + (match[2] ?? "").padEnd(7, "0");
}

export function soroswapAmountToAtomic(value: string) {
  const normalized = normalizeAmount(value);
  const [whole, fraction] = normalized.split(".");
  return (BigInt(whole) * BigInt(10_000_000) + BigInt(fraction)).toString();
}

export function soroswapAtomicToAmount(value: string) {
  if (!/^\d+$/.test(value)) throw new Error("invalid_soroswap_atomic_amount");
  const atomic = BigInt(value);
  const whole = atomic / BigInt(10_000_000);
  const fraction = (atomic % BigInt(10_000_000))
    .toString()
    .padStart(7, "0")
    .replace(/0+$/, "");
  return fraction ? whole.toString() + "." + fraction : whole.toString();
}

async function soroswapRequest(
  path: "/quote" | "/quote/build" | "/send",
  body: unknown,
  fetcher: typeof fetch = fetch,
) {
  const response = await fetcher(API_BASE_URL + path + "?network=testnet", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("soroswap_auth_failed");
    }
    if (response.status === 429) throw new Error("soroswap_rate_limited");
    if (response.status === 400) throw new Error("soroswap_route_unavailable");
    throw new Error("soroswap_upstream_failed");
  }
  return response.json() as Promise<unknown>;
}

export async function getSoroswapHealth(fetcher: typeof fetch = fetch) {
  const response = await fetcher(API_BASE_URL + "/health", {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error("soroswap_health_unavailable");
  const result = healthResponseSchema.parse(await response.json());
  const protocols = result.status.indexer.testnet;
  return {
    reachable: result.status.reachable,
    network: SOROSWAP_TESTNET.network,
    protocols,
    available: result.status.reachable && protocols.length > 0,
  };
}

export async function getSoroswapQuote(
  input: {
    assetIn: SoroswapAsset;
    assetOut: SoroswapAsset;
    amount: string;
    slippageBps?: number;
  },
  fetcher: typeof fetch = fetch,
) {
  if (input.assetIn === input.assetOut) throw new Error("soroswap_assets_must_differ");
  const slippageBps = input.slippageBps ?? DEFAULT_SLIPPAGE_BPS;
  if (!Number.isInteger(slippageBps) || slippageBps < 1 || slippageBps > 500) {
    throw new Error("invalid_soroswap_slippage");
  }
  const assetIn = SOROSWAP_TESTNET.assets[input.assetIn];
  const assetOut = SOROSWAP_TESTNET.assets[input.assetOut];
  const raw = quoteResponseSchema.parse(
    await soroswapRequest(
      "/quote",
      {
        assetIn: assetIn.contract,
        assetOut: assetOut.contract,
        amount: soroswapAmountToAtomic(input.amount),
        tradeType: "EXACT_IN",
        protocols: ["soroswap", "aqua"],
        parts: 10,
        maxHops: 2,
        slippageBps,
      },
      fetcher,
    ),
  );
  if (raw.assetIn !== assetIn.contract || raw.assetOut !== assetOut.contract) {
    throw new Error("soroswap_quote_asset_mismatch");
  }
  return {
    network: SOROSWAP_TESTNET.network,
    assetIn: input.assetIn,
    assetOut: input.assetOut,
    amountIn: soroswapAtomicToAmount(raw.amountIn),
    amountOut: soroswapAtomicToAmount(raw.amountOut),
    minimumAmountOut: soroswapAtomicToAmount(raw.otherAmountThreshold),
    priceImpactPct: raw.priceImpactPct,
    platform: raw.platform,
    slippageBps,
    routePlan: raw.routePlan.map((step) => ({
      protocol: step.swapInfo.protocol,
      percent: step.percent,
      path: step.swapInfo.path,
    })),
    raw,
  };
}

export async function buildSoroswapSwap(
  input: {
    quote: Awaited<ReturnType<typeof getSoroswapQuote>>;
    walletAddress: string;
  },
  fetcher: typeof fetch = fetch,
) {
  if (!/^G[A-Z2-7]{55}$/.test(input.walletAddress)) {
    throw new Error("invalid_stellar_wallet");
  }
  const result = buildResponseSchema.parse(
    await soroswapRequest(
      "/quote/build",
      {
        quote: input.quote.raw,
        from: input.walletAddress,
        to: input.walletAddress,
      },
      fetcher,
    ),
  );
  return { xdr: result.xdr };
}

export async function sendSoroswapSwap(
  signedXdr: string,
  fetcher: typeof fetch = fetch,
) {
  if (signedXdr.length < 40 || signedXdr.length > 100_000) {
    throw new Error("invalid_soroswap_signed_xdr");
  }
  const result = sendResponseSchema.parse(
    await soroswapRequest("/send", { xdr: signedXdr }, fetcher),
  );
  const hash = result.hash ?? result.txHash;
  if (!hash) throw new Error("soroswap_missing_transaction_hash");
  return { ...result, hash };
}
