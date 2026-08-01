export type AvalancheKnowledgeIntent = {
  operation: "search";
  query: string;
};

export type AvalancheCapabilitiesIntent = { operation: "capabilities" };

export type DexalotReadIntent =
  | { operation: "pairs" }
  | {
      operation: "quote";
      amount: string;
      assetIn: string;
      assetOut: string;
    };

export type AvalancheEcosystemReadIntent =
  | { operation: "predictions.sector" }
  | { operation: "predictions.markets" }
  | { operation: "aave.market" }
  | { operation: "aave.position"; wallet: string }
  | { operation: "nft.collection"; collection: string }
  | { operation: "nft.holders"; collection: string }
  | { operation: "nft.provenance"; collection: string; tokenId: string }
  | { operation: "nft.venue_status" }
  | { operation: "nft.floor" }
  | { operation: "defillama.yields" }
  | { operation: "lfj.liveness"; amount: string; assetIn: string; assetOut: string };

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function parseAvalancheKnowledgeIntent(
  message: string,
): AvalancheKnowledgeIntent | null {
  const query = normalized(message);
  if (!["avalanche", "fuji", "avax"].some((term) => query.includes(term))) {
    return null;
  }
  if (query.includes("dexalot")) return null;
  const walletOnly = [
    "wallet", "billetera", "carteira", "balance", "saldo", "address",
    "direccion", "endereco", "faucet", "recarga", "fund", "x402",
  ].some((term) => query.includes(term));
  if (walletOnly) return null;
  const asksKnowledge = [
    "search", "find", "research", "docs", "documentation", "how",
    "what", "busca", "buscar", "investiga", "documentacion", "como",
    "que es", "cuales", "proyecto", "protocolo", "aplicacion", "integracion",
    "pesquise", "procure", "documentacao", "projeto", "aplicativo",
  ].some((term) => query.includes(term));
  if (!asksKnowledge) return null;
  return { operation: "search", query: message.trim().slice(0, 200) };
}

export function parseAvalancheCapabilitiesIntent(message: string): AvalancheCapabilitiesIntent | null {
  const query = normalized(message);
  if (!["avalanche", "fuji", "avax"].some((term) => query.includes(term))) return null;
  const asksCapabilities = [
    "what can i do", "what can we do", "what is available", "available features", "capabilities",
    "que puedo hacer", "que podemos hacer", "que tenemos", "funciones disponibles", "capacidades",
    "o que posso fazer", "o que podemos fazer", "o que temos", "funcoes disponiveis",
  ].some((term) => query.includes(term));
  return asksCapabilities ? { operation: "capabilities" } : null;
}
export function parseAvalancheEcosystemReadIntent(
  message: string,
): AvalancheEcosystemReadIntent | null {
  const query = normalized(message);
  if (!["avalanche", "fuji", "avax"].some((term) => query.includes(term))) {
    return null;
  }
  if (query.includes("dexalot")) return null;
  if (query.includes("x402")) return null;
  if (query.includes("wallet") || query.includes("billetera") || query.includes("carteira")) {
    return null;
  }

  const wantsPredictions = [
    "prediccion", "predicciones", "prediction", "predictions", "apuestas",
    "betting", "predicao", "apostas",
  ].some((term) => query.includes(term));
  const wantsAave = query.includes("aave") || query.includes("lending");
  const wantsNft = query.includes("nft");
  const wantsYields = query.includes("yield") || query.includes("yields")
    || query.includes("rendimiento") || query.includes("rentabilidad")
    || query.includes("rendimento");
  const wantsLfj = query.includes("lfj");
  const wantsSector = [
    "sector", "cuanta", "cuanto", "how much", "por cadena", "por rede",
    "quanto", "chain", "tvl", "volume",
  ].some((term) => query.includes(term));

  if (wantsPredictions && wantsSector) return { operation: "predictions.sector" };
  if (wantsPredictions && !wantsSector) return { operation: "predictions.markets" };

  const collection = message.match(/0x[a-fA-F0-9]{40}/)?.[0];
  const tokenId = message.match(/(?:token|id|nft)[\s#]*(\d{1,20})/i)?.[1]
    ?? message.match(/\b(\d{1,20})\b/)?.[1];

  if (wantsNft && query.includes("floor")) return { operation: "nft.floor" };
  if (wantsNft && query.includes("venue") || (wantsNft && query.includes("mercado")
    && query.includes("activo") || wantsNft && query.includes("liveness"))) {
    return { operation: "nft.venue_status" };
  }
  if (wantsNft && collection && tokenId) {
    return { operation: "nft.provenance", collection, tokenId };
  }
  if (wantsNft && collection && query.includes("holder")) {
    return { operation: "nft.holders", collection };
  }
  if (wantsNft && collection) {
    return { operation: "nft.collection", collection };
  }

  if (wantsAave && query.includes("mi") || wantsAave && query.includes("posicion")
    || wantsAave && query.includes("position") || wantsAave && query.includes("deposito")) {
    const wallet = message.match(/0x[a-fA-F0-9]{40}/)?.[0];
    if (wallet) return { operation: "aave.position", wallet };
    return { operation: "aave.market" };
  }
  if (wantsAave) return { operation: "aave.market" };

  if (wantsYields) return { operation: "defillama.yields" };

  if (wantsLfj) {
    const amount = message.match(/(\d+(?:[.,]\d{1,18})?)/)?.[1]?.replace(",", ".");
    const symbols = [...query.matchAll(/\b(avax|usdc|usdt|wavax|alot)\b/g)].map((m) => m[1].toUpperCase());
    if (amount && symbols.length >= 2) {
      return {
        operation: "lfj.liveness",
        amount,
        assetIn: symbols[0],
        assetOut: symbols[1],
      };
    }
    return { operation: "lfj.liveness", amount: "1", assetIn: "AVAX", assetOut: "USDC" };
  }

  return null;
}

export function parseDexalotReadIntent(message: string): DexalotReadIntent | null {
  const query = normalized(message);
  if (!query.includes("dexalot")) return null;
  const quoteMatch = message.match(
    /(\d+(?:[.,]\d{1,18})?)\s*([A-Za-z0-9]{2,10})\s+(?:to|a|para|por)\s+([A-Za-z0-9]{2,10})/i,
  );
  const wantsQuote = [
    "quote", "price", "swap", "trade", "cotiza", "cotizar", "cambia",
    "intercambia", "cote", "cotacao", "troque",
  ].some((term) => query.includes(term));
  if (quoteMatch && wantsQuote) {
    return {
      operation: "quote",
      amount: quoteMatch[1].replace(",", "."),
      assetIn: quoteMatch[2].toUpperCase(),
      assetOut: quoteMatch[3].toUpperCase(),
    };
  }
  return { operation: "pairs" };
}

