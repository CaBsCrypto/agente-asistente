export type CctpBridgeIntent =
  | { operation: "readiness" }
  | {
      operation: "plan";
      amount: string;
      source: "avalanche:fuji";
      destination: "stellar:testnet";
    }
  | { operation: "unsupported_route"; source: string; destination: string };

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function mentionedChain(query: string, aliases: string[]) {
  return aliases.some((alias) => query.includes(alias));
}

export function parseCctpBridgeIntent(message: string): CctpBridgeIntent | null {
  const query = normalized(message);
  const asksBridge = [
    "bridge", "puente", "puentear", "cruzar", "cross-chain", "crosschain",
    "transferir entre redes", "mover entre redes", "ponte",
  ].some((term) => query.includes(term));
  if (!asksBridge && !query.includes("cctp")) return null;

  const avalanche = mentionedChain(query, ["avalanche", "fuji", "avax"]);
  const stellar = mentionedChain(query, ["stellar", "xlm"]);
  const base = mentionedChain(query, ["base", "sepolia"]);
  const solana = mentionedChain(query, ["solana", "sol"]);
  const chains = [
    avalanche ? "avalanche:fuji" : null,
    stellar ? "stellar:testnet" : null,
    base ? "base:sepolia" : null,
    solana ? "solana:devnet" : null,
  ].filter((value): value is string => Boolean(value));

  const amountMatch = message.match(/(\d+(?:[.,]\d{1,6})?)\s*USDC\b/i);
  if (!amountMatch || chains.length < 2) return { operation: "readiness" };

  const avalancheIndex = Math.min(
    ...["avalanche", "fuji", "avax"]
      .map((alias) => query.indexOf(alias))
      .filter((index) => index >= 0),
  );
  const stellarIndex = Math.min(
    ...["stellar", "xlm"]
      .map((alias) => query.indexOf(alias))
      .filter((index) => index >= 0),
  );
  if (avalanche && stellar && avalancheIndex < stellarIndex) {
    return {
      operation: "plan",
      amount: amountMatch[1].replace(",", "."),
      source: "avalanche:fuji",
      destination: "stellar:testnet",
    };
  }
  return {
    operation: "unsupported_route",
    source: chains[0],
    destination: chains[1],
  };
}
