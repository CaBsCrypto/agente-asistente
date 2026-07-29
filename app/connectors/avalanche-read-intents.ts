export type AvalancheKnowledgeIntent = {
  operation: "search";
  query: string;
};

export type DexalotReadIntent =
  | { operation: "pairs" }
  | {
      operation: "quote";
      amount: string;
      assetIn: string;
      assetOut: string;
    };

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

