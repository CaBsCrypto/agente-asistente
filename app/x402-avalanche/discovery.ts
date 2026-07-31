import { AVALANCHE_X402 } from "./config";

type GaslessToken = {
  symbol?: unknown;
  address?: unknown;
  decimals?: unknown;
  settlement?: unknown;
  approveRequired?: unknown;
  eip712Domain?: {
    name?: unknown;
    version?: unknown;
  };
};

type GaslessChain = {
  network?: unknown;
  chainId?: unknown;
  isTestnet?: unknown;
  tokens?: GaslessToken[];
};

type GaslessTokensResponse = {
  service?: unknown;
  chains?: GaslessChain[];
};

export type AvalancheX402Discovery = {
  ready: boolean;
  facilitatorUrl: string;
  evidence: {
    provider: "0xgasless";
    discoveryEndpoint: "/tokens";
    protocolVersion: 2;
    scheme: "exact";
    network: "eip155:43113";
    chainId: 43113;
    tokenAddress: string;
    tokenDecimals: 6;
    settlement: "eip3009";
    approveRequired: false;
    gasSponsored: true;
    eip712Domain: {
      name: "USD Coin";
      version: "2";
    };
  } | null;
  blockers: string[];
};

export function validateAvalancheX402Supported(payload: unknown): AvalancheX402Discovery {
  const response = payload && typeof payload === "object"
    ? payload as GaslessTokensResponse
    : {};
  const chains = Array.isArray(response.chains)
    ? response.chains
    : [];
  const chain = chains.find((candidate) =>
    candidate.network === "avalanche-fuji" &&
    candidate.chainId === AVALANCHE_X402.chainId &&
    candidate.isTestnet === true
  );
  const tokens = chain?.tokens;
  const token = Array.isArray(tokens)
    ? tokens.find((candidate) =>
      candidate.symbol === AVALANCHE_X402.asset.symbol &&
      typeof candidate.address === "string" &&
      candidate.address.toLowerCase() === AVALANCHE_X402.asset.address.toLowerCase() &&
      candidate.decimals === AVALANCHE_X402.asset.decimals
    )
    : undefined;
  const blockers: string[] = [];
  if (response.service !== "x402-facilitator") {
    blockers.push("facilitator_identity_mismatch");
  }
  if (!chain) blockers.push("facilitator_missing_fuji");
  if (chain && !token) blockers.push("facilitator_missing_fuji_usdc");
  if (token && token.settlement !== "eip3009") {
    blockers.push("facilitator_missing_fuji_usdc_eip3009");
  }
  if (token && token.approveRequired !== false) {
    blockers.push("facilitator_requires_token_approval");
  }
  if (
    token &&
    (
      token.eip712Domain?.name !== AVALANCHE_X402.asset.eip712Name ||
      token.eip712Domain.version !== AVALANCHE_X402.asset.eip712Version
    )
  ) {
    blockers.push("facilitator_eip712_domain_mismatch");
  }
  return {
    ready: blockers.length === 0,
    facilitatorUrl: AVALANCHE_X402.facilitatorUrl,
    evidence: blockers.length === 0 ? {
      provider: "0xgasless",
      discoveryEndpoint: "/tokens",
      protocolVersion: 2,
      scheme: "exact",
      network: "eip155:43113",
      chainId: 43113,
      tokenAddress: AVALANCHE_X402.asset.address,
      tokenDecimals: 6,
      settlement: "eip3009",
      approveRequired: false,
      gasSponsored: true,
      eip712Domain: {
        name: "USD Coin",
        version: "2",
      },
    } : null,
    blockers,
  };
}

export async function discoverAvalancheX402(
  fetcher: typeof fetch = fetch,
): Promise<AvalancheX402Discovery> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetcher(`${AVALANCHE_X402.facilitatorUrl}/tokens`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      return {
        ready: false,
        facilitatorUrl: AVALANCHE_X402.facilitatorUrl,
        evidence: null,
        blockers: [`facilitator_http_${response.status}`],
      };
    }
    return validateAvalancheX402Supported(await response.json());
  } catch {
    return {
      ready: false,
      facilitatorUrl: AVALANCHE_X402.facilitatorUrl,
      evidence: null,
      blockers: ["facilitator_discovery_failed"],
    };
  } finally {
    clearTimeout(timeout);
  }
}
