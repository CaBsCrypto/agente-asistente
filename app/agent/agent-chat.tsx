"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "../language-toggle";

const chatUi = {
  en: { agent: "Your agent", controlled: "Stellar Testnet · policy-controlled", memory: "NEON MEMORY ON", loading: "Loading your conversation...", thinking: "Checking capabilities and safety boundaries", placeholder: "Ask your agent to search Notion, check a connection or prepare an action...", send: "Send", boundary: "The agent can prepare actions. Payments and irreversible operations always require scoped authorization.", context: "LIVE CONTEXT", contextTitle: "Ready to act, within your rules.", identity: "Identity", balance: "Balance", network: "Network", verify: "Verify wallet on-chain", capabilities: "LIVE CAPABILITIES", readOnly: "read only", help: "PERSONAL HELP", notionConnect: "Connect Notion", notionSearch: "Search Notion", firstSearch: "Run first search", price: "XLM price", watchlist: "Watchlist", proof: "Testnet proof", connections: "Connections", notionConnectPrompt: "Connect me to Notion", notionSearchPrompt: "Search my Notion workspace for pending project tasks", pricePrompt: "What is the current XLM price on CoinMarketCap?", watchlistPrompt: "Show my crypto watchlist", proofPrompt: "Start my DeFindex Testnet proof", travalaPrompt: "Connect me to Travala", connectionsPrompt: "What can I connect to?" },
  es: { agent: "Tu agente", controlled: "Stellar Testnet · controlado por políticas", memory: "MEMORIA NEON ACTIVA", loading: "Cargando tu conversación...", thinking: "Revisando capacidades y límites de seguridad", placeholder: "Pide a tu agente buscar en Notion, revisar una conexión o preparar una acción...", send: "Enviar", boundary: "El agente puede preparar acciones. Pagos y operaciones irreversibles siempre requieren autorización específica.", context: "CONTEXTO EN VIVO", contextTitle: "Listo para actuar dentro de tus reglas.", identity: "Identidad", balance: "Saldo", network: "Red", verify: "Verificar wallet on-chain", capabilities: "CAPACIDADES ACTIVAS", readOnly: "solo lectura", help: "AYUDA PERSONAL", notionConnect: "Conectar Notion", notionSearch: "Buscar en Notion", firstSearch: "Primera búsqueda", price: "Precio XLM", watchlist: "Watchlist", proof: "Prueba Testnet", connections: "Conexiones", notionConnectPrompt: "Conéctame con Notion", notionSearchPrompt: "Busca en mi Notion las tareas pendientes", pricePrompt: "¿Cuál es el precio actual de XLM en CoinMarketCap?", watchlistPrompt: "Muéstrame mi watchlist de criptomonedas", proofPrompt: "Inicia mi prueba DeFindex en Testnet", travalaPrompt: "Conéctame con Travala", connectionsPrompt: "¿Qué puedo conectar?" },
  pt: { agent: "Seu agente", controlled: "Stellar Testnet · controlado por políticas", memory: "MEMÓRIA NEON ATIVA", loading: "Carregando sua conversa...", thinking: "Verificando capacidades e limites de segurança", placeholder: "Peça ao agente para pesquisar no Notion, verificar uma conexão ou preparar uma ação...", send: "Enviar", boundary: "O agente pode preparar ações. Pagamentos e operações irreversíveis sempre exigem autorização específica.", context: "CONTEXTO AO VIVO", contextTitle: "Pronto para agir dentro das suas regras.", identity: "Identidade", balance: "Saldo", network: "Rede", verify: "Verificar wallet on-chain", capabilities: "CAPACIDADES ATIVAS", readOnly: "somente leitura", help: "AJUDA PESSOAL", notionConnect: "Conectar Notion", notionSearch: "Pesquisar no Notion", firstSearch: "Primeira pesquisa", price: "Preço do XLM", watchlist: "Watchlist", proof: "Prova Testnet", connections: "Conexões", notionConnectPrompt: "Conecte-me ao Notion", notionSearchPrompt: "Pesquise no meu Notion as tarefas pendentes", pricePrompt: "Qual é o preço atual do XLM no CoinMarketCap?", watchlistPrompt: "Mostre minha watchlist de criptomoedas", proofPrompt: "Inicie minha prova DeFindex na Testnet", travalaPrompt: "Conecte-me à Travala", connectionsPrompt: "O que posso conectar?" },
};

