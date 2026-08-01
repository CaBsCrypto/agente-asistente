export type AvalancheChatIntent =
  | { operation: "activate" }
  | { operation: "status" }
  | { operation: "fund" }
  | { operation: "x402" }
  | { operation: "swap"; amountInAtomic: "100000000000000000" }
  | { operation: "send"; amount: "0.001"; destination: `0x${string}` };

const EVM_ADDRESS = /0x[a-fA-F0-9]{40}/;

const DEMO_SWAP_AMOUNT_IN_ATOMIC = "100000000000000000";

function swapAmountToWei(value: string) {
  const [whole, fraction = ""] = value.replace(",", ".").split(".");
  const padded = (fraction + "000000000000000000").slice(0, 18);
  return (
    BigInt(whole || "0") * BigInt("1000000000000000000") +
    BigInt(padded || "0")
  ).toString();
}

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function parseAvalancheChatIntent(message: string): AvalancheChatIntent | null {
  const query = normalized(message);
  const mentionsAvalanche = ["avalanche", "fuji", "avax"].some((term) =>
    query.includes(term),
  );
  if (!mentionsAvalanche) return null;

  const destination = message.match(EVM_ADDRESS)?.[0] as `0x${string}` | undefined;
  const wantsSend = [
    "send", "transfer", "envia", "enviar", "transfiere", "transferir",
    "mande", "mandar",
  ].some((term) => query.includes(term));
  if (wantsSend && destination) {
    const amount = query.match(/(?:^|\s)(\d+(?:[.,]\d+)?)(?=\s*avax\b)/)?.[1]
      ?.replace(",", ".");
    return amount === "0.001"
      ? { operation: "send", amount: "0.001", destination }
      : null;
  }

  const wantsSwap = [
    "cambia", "swapa", "cambiar", "swap", "change", "convert",
    "trocar", "converter",
  ].some((term) => query.includes(term));
  if (wantsSwap) {
    const amount = query.match(/(?:^|\s)(\d+(?:[.,]\d+)?)(?=\s*avax\b)/)?.[1];
    const amountInAtomic = amount
      ? swapAmountToWei(amount)
      : DEMO_SWAP_AMOUNT_IN_ATOMIC;
    if (amountInAtomic !== DEMO_SWAP_AMOUNT_IN_ATOMIC) return null;
    return { operation: "swap", amountInAtomic };
  }

  // The x402 report is the only paid resource, so it is matched before the
  // funding and status keywords that also mention balances.
  const wantsPaidReport = query.includes("x402") || (
    ["report", "reporte", "relatorio"].some((term) => query.includes(term)) &&
    ["buy", "purchase", "pay", "compra", "comprar", "paga", "pagar", "pague"]
      .some((term) => query.includes(term))
  );
  if (wantsPaidReport) return { operation: "x402" };

  const wantsFunding = [
    "fund", "faucet", "top up", "recarga", "recargar", "fondea", "fondear",
    "saldo de prueba", "recarregue", "recarregar", "adicionar saldo",
  ].some((term) => query.includes(term));
  if (wantsFunding) return { operation: "fund" };

  const wantsActivation = [
    "activate", "enable", "activa", "activar", "habilita", "habilitar",
    "ative", "ativar",
  ].some((term) => query.includes(term));
  if (wantsActivation) return { operation: "activate" };

  const wantsStatus = [
    "wallet", "billetera", "carteira", "address", "direccion", "endereco",
    "balance", "saldo", "status", "estado", "show", "muestra", "mostra",
  ].some((term) => query.includes(term));
  return wantsStatus ? { operation: "status" } : null;
}

