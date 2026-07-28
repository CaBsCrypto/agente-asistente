import { AVALANCHE_X402 } from "./config";

type SupportedKind = {
  x402Version?: unknown;
  scheme?: unknown;
  network?: unknown;
  extra?: {
    tokens?: {
      token?: unknown;
      address?: unknown;
      decimals?: unknown;
    }[];
  };
};

export type AvalancheX402Discovery = {
  ready: boolean;
  facilitatorUrl: string;
  evidence: {
    protocolVersion: 2;
    scheme: "exact";
    network: "eip155:43113";
    tokenAddress: string;
    tokenDecimals: 6;
  } | null;
  blockers: string[];
};

export function validateAvalancheX402Supported(payload: unknown): AvalancheX402Discovery {
  const kinds = payload && typeof payload === "object" &&
    Array.isArray((payload as { kinds?: unknown }).kinds)
    ? (payload as { kinds: SupportedKind[] }).kinds
    : [];
  const match = kinds.find((kind) =>
    kind.x402Version === AVALANCHE_X402.protocolVersion &&
    kind.scheme === AVALANCHE_X402.scheme &&
    kind.network === AVALANCHE_X402.network
  );
  const tokens = match?.extra?.tokens;
  const token = Array.isArray(tokens)
    ? tokens.find((candidate) =>
        candidate.token === "usdc" &&
        typeof candidate.address === "string" &&
        candidate.address.toLowerCase() === AVALANCHE_X402.asset.address.toLowerCase() &&
        candidate.decimals === AVALANCHE_X402.asset.decimals
      )
    : undefined;
  const blockers: string[] = [];
  if (!match) blockers.push("facilitator_missing_fuji_v2_exact");
  if (match && !token) blockers.push("facilitator_missing_exact_fuji_usdc");
  return {
    ready: blockers.length === 0,
    facilitatorUrl: AVALANCHE_X402.facilitatorUrl,
    evidence: blockers.length === 0 ? {
      protocolVersion: 2,
      scheme: "exact",
      network: "eip155:43113",
      tokenAddress: AVALANCHE_X402.asset.address,
      tokenDecimals: 6,
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
    const response = await fetcher(`${AVALANCHE_X402.facilitatorUrl}/supported`, {
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