const defindexUi = {
  en: {
    label: "DEFINDEX · STELLAR TESTNET", heading: "Transaction prepared from your conversation, with explicit approval.", close: "Close", reading: "Reading public vaults and your wallet...", xlmVault: "XLM vault", usdcVault: "USDC vault", walletBalance: "Wallet balance", shares: "Vault shares", amount: "Amount", trustline: "Trustline", active: "active", required: "required", simulating: "Simulating...", reviewXlm: "Review XLM deposit", preparing: "Preparing...", reviewTrustline: "Review USDC trustline", reviewUsdc: "Review USDC deposit", exactUsdc: "Trustline ready. The wallet still needs the exact Blend Testnet USDC before a deposit can be simulated.", exactAction: "EXACT ACTION FOR SIGNATURE", asset: "Asset", destination: "Destination", invest: "Auto-invest request", yes: "Yes", no: "No", signing: "Signing and submitting...", confirm: "Confirm and sign with Privy", receipt: "Open transaction receipt", replayed: "This action was already confirmed. The same receipt was returned.", confirmed: "Confirmed on Stellar Testnet. The receipt is now available.", trustlineFirst: "Enable the exact DeFindex USDC trustline first.", statusFailed: "DeFindex status failed", prepareFailed: "DeFindex preparation failed", executeFailed: "DeFindex execution failed",
  },
  es: {
    label: "DEFINDEX · STELLAR TESTNET", heading: "Transacción preparada desde tu conversación, con aprobación explícita.", close: "Cerrar", reading: "Leyendo los vaults públicos y tu wallet...", xlmVault: "Vault XLM", usdcVault: "Vault USDC", walletBalance: "Saldo de la wallet", shares: "Shares del vault", amount: "Monto", trustline: "Trustline", active: "activa", required: "requerida", simulating: "Simulando...", reviewXlm: "Revisar depósito XLM", preparing: "Preparando...", reviewTrustline: "Revisar trustline USDC", reviewUsdc: "Revisar depósito USDC", exactUsdc: "La trustline está lista. La wallet todavía necesita el USDC Testnet exacto de Blend antes de simular un depósito.", exactAction: "ACCIÓN EXACTA PARA FIRMAR", asset: "Activo", destination: "Destino", invest: "Solicitud de autoinversión", yes: "Sí", no: "No", signing: "Firmando y enviando...", confirm: "Confirmar y firmar con Privy", receipt: "Abrir recibo de la transacción", replayed: "Esta acción ya estaba confirmada. Se devolvió el mismo recibo.", confirmed: "Confirmada en Stellar Testnet. El recibo está disponible.", trustlineFirst: "Primero activa la trustline USDC exacta de DeFindex.", statusFailed: "No se pudo leer DeFindex", prepareFailed: "No se pudo preparar la transacción", executeFailed: "No se pudo ejecutar la transacción",
  },
  pt: {
    label: "DEFINDEX · STELLAR TESTNET", heading: "Transação preparada pela conversa, com aprovação explícita.", close: "Fechar", reading: "Lendo os vaults públicos e sua wallet...", xlmVault: "Vault XLM", usdcVault: "Vault USDC", walletBalance: "Saldo da wallet", shares: "Shares do vault", amount: "Valor", trustline: "Trustline", active: "ativa", required: "necessária", simulating: "Simulando...", reviewXlm: "Revisar depósito XLM", preparing: "Preparando...", reviewTrustline: "Revisar trustline USDC", reviewUsdc: "Revisar depósito USDC", exactUsdc: "A trustline está pronta. A wallet ainda precisa do USDC Testnet exato da Blend antes de simular um depósito.", exactAction: "AÇÃO EXATA PARA ASSINAR", asset: "Ativo", destination: "Destino", invest: "Solicitação de autoinvestimento", yes: "Sim", no: "Não", signing: "Assinando e enviando...", confirm: "Confirmar e assinar com Privy", receipt: "Abrir recibo da transação", replayed: "Esta ação já estava confirmada. O mesmo recibo foi retornado.", confirmed: "Confirmada na Stellar Testnet. O recibo está disponível.", trustlineFirst: "Primeiro ative a trustline USDC exata da DeFindex.", statusFailed: "Não foi possível ler a DeFindex", prepareFailed: "Não foi possível preparar a transação", executeFailed: "Não foi possível executar a transação",
  },
};

