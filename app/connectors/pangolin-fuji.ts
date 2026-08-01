import { decodeFunctionResult, encodeFunctionData } from "viem";

export const PANGOLIN_FUJI_ROUTER = "0x2D99ABD9008Dc933ff5c0CD271B88309593aB921" as const;
export const PANGOLIN_FUJI_FACTORY = "0xe4a575550c2b460d2307b82dcd7afe84ad1484dd" as const;
export const PANGOLIN_FUJI_WAVAX = "0xd00ae08403b9bbb9124bb305c09058e32c39a48c" as const;
export const PANGOLIN_FUJI_USDC = "0x5425890298aed601595a70AB815c96711a31Bc65" as const;
export const PANGOLIN_FUJI_PAIR = "0x8aa1d713454bd21d10c9d25d717c59ad75406888" as const;
export const FUJI_RPC_URL = "https://api.avax-test.network/ext/bc/C/rpc" as const;
export const FUJI_CHAIN_ID = 43113 as const;
export const PANGOLIN_FUJI_TIMEOUT_MS = 10_000;
export const PANGOLIN_FUJI_QUOTE_MAX_OUT_ATOMIC = BigInt("100000000");

const factoryAbi = [{
  type: "function",
  name: "factory",
  stateMutability: "view",
  inputs: [],
  outputs: [{ name: "", type: "address" }],
}] as const;

const getPairAbi = [{
  type: "function",
  name: "getPair",
  stateMutability: "view",
  inputs: [
    { name: "tokenA", type: "address" },
    { name: "tokenB", type: "address" },
  ],
  outputs: [{ name: "", type: "address" }],
}] as const;

const getAmountsOutAbi = [{
  type: "function",
  name: "getAmountsOut",
  stateMutability: "view",
  inputs: [
    { name: "amountIn", type: "uint256" },
    { name: "path", type: "address[]" },
  ],
  outputs: [{ name: "amounts", type: "uint256[]" }],
}] as const;

async function rpc<T>(
  method: string,
  params: unknown[],
  fetcher: typeof fetch,
  signal: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetcher(FUJI_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      signal,
    });
  } catch (error) {
    if (error instanceof Error && (
      error.name === "TimeoutError" || error.name === "AbortError"
    )) {
      throw new Error("pangolin_rpc_timeout");
    }
    throw new Error("pangolin_rpc_unreachable");
  }
  if (!response.ok) throw new Error(`pangolin_rpc_http_${response.status}`);
  const payload = await response.json() as {
    result?: T;
    error?: { code: number; message: string };
  };
  if (payload.error) throw new Error(`pangolin_rpc_failed:${payload.error.message}`);
  if (payload.result === undefined) throw new Error("pangolin_rpc_result_invalid");
  return payload.result;
}

function rpcRead(
  to: string,
  calldata: string,
  fetcher: typeof fetch,
  signal: AbortSignal,
) {
  return rpc<`0x${string}`>("eth_call", [{ to, data: calldata }, "latest"], fetcher, signal);
}

function rpcBlockNumber(fetcher: typeof fetch, signal: AbortSignal) {
  return rpc<string>("eth_blockNumber", [], fetcher, signal);
}

// BigInt literals (1n) are unavailable at the repo's ES2017 tsconfig target.
const ZERO = BigInt(0);
const ETH_DECIMALS = BigInt(18);
const USDC_DECIMALS = BigInt(6);
const USDC_SCALE = BigInt("1000000");
const PRICE_NUMERATOR_SCALE = BigInt("1000000000000000000");

