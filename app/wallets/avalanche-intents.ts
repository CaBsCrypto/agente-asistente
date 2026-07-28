export type AvalancheChatIntent =
  | { operation: "activate" }
  | { operation: "status" }
  | { operation: "fund" }
  | { operation: "send"; amount: "0.001"; destination: `0x${string}` };

const EVM_ADDRESS = /0x[a-fA-F0-9]{40}/;

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

