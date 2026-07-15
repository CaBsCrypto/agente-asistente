import { STELLAR_TESTNET_CAIP2, USDC_TESTNET_ADDRESS } from "@x402/stellar";

export const X402_TESTNET_RESOURCE =
  "https://stellar.org/x402-demo/api/protected/testnet";

export const X402_TESTNET_USDC = {
  code: "USDC",
  network: STELLAR_TESTNET_CAIP2,
  issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
  contract: USDC_TESTNET_ADDRESS,
  decimals: 7,
  faucetUrl: "https://faucet.circle.com/",
} as const;

export const X402_DEMO_LIMIT_ATOMIC = BigInt("100000");
export const X402_DEMO_LIMIT_DISPLAY = "0.0100000";

export function atomicToDisplay(amount: string, decimals = 7) {
  if (!/^\d+$/.test(amount)) throw new Error("invalid_atomic_amount");
  const padded = amount.padStart(decimals + 1, "0");
  return `${padded.slice(0, -decimals)}.${padded.slice(-decimals)}`;
}

export function isOfficialX402TestnetUsdc(input: {
  network: string;
  asset: string;
}) {
  return (
    input.network === X402_TESTNET_USDC.network &&
    input.asset === X402_TESTNET_USDC.contract
  );
}