function formatUnits(value: bigint, decimals: number) {
  const divisor = BigInt(10) ** BigInt(decimals);
  const whole = value / divisor;
  const fraction = (value % divisor)
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function formatPrice(amountOutAtomic: bigint, amountInAtomic: bigint) {
  const scaled = (amountOutAtomic * PRICE_NUMERATOR_SCALE) / amountInAtomic;
  const whole = scaled / USDC_SCALE;
  const fraction = scaled % USDC_SCALE;
  const fractionText = fraction.toString().padStart(6, "0").replace(/0+$/, "");
  return fractionText ? `${whole}.${fractionText}` : whole.toString();
}

export type PangolinAvaxToUsdcQuote = {
  amountInAtomic: string;
  amountIn: string;
  amountOutAtomic: string;
  amountOut: string;
  path: readonly [`0x${string}`, `0x${string}`];
  blockNumber: number;
  priceUsdcPerAvax: string;
};

export async function assertPangolinFujiDeployment(
  fetcher: typeof fetch = fetch,
): Promise<{ factory: string; pair: string; blockNumber: number }> {
  const signal = AbortSignal.timeout(PANGOLIN_FUJI_TIMEOUT_MS);
  const factoryCalldata = encodeFunctionData({
    abi: factoryAbi,
    functionName: "factory",
    args: [],
  });
  const getPairCalldata = encodeFunctionData({
    abi: getPairAbi,
    functionName: "getPair",
    args: [PANGOLIN_FUJI_WAVAX, PANGOLIN_FUJI_USDC],
  });
  const [factoryHex, pairHex, blockHex] = await Promise.all([
    rpcRead(PANGOLIN_FUJI_ROUTER, factoryCalldata, fetcher, signal),
    rpcRead(PANGOLIN_FUJI_FACTORY, getPairCalldata, fetcher, signal),
    rpcBlockNumber(fetcher, signal),
  ]);
  const factory = decodeFunctionResult({
    abi: factoryAbi,
    functionName: "factory",
    data: factoryHex,
  }).toLowerCase();
  const pair = decodeFunctionResult({
    abi: getPairAbi,
    functionName: "getPair",
    data: pairHex,
  }).toLowerCase();
  if (factory !== PANGOLIN_FUJI_FACTORY.toLowerCase()) {
    throw new Error("pangolin_fuji_deployment_mismatch");
  }
  if (pair !== PANGOLIN_FUJI_PAIR.toLowerCase()) {
    throw new Error("pangolin_fuji_deployment_mismatch");
  }
  return {
    factory,
    pair,
    blockNumber: Number(BigInt(blockHex)),
  };
}

export async function getPangolinAvaxToUsdcQuote(
  amountInAtomic: string,
  fetcher: typeof fetch = fetch,
): Promise<PangolinAvaxToUsdcQuote> {
  if (!/^[0-9]+$/.test(amountInAtomic)) throw new Error("invalid_avax_amount");
  const amountIn = BigInt(amountInAtomic);
  if (amountIn <= ZERO) throw new Error("invalid_avax_amount");
  await assertPangolinFujiDeployment(fetcher);
  const signal = AbortSignal.timeout(PANGOLIN_FUJI_TIMEOUT_MS);
  const amountsOutCalldata = encodeFunctionData({
    abi: getAmountsOutAbi,
    functionName: "getAmountsOut",
    args: [amountIn, [PANGOLIN_FUJI_WAVAX, PANGOLIN_FUJI_USDC]],
  });
  const [amountsHex, blockHex] = await Promise.all([
    rpcRead(PANGOLIN_FUJI_ROUTER, amountsOutCalldata, fetcher, signal),
    rpcBlockNumber(fetcher, signal),
  ]);
  const amounts = decodeFunctionResult({
    abi: getAmountsOutAbi,
    functionName: "getAmountsOut",
    data: amountsHex,
  });
  if (amounts.length !== 2 || amounts[0] !== amountIn) {
    throw new Error("pangolin_fuji_quote_invalid");
  }
  const amountOutAtomic = amounts[1];
  if (amountOutAtomic >= PANGOLIN_FUJI_QUOTE_MAX_OUT_ATOMIC) {
    throw new Error("pangolin_fuji_quote_too_large");
  }
  return {
    amountInAtomic: amountIn.toString(),
    amountIn: formatUnits(amountIn, Number(ETH_DECIMALS)),
    amountOutAtomic: amountOutAtomic.toString(),
    amountOut: formatUnits(amountOutAtomic, Number(USDC_DECIMALS)),
    path: [PANGOLIN_FUJI_WAVAX, PANGOLIN_FUJI_USDC],
    blockNumber: Number(BigInt(blockHex)),
    priceUsdcPerAvax: formatPrice(amountOutAtomic, amountIn),
  };
}
