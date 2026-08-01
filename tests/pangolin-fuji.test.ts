import assert from "node:assert/strict";
import test from "node:test";
import {
  assertPangolinFujiDeployment,
  getPangolinAvaxToUsdcQuote,
} from "../app/connectors/pangolin-fuji";

const FACTORY = "0xe4a575550c2b460d2307b82dcd7afe84ad1484dd";
const WAVAX = "0xd00ae08403b9bbb9124bb305c09058e32c39a48c";
const USDC = "0x5425890298aed601595a70AB815c96711a31Bc65";
const PAIR = "0x8aa1d713454bd21d10c9d25d717c59ad75406888";

const CHAIN_ID = "0xa869";
const BLOCK_NUMBER = "0x10";

const SELECTOR_FACTORY = "0xc45a0155";
const SELECTOR_GET_PAIR = "0xe6a43905";
const SELECTOR_GET_AMOUNTS_OUT = "0xd06ca61f";

const ADDRESS_PADDING = "000000000000000000000000";

function padAddress(address: string) {
  return `0x${ADDRESS_PADDING}${address.replace(/^0x/, "").toLowerCase()}`;
}

function padWord(value: bigint) {
  return value.toString(16).padStart(64, "0");
}

function encodeUint256Array(amounts: readonly bigint[]) {
  const offset = padWord(BigInt(32));
  const length = padWord(BigInt(amounts.length));
  return `0x${offset}${length}${amounts.map(padWord).join("")}`;
}

type Scenario = {
  factory?: string;
  getPair?: string;
  amountsOut?: readonly bigint[];
  amountsOutError?: { code: number; message: string };
};

function quoteFetcher(scenario: Scenario = {}): typeof fetch {
  return async (_input, init) => {
    const request = JSON.parse(String(init?.body)) as {
      id: number;
      method: string;
      params?: unknown[];
    };
    let result: unknown;
    switch (request.method) {
      case "eth_chainId":
        result = CHAIN_ID;
        break;
      case "eth_blockNumber":
        result = BLOCK_NUMBER;
        break;
      case "eth_call": {
        const [call] = request.params as [{ to: string; data: string }, string];
        const data = call?.data ?? "";
        if (data.startsWith(SELECTOR_FACTORY)) {
          result = padAddress(scenario.factory ?? FACTORY);
        } else if (data.startsWith(SELECTOR_GET_PAIR)) {
          result = padAddress(scenario.getPair ?? PAIR);
        } else if (data.startsWith(SELECTOR_GET_AMOUNTS_OUT)) {
          if (scenario.amountsOutError) {
            return Response.json({
              jsonrpc: "2.0",
              id: request.id,
              error: scenario.amountsOutError,
            });
          }
          result = encodeUint256Array(
            scenario.amountsOut ?? [
              BigInt("100000000000000000"),
              BigInt("1108280"),
            ],
          );
        }
        break;
      }
    }
    return Response.json({ jsonrpc: "2.0", id: request.id, result });
  };
}

function assertClose(actual: string, expected: number, epsilon: number, label: string) {
  const numeric = Number(actual);
  assert.ok(
    Number.isFinite(numeric) && Math.abs(numeric - expected) < epsilon,
    `${label}: expected ~${expected} (within ${epsilon}), got ${actual}`,
  );
}

test("quotes 0.1 AVAX into Circle USDC against the verified Fuji pair", async () => {
  const quote = await getPangolinAvaxToUsdcQuote(
    "100000000000000000",
    quoteFetcher(),
  );
  assert.equal(quote.amountInAtomic, "100000000000000000");
  assertClose(quote.amountIn, 0.1, 1e-9, "amountIn");
  assert.equal(quote.amountOutAtomic, "1108280");
  assertClose(quote.amountOut, 1.10828, 1e-6, "amountOut");
  assert.equal(quote.path[0].toLowerCase(), WAVAX.toLowerCase());
  assert.equal(quote.path[1].toLowerCase(), USDC.toLowerCase());
  assert.equal(quote.blockNumber, Number(BigInt(BLOCK_NUMBER)));
  assertClose(quote.priceUsdcPerAvax, 11.0828, 0.001, "priceUsdcPerAvax");
});

test("assertPangolinFujiDeployment pins the verified Fuji factory and pair", async () => {
  const deployment = await assertPangolinFujiDeployment(quoteFetcher());
  assert.equal(deployment.factory, FACTORY.toLowerCase());
  assert.equal(deployment.pair, PAIR.toLowerCase());
  assert.equal(deployment.blockNumber, Number(BigInt(BLOCK_NUMBER)));
});

test("rejects malformed and zero amounts", async () => {
  const fetcher = quoteFetcher();
  await assert.rejects(getPangolinAvaxToUsdcQuote("abc", fetcher));
  await assert.rejects(getPangolinAvaxToUsdcQuote("0", fetcher));
});

test("rejects a factory that does not match the verified Fuji deployment", async () => {
  const rogueFactory = `0x${"e".repeat(40)}`;
  await assert.rejects(
    getPangolinAvaxToUsdcQuote(
      "100000000000000000",
      quoteFetcher({ factory: rogueFactory }),
    ),
    /pangolin_fuji_deployment_mismatch/,
  );
});

test("rejects a quote above the USDC sanity cap", async () => {
  await assert.rejects(
    getPangolinAvaxToUsdcQuote(
      "100000000000000000",
      quoteFetcher({
        amountsOut: [
          BigInt("100000000000000000"),
          BigInt("150000000"),
        ],
      }),
    ),
    /pangolin_fuji_quote_too_large/,
  );
});

test("propagates a reverted getAmountsOut RPC error", async () => {
  await assert.rejects(
    getPangolinAvaxToUsdcQuote(
      "100000000000000000",
      quoteFetcher({
        amountsOutError: { code: -32000, message: "execution reverted" },
      }),
    ),
  );
});
