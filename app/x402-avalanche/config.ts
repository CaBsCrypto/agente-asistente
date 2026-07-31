export const AVALANCHE_X402 = {
  protocolVersion: 2,
  scheme: "exact",
  network: "eip155:43113",
  chainId: 43113,
  facilitatorUrl: "https://x402.0xgasless.com",
  asset: {
    symbol: "USDC",
    address: "0x5425890298aed601595a70AB815c96711a31Bc65",
    decimals: 6,
    eip712Name: "USD Coin",
    eip712Version: "2",
  },
  // BigInt literals are unavailable at the repo's ES2017 tsconfig target.
  maxAmountAtomic: BigInt(1_000_000),
  maxAuthorizationSeconds: 300,
} as const;

export const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;
export const EVM_SIGNATURE = /^0x[a-fA-F0-9]{130}$/;
export const BYTES32 = /^0x[a-fA-F0-9]{64}$/;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function getAvalancheX402LiveConfig(
  env: Record<string, string | undefined> = process.env,
) {
  const payTo = env.AVALANCHE_X402_PAY_TO ?? "";
  const enabled =
    env.AVALANCHE_X402_LIVE_ENABLED === "true" &&
    env.AVALANCHE_X402_ENVIRONMENT === "localhost-fuji" &&
    EVM_ADDRESS.test(payTo) &&
    payTo.toLowerCase() !== ZERO_ADDRESS;
  return {
    enabled,
    payTo: enabled ? payTo.toLowerCase() : null,
    reason: enabled ? null : "avalanche_x402_live_config_required",
  } as const;
}

export function assertAvalancheX402Localhost(url: string) {
  const parsed = new URL(url);
  if (
    parsed.protocol !== "http:" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)
  ) throw new Error("avalanche_x402_localhost_required");
  return parsed;
}

export function getAvalancheX402MerchantDemoConfig(
  env: Record<string, string | undefined> = process.env,
) {
  const payTo = (env.AVALANCHE_X402_MERCHANT_DEMO_PAY_TO ?? "").toLowerCase();
  const baseUrlValue = env.AVALANCHE_X402_MERCHANT_DEMO_BASE_URL ?? "";
  let baseUrl: string | null = null;
  try {
    const parsed = new URL(baseUrlValue);
    const local = parsed.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
    if (
      (parsed.protocol === "https:" || local) &&
      !parsed.username && !parsed.password && !parsed.search && !parsed.hash &&
      ["", "/"].includes(parsed.pathname)
    ) baseUrl = parsed.origin;
  } catch {
    baseUrl = null;
  }
  const enabled = env.AVALANCHE_X402_MERCHANT_DEMO_ENABLED === "true" &&
    EVM_ADDRESS.test(payTo) && payTo !== ZERO_ADDRESS && baseUrl !== null;
  return {
    enabled,
    payTo: enabled ? payTo : null,
    baseUrl: enabled ? baseUrl : null,
    reason: enabled ? null : "avalanche_x402_merchant_demo_config_required",
  } as const;
}