const x402Ui = {
  en: { label: "X402 · STELLAR TESTNET", heading: "Official demo payment, signed by your Privy wallet.", close: "Close", preparing: "Reading the live HTTP 402 challenge...", exact: "EXACT PAYMENT FOR APPROVAL", asset: "Asset", amount: "Amount", destination: "Recipient", network: "Network", confirm: "Confirm 0.01 USDC with Privy", paying: "Signing auth entry and paying...", receipt: "Open settlement receipt", faucet: "Get Testnet USDC", trustline: "The official x402 USDC trustline or balance is missing. Prepare the wallet, then use the Circle faucet.", confirmed: "The x402 resource was paid and delivered.", replayed: "This payment was already completed; the original receipt was returned." },
  es: { label: "X402 · STELLAR TESTNET", heading: "Pago del demo oficial firmado por tu wallet Privy.", close: "Cerrar", preparing: "Leyendo el desafío HTTP 402 en vivo...", exact: "PAGO EXACTO PARA APROBACIÓN", asset: "Activo", amount: "Monto", destination: "Destinatario", network: "Red", confirm: "Confirmar 0.01 USDC con Privy", paying: "Firmando autorización y pagando...", receipt: "Abrir recibo de liquidación", faucet: "Obtener USDC Testnet", trustline: "Falta la trustline o el saldo del USDC oficial de x402. Prepara la wallet y luego utiliza el faucet de Circle.", confirmed: "El recurso x402 fue pagado y entregado.", replayed: "Este pago ya estaba completado; se devolvió el recibo original." },
  pt: { label: "X402 · STELLAR TESTNET", heading: "Pagamento do demo oficial assinado pela sua wallet Privy.", close: "Fechar", preparing: "Lendo o desafio HTTP 402 ao vivo...", exact: "PAGAMENTO EXATO PARA APROVAÇÃO", asset: "Ativo", amount: "Valor", destination: "Destinatário", network: "Rede", confirm: "Confirmar 0.01 USDC com Privy", paying: "Assinando autorização e pagando...", receipt: "Abrir recibo da liquidação", faucet: "Obter USDC Testnet", trustline: "Falta a trustline ou o saldo do USDC oficial da x402. Prepare a wallet e depois use o faucet da Circle.", confirmed: "O recurso x402 foi pago e entregue.", replayed: "Este pagamento já foi concluído; o recibo original foi retornado." },
};

type X402ChatIntent = { operation: "demo_payment"; requestId: string };
type X402Payment = {
  id: string;
  resourceUrl: string;
  network: string;
  asset: "USDC";
  assetContract: string;
  payTo: string;
  amount: string;
  status: string;
  transactionHash: string | null;
  explorerUrl: string | null;
  resourcePreview: string | null;
  expiresAt: string;
};
type X402TrustlineApproval = {
  id: string;
  status: string;
  transactionHash: string | null;
  explorerUrl: string | null;
  expiresAt: string;
  preview: { title: string; description: string; network: string; asset: string; amount: string; destination: string };
};
type X402Status = {
  x402Usdc: { trustlineActive: boolean; balance: string; faucetUrl: string };
  resource: string;
  recent: X402Payment[];
};
type ChatAction = {
  label: string;
  message?: string;
  href?: string;
  connect?: string;
};

type ExternalConnection = {
  provider: string;
  status: string;
  updatedAt: string;
};


type DefindexChatIntent =
  | { operation: "deposit"; asset: "XLM" | "USDC"; amount: string; requestId: string }
  | { operation: "usdc_trustline"; asset: "USDC"; requestId: string };

type DefindexApproval = {
  id: string;
  action: string;
  asset: "XLM" | "USDC";
  amount: string;
  status: string;
  transactionHash: string | null;
  explorerUrl: string | null;
  expiresAt: string;
  preview: {
    title: string;
    description: string;
    network: string;
    wallet: string;
    asset: string;
    amount: string;
    destination: string;
    invest: boolean;
    slippageBps: number | null;
  };
};

type DefindexStatus = {
  balances: { asset: string; balance: string }[];
  usdcTrustline: { active: boolean; balance: string; issuer: string };
  positions: {
    XLM: { shares: string } | null;
    USDC: { shares: string } | null;
  };
  recent: DefindexApproval[];
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  actions?: ChatAction[];
  connection?: {
    name: string;
    stage: string;
    priority: string;
  };
  defindexIntent?: DefindexChatIntent;
  x402Intent?: X402ChatIntent;
  memoryUpdated?: boolean;
  decision?: {
    outcome: "allowed" | "blocked";
    summary: string;
    reasonCodes: string[];
    appliedRules: string[];
    requiresApproval: boolean;
    actionType: string;
  };

};

function MessageText({ content }: { content: string }) {
  return (
    <>
      {content.split("\n").map((line, lineIndex) => (
        <p key={lineIndex}>
          {line.split("**").map((part, partIndex) =>
            partIndex % 2 ? <strong key={partIndex}>{part}</strong> : part,
          )}
        </p>
      ))}
    </>
  );
}

export default function AgentChat({
  email,
  walletAddress,
  walletBalance,
  getAccessToken,
}: {
  email: string;
  walletAddress: string;
  walletBalance: string;
  getAccessToken: () => Promise<string | null>;
}) {
  const { locale } = useLocale();
  const ui = chatUi[locale];
  const dui = defindexUi[locale];
  const xui = x402Ui[locale];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [liveWalletBalance, setLiveWalletBalance] = useState(walletBalance);
  const [status, setStatus] = useState<"loading" | "ready" | "sending" | "error">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [connections, setConnections] = useState<ExternalConnection[]>([]);
  const [connectionNotice, setConnectionNotice] = useState<string | null>(null);

  const [defindexOpen, setDefindexOpen] = useState(false);
  const [defindexStatus, setDefindexStatus] = useState<DefindexStatus | null>(null);
  const [defindexApproval, setDefindexApproval] = useState<DefindexApproval | null>(null);
  const [defindexBusy, setDefindexBusy] = useState<string | null>(null);
  const [defindexNotice, setDefindexNotice] = useState<string | null>(null);
  const [xlmDepositAmount, setXlmDepositAmount] = useState("1");
  const [usdcDepositAmount, setUsdcDepositAmount] = useState("1");
  const [x402Open, setX402Open] = useState(false);
  const [x402Status, setX402Status] = useState<X402Status | null>(null);
  const [x402Payment, setX402Payment] = useState<X402Payment | null>(null);
  const [x402Trustline, setX402Trustline] = useState<X402TrustlineApproval | null>(null);
  const [x402Busy, setX402Busy] = useState(false);
  const [x402Notice, setX402Notice] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;

    async function loadConversation() {
      try {
        const token = await getAccessToken();
        if (!token) throw new Error("Authentication token unavailable");
        const response = await fetch("/api/agent/chat", {
          headers: { Authorization: "Bearer " + token },
          cache: "no-store",
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Conversation unavailable");
        const connectionsResponse = await fetch("/api/connections", {
          headers: { Authorization: "Bearer " + token },
          cache: "no-store",
        });
        const connectionsBody = await connectionsResponse.json();
        if (active) {
          setMessages(body.messages);
          setConnections(
            connectionsResponse.ok ? connectionsBody.connections ?? [] : [],
          );
          const params = new URLSearchParams(window.location.search);
          if (
            params.get("connection") === "notion" &&
            params.get("status") === "connected"
          ) {
            setConnectionNotice(
              "Notion is connected. You can now ask the agent to use that workspace.",
            );
            window.history.replaceState({}, "", "/agent");
          } else if (params.get("connection") === "notion") {
            setConnectionNotice(
              "Notion was not connected. You can retry when you are ready.",
            );
            window.history.replaceState({}, "", "/agent");
          }
          setStatus("ready");
        }
      } catch (caught) {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Conversation unavailable");
          setStatus("error");
        }
      }
    }

    void loadConversation();
    return () => {
      active = false;
    };
  }, [getAccessToken]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, status]);

  async function sendMessage(content: string) {
    const message = content.trim();
    if (!message || status === "sending") return;

    const optimisticId = "pending-" + (messages.length + 1);
    setMessages((current) => [
      ...current,
      {
        id: optimisticId,
        role: "user",
        content: message,
        createdAt: new Date().toISOString(),
      },
    ]);
    setDraft("");
    setStatus("sending");
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Authentication token unavailable");
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Message failed");
      const assistantMessage = body.assistantMessage as ChatMessage;
      setMessages((current) => [
        ...current.filter((item) => item.id !== optimisticId),
        body.userMessage,
        assistantMessage,
      ]);
      if (assistantMessage.memoryUpdated) {
        window.dispatchEvent(new Event("agent-memory-updated"));
      }
      if (body.wallet) {
        setLiveWalletBalance(body.wallet.balance ?? "0");
      }
      setStatus("ready");
      if (assistantMessage.x402Intent) {
        await prepareX402(assistantMessage.x402Intent.requestId);
      } else if (assistantMessage.defindexIntent) {
        const intent = assistantMessage.defindexIntent;
        if (intent.operation === "deposit") {
          if (intent.asset === "XLM") setXlmDepositAmount(intent.amount);
          else setUsdcDepositAmount(intent.amount);
          await prepareDefindex(
            "deposit",
            intent.asset,
            intent.amount,
            intent.requestId,
          );
        } else {
          await prepareDefindex(
            "usdc_trustline",
            "USDC",
            undefined,
            intent.requestId,
          );
        }
      } else if (message.toLowerCase().includes("defindex")) {
        void loadDefindex();
      }
    } catch (caught) {
      setMessages((current) => current.filter((item) => item.id !== optimisticId));
      setError(caught instanceof Error ? caught.message : "Message failed");
      setDraft(message);
      setStatus("error");
    }
  }

  async function connectProvider(provider: string) {
    if (status === "sending") return;
    setStatus("sending");
    setError(null);
    setConnectionNotice("Opening secure authorization...");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Authentication token unavailable");
      const response = await fetch("/api/connections/" + provider + "/start", {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
      });
      const body = await response.json();
      if (!response.ok || !body.authorizationUrl) {
        throw new Error(body.error ?? "Connection could not start");
      }
      window.location.assign(body.authorizationUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Connection failed");
      setConnectionNotice(null);
      setStatus("error");
    }
  }


  async function x402Fetch(body?: Record<string, unknown>) {
    const token = await getAccessToken();
    if (!token) throw new Error("Authentication token unavailable");
    const response = await fetch("/api/agent/x402", {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: "Bearer " + token,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "x402 request failed");
    return result;
  }

  async function prepareX402(requestId = crypto.randomUUID()) {
    setX402Open(true);
    setX402Busy(true);
    setX402Notice(null);
    setX402Payment(null);
    try {
      const statusResult = await x402Fetch();
      setX402Status(statusResult);
      if (!statusResult.x402Usdc.trustlineActive) {
        const trustlineResult = await x402Fetch({ action: "prepare_trustline", requestId: `${requestId}-trustline` });
        if (!trustlineResult.alreadyComplete) setX402Trustline(trustlineResult.approval);
        return;
      }
      if (Number(statusResult.x402Usdc.balance) < 0.01) {
        setX402Notice(xui.trustline);
        return;
      }
      const result = await x402Fetch({ action: "prepare", requestId });
      setX402Payment(result.payment);
    } catch (caught) {
      setX402Notice(caught instanceof Error ? caught.message : "x402 preparation failed");
    } finally {
      setX402Busy(false);
    }
  }

  async function confirmX402Trustline() {
    if (!x402Trustline) return;
    setX402Busy(true);
    setX402Notice(null);
    try {
      const result = await x402Fetch({ action: "execute_trustline", approvalId: x402Trustline.id, explicitConfirmation: true });
      setX402Trustline(result.approval);
      setX402Status(await x402Fetch());
      setX402Notice(xui.trustline);
    } catch (caught) {
      setX402Notice(caught instanceof Error ? caught.message : "x402 trustline failed");
    } finally {
      setX402Busy(false);
    }
  }
  async function confirmX402() {
    if (!x402Payment) return;
    setX402Busy(true);
    setX402Notice(null);
    try {
      const result = await x402Fetch({ action: "execute", paymentId: x402Payment.id, explicitConfirmation: true });
      setX402Payment(result.payment);
      setX402Notice(result.replayed ? xui.replayed : xui.confirmed);
      setX402Status(await x402Fetch());
    } catch (caught) {
      setX402Notice(caught instanceof Error ? caught.message : "x402 payment failed");
    } finally {
      setX402Busy(false);
    }
  }
  async function defindexFetch(body?: Record<string, unknown>) {
    const token = await getAccessToken();
    if (!token) throw new Error("Authentication token unavailable");
    const response = await fetch("/api/agent/defindex", {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: "Bearer " + token,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "DeFindex request failed");
    return result;
  }

  async function loadDefindex() {
    setDefindexOpen(true);
    setDefindexBusy("status");
    setDefindexNotice(null);
    try {
      const nextStatus = await defindexFetch();
      setDefindexStatus(nextStatus);
      const xlm = nextStatus.balances?.find(
        (balance: { asset: string; balance: string }) => balance.asset === "XLM",
      );
      setLiveWalletBalance(xlm?.balance ?? "0");
    } catch (caught) {
      setDefindexNotice(caught instanceof Error ? caught.message : dui.statusFailed);
    } finally {
      setDefindexBusy(null);
    }
  }

  async function prepareDefindex(
    operation: "usdc_trustline" | "deposit",
    asset?: "XLM" | "USDC",
    amount?: string,
    requestId = crypto.randomUUID(),
  ) {
    setDefindexOpen(true);
    setDefindexBusy(operation + (asset ?? ""));
    setDefindexNotice(null);
    setDefindexApproval(null);
    try {
      const result = await defindexFetch({
        action: "prepare",
        operation,
        ...(asset ? { asset, amount } : {}),
        requestId,
      });
      if (result.alreadyComplete) {
        setDefindexNotice(result.message);
        await loadDefindex();
      } else {
        setDefindexApproval(result.approval);
      }
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : dui.prepareFailed;
      setDefindexNotice(
        code === "usdc_trustline_required"
          ? dui.trustlineFirst
          : code,
      );
      if (code === "usdc_trustline_required") {
        const current = await defindexFetch().catch(() => null);
        if (current) setDefindexStatus(current);
      }
    } finally {
      setDefindexBusy(null);
    }
  }

  async function confirmDefindex() {
    if (!defindexApproval) return;
    setDefindexBusy("execute");
    setDefindexNotice(null);
    try {
      const result = await defindexFetch({
        action: "execute",
        approvalId: defindexApproval.id,
        explicitConfirmation: true,
      });
      setDefindexApproval(result.approval);
      setDefindexNotice(
        result.replayed
          ? dui.replayed
          : dui.confirmed,
      );
      const nextStatus = await defindexFetch();
      setDefindexStatus(nextStatus);
      const xlm = nextStatus.balances?.find(
        (balance: { asset: string; balance: string }) => balance.asset === "XLM",
      );
      setLiveWalletBalance(xlm?.balance ?? "0");
    } catch (caught) {
      setDefindexNotice(
        caught instanceof Error ? caught.message : dui.executeFailed,
      );
    } finally {
      setDefindexBusy(null);
    }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(draft);
  }

  return (
    <section className="agent-chat-layout">
      <div className="agent-chat-panel">
        <header>
          <div>
            <span className="agent-online-dot" />
            <div>
              <strong>{ui.agent}</strong>
              <small>{ui.controlled}</small>
            </div>
          </div>
          <span className="agent-chat-memory">{ui.memory}</span>
        </header>

        {connectionNotice && (
          <div className="agent-connection-notice">
            <span>{connectionNotice}</span>
            {connections.some(
              (connection) =>
                connection.provider === "notion" &&
                connection.status === "active",
            ) && (
              <button
                type="button"
                onClick={() =>
                  void sendMessage(
                    ui.notionSearchPrompt,
                  )
                }
              >
                {ui.firstSearch}
              </button>
            )}
          </div>
        )}

        <div className="agent-chat-thread" aria-live="polite">
          {status === "loading" && (
            <div className="agent-chat-loading">
              <i />
              <span>{ui.loading}</span>
            </div>
          )}

          {messages.map((message) => (
            <article
              className={"agent-message " + message.role}
              key={message.id}
            >
              <div className="agent-message-avatar">
                {message.role === "assistant" ? "AA" : "YOU"}
              </div>
              <div>
                {message.connection && (
                  <span className="agent-connection-state">
                    {message.connection.name} · {message.connection.stage}
                  </span>
                )}
                <div className="agent-message-copy">
                  <MessageText content={message.content} />
                </div>
                {message.decision && (
                  <details className={"agent-decision-explanation " + message.decision.outcome}>
                    <summary>
                      {locale === "es" ? "\u00bfPor qu\u00e9 esta acci\u00f3n?" : locale === "pt" ? "Por que esta a\u00e7\u00e3o?" : "Why this action?"}
                    </summary>
                    <strong>{message.decision.outcome}</strong>
                    <p>{message.decision.summary}</p>
                    <ul>
                      {message.decision.appliedRules.map((rule) => <li key={rule}>{rule}</li>)}
                      {message.decision.reasonCodes.map((reason) => <li key={reason}>{reason}</li>)}
                      {message.decision.requiresApproval && (
                        <li>{locale === "es" ? "Requiere aprobaci\u00f3n expl\u00edcita" : locale === "pt" ? "Requer aprova\u00e7\u00e3o expl\u00edcita" : "Explicit approval required"}</li>
                      )}
                    </ul>
                  </details>
                )}
                {message.actions?.length ? (
                  <div className="agent-message-actions">
                    {message.actions.map((action) =>
                      action.connect ? (
                        <button
                          key={action.label}
                          type="button"
                          className="primary"
                          disabled={status === "sending"}
                          onClick={() => void connectProvider(action.connect!)}
                        >
                          {action.label}
                        </button>
                      ) : action.href ? (
                        <a
                          key={action.label}
                          href={action.href}
                          target={action.href.startsWith("http") ? "_blank" : undefined}
                          rel={action.href.startsWith("http") ? "noreferrer" : undefined}
                        >
                          {action.label}
                        </a>
                      ) : (
                        <button
                          key={action.label}
                          type="button"
                          disabled={status === "sending"}
                          onClick={() => void sendMessage(action.message ?? action.label)}
                        >
                          {action.label}
                        </button>
                      ),
                    )}
                  </div>
                ) : null}
              </div>
            </article>
          ))}
          {status === "sending" && (
            <div className="agent-chat-typing">
              <i /><i /><i />
              <span>{ui.thinking}</span>
            </div>
          )}
          <div ref={endRef} />
        </div>


        {defindexOpen && (
          <section className="defindex-agent-panel" aria-label="DeFindex Testnet actions">
            <header>
              <div>
                <span>{dui.label}</span>
                <h3>{dui.heading}</h3>
              </div>
              <button type="button" onClick={() => setDefindexOpen(false)}>{dui.close}</button>
            </header>
            {defindexBusy === "status" && <p className="defindex-agent-loading">{dui.reading}</p>}
            {defindexStatus && (
              <div className="defindex-agent-grid">
                <article>
                  <strong>{dui.xlmVault}</strong>
                  <span>{dui.walletBalance}: {liveWalletBalance} XLM</span>
                  <span>{dui.shares}: {defindexStatus.positions.XLM?.shares ?? "0"}</span>
                  <label>
                    {dui.amount}
                    <input value={xlmDepositAmount} onChange={(event) => setXlmDepositAmount(event.target.value)} inputMode="decimal" />
                  </label>
                  <button
                    type="button"
                    disabled={Boolean(defindexBusy)}
                    onClick={() => void prepareDefindex("deposit", "XLM", xlmDepositAmount)}
                  >
                    {defindexBusy === "depositXLM" ? dui.simulating : dui.reviewXlm}
                  </button>
                </article>
                <article>
                  <strong>{dui.usdcVault}</strong>
                  <span>{dui.trustline}: {defindexStatus.usdcTrustline.active ? dui.active : dui.required}</span>
                  <span>{dui.walletBalance}: {defindexStatus.usdcTrustline.balance} USDC</span>
                  <span>{dui.shares}: {defindexStatus.positions.USDC?.shares ?? "0"}</span>
                  {!defindexStatus.usdcTrustline.active ? (
                    <button
                      type="button"
                      disabled={Boolean(defindexBusy)}
                      onClick={() => void prepareDefindex("usdc_trustline")}
                    >
                      {defindexBusy === "usdc_trustline" ? dui.preparing : dui.reviewTrustline}
                    </button>
                  ) : (
                    <>
                      <label>
                        {dui.amount}
                        <input value={usdcDepositAmount} onChange={(event) => setUsdcDepositAmount(event.target.value)} inputMode="decimal" />
                      </label>
                      <button
                        type="button"
                        disabled={Boolean(defindexBusy) || Number(defindexStatus.usdcTrustline.balance) <= 0}
                        onClick={() => void prepareDefindex("deposit", "USDC", usdcDepositAmount)}
                      >
                        {defindexBusy === "depositUSDC" ? dui.simulating : dui.reviewUsdc}
                      </button>
                    </>
                  )}
                  {defindexStatus.usdcTrustline.active && Number(defindexStatus.usdcTrustline.balance) <= 0 && (
                    <small>{dui.exactUsdc}</small>
                  )}
                </article>
              </div>
            )}
            {defindexApproval && (
              <div className={"defindex-approval " + defindexApproval.status}>
                <span>{dui.exactAction}</span>
                <h4>{defindexApproval.preview.title}</h4>
                <p>{defindexApproval.preview.description}</p>
                <dl>
                  <div><dt>{ui.network}</dt><dd>{defindexApproval.preview.network}</dd></div>
                  <div><dt>{dui.asset}</dt><dd>{defindexApproval.preview.asset}</dd></div>
                  <div><dt>{dui.amount}</dt><dd>{defindexApproval.preview.amount}</dd></div>
                  <div><dt>{dui.destination}</dt><dd>{defindexApproval.preview.destination}</dd></div>
                  <div><dt>{dui.invest}</dt><dd>{defindexApproval.preview.invest ? dui.yes : dui.no}</dd></div>
                </dl>
                {defindexApproval.status === "prepared" ? (
                  <button type="button" disabled={Boolean(defindexBusy)} onClick={() => void confirmDefindex()}>
                    {defindexBusy === "execute" ? dui.signing : dui.confirm}
                  </button>
                ) : defindexApproval.explorerUrl ? (
                  <a href={defindexApproval.explorerUrl} target="_blank" rel="noreferrer">{dui.receipt}</a>
                ) : null}
              </div>
            )}
            {defindexNotice && <p className="defindex-agent-notice">{defindexNotice}</p>}
          </section>
        )}

        {x402Open && (
          <section className="defindex-agent-panel" aria-label="x402 Stellar Testnet payment">
            <header>
              <div><span>{xui.label}</span><h3>{xui.heading}</h3></div>
              <button type="button" onClick={() => setX402Open(false)}>{xui.close}</button>
            </header>
            {x402Busy && !x402Payment && <p className="defindex-agent-loading">{xui.preparing}</p>}
            {x402Status && (!x402Status.x402Usdc.trustlineActive || Number(x402Status.x402Usdc.balance) < 0.01) && (
              <div className="defindex-agent-notice">
                {xui.trustline} <a href={x402Status.x402Usdc.faucetUrl} target="_blank" rel="noreferrer">{xui.faucet}</a>
              </div>
            )}
            {x402Trustline && (
              <div className={"defindex-approval " + x402Trustline.status}>
                <span>{xui.exact}</span>
                <h4>{x402Trustline.preview.title}</h4>
                <p>{x402Trustline.preview.description}</p>
                <dl>
                  <div><dt>{xui.network}</dt><dd>{x402Trustline.preview.network}</dd></div>
                  <div><dt>{xui.asset}</dt><dd>{x402Trustline.preview.asset}</dd></div>
                  <div><dt>{xui.destination}</dt><dd>{x402Trustline.preview.destination}</dd></div>
                </dl>
                {x402Trustline.status === "prepared" ? (
                  <button type="button" disabled={x402Busy} onClick={() => void confirmX402Trustline()}>{x402Busy ? xui.paying : "Confirm USDC trustline with Privy"}</button>
                ) : x402Trustline.explorerUrl ? (
                  <a href={x402Trustline.explorerUrl} target="_blank" rel="noreferrer">{xui.receipt}</a>
                ) : null}
              </div>
            )}
            {x402Payment && (
              <div className={"defindex-approval " + x402Payment.status}>
                <span>{xui.exact}</span>
                <h4>Stellar x402 protected resource</h4>
                <p>{x402Payment.resourceUrl}</p>
                <dl>
                  <div><dt>{xui.network}</dt><dd>{x402Payment.network}</dd></div>
                  <div><dt>{xui.asset}</dt><dd>{x402Payment.asset} · {x402Payment.assetContract}</dd></div>
                  <div><dt>{xui.amount}</dt><dd>{x402Payment.amount} USDC</dd></div>
                  <div><dt>{xui.destination}</dt><dd>{x402Payment.payTo}</dd></div>
                </dl>
                {x402Payment.status === "prepared" ? (
                  <button type="button" disabled={x402Busy || !x402Status?.x402Usdc.trustlineActive || Number(x402Status?.x402Usdc.balance ?? 0) < Number(x402Payment.amount)} onClick={() => void confirmX402()}>
                    {x402Busy ? xui.paying : xui.confirm}
                  </button>
                ) : x402Payment.explorerUrl ? (
                  <a href={x402Payment.explorerUrl} target="_blank" rel="noreferrer">{xui.receipt}</a>
                ) : null}
                {x402Payment.resourcePreview && <pre>{x402Payment.resourcePreview}</pre>}
              </div>
            )}
            {x402Notice && <p className="defindex-agent-notice">{x402Notice}</p>}
          </section>
        )}
        {error && <p className="agent-chat-error">{error}. Your draft was preserved.</p>}

        <form className="agent-chat-composer" onSubmit={submit}>
          <textarea
            aria-label="Message your agent"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (draft.trim()) void sendMessage(draft);
              }
            }}
            placeholder={ui.placeholder}
            rows={2}
            maxLength={2000}
          />
          <button disabled={!draft.trim() || status === "sending"}>{ui.send}</button>
        </form>
        <small className="agent-chat-boundary">
          {ui.boundary}
        </small>
      </div>

      <aside className="agent-chat-context">
        <div>
          <p className="eyebrow">{ui.context}</p>
          <h2>{ui.contextTitle}</h2>
        </div>
        <dl>
          <div><dt>{ui.identity}</dt><dd>{email}</dd></div>
          <div><dt>Wallet</dt><dd>{walletAddress.slice(0, 8) + "..." + walletAddress.slice(-6)}</dd></div>
          <div><dt>{ui.balance}</dt><dd>{liveWalletBalance} XLM</dd></div>
          <div><dt>{ui.network}</dt><dd>Stellar Testnet</dd></div>
        </dl>
        <a
          href={"https://stellar.expert/explorer/testnet/account/" + walletAddress}
          target="_blank"
          rel="noreferrer"
        >
          {ui.verify}
        </a>
        <div className="agent-connected-apps">
          <strong>{ui.capabilities}</strong>
          <span>
            CoinMarketCap <i>{ui.readOnly}</i>
          </span>
          {connections.map((connection) => (
            <span key={connection.provider}>
              {connection.provider === "notion" ? "Notion" : connection.provider}
              <i>{connection.status}</i>
            </span>
          ))}
        </div>
        <section>
          <strong>{ui.help}</strong>
          <button
            onClick={() =>
              void sendMessage(
                connections.some(
                  (connection) =>
                    connection.provider === "notion" &&
                    connection.status === "active",
                )
                  ? ui.notionSearchPrompt
                  : ui.notionConnectPrompt,
              )
            }
          >
            {connections.some(
              (connection) =>
                connection.provider === "notion" &&
                connection.status === "active",
            )
              ? ui.notionSearch
              : ui.notionConnect}
          </button>
          <button
            onClick={() =>
              void sendMessage(
                ui.pricePrompt,
              )
            }
          >
            {ui.price}
          </button>
          <button
            onClick={() => void sendMessage(ui.watchlistPrompt)}
          >
            {ui.watchlist}
          </button>
          <button onClick={() => void sendMessage(ui.proofPrompt)}>{ui.proof}</button>
          <button onClick={() => void sendMessage(ui.travalaPrompt)}>Travala</button>
          <button onClick={() => void sendMessage(ui.connectionsPrompt)}>{ui.connections}</button>
        </section>
      </aside>
    </section>
  );
}
