"use client";

import { useSignRawHash } from "@privy-io/react-auth/extended-chains";
import { useEffect, useRef, useState } from "react";
import { summarizeX402Resource } from "../x402/resource-preview";
import { useLocale } from "../language-toggle";
import {
  browserBridgePing,
  browserBridgeRequest,
  parseBrowserBridgeEvent,
  type UnblckBrowserEvidence,
} from "../browser-bridge";


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
const x402ResultUi = {
  en: { balance: "x402 balance", updating: "Updating on-chain...", resourceDelivered: "Protected resource delivered", source: "Source", verifyReplay: "Verify duplicate protection", checkingReplay: "Checking original payment..." },
  es: { balance: "Saldo x402", updating: "Actualizando on-chain...", resourceDelivered: "Recurso protegido entregado", source: "Origen", verifyReplay: "Verificar protecci\u00f3n contra duplicados", checkingReplay: "Comprobando el pago original..." },
  pt: { balance: "Saldo x402", updating: "Atualizando on-chain...", resourceDelivered: "Recurso protegido entregue", source: "Origem", verifyReplay: "Verificar prote\u00e7\u00e3o contra duplicados", checkingReplay: "Verificando o pagamento original..." },
};
const x402ReplayUi = {
  en: { verified: "Duplicate protection verified", sameReceipt: "Same receipt", zeroDebit: "Second debit", before: "Before", after: "After" },
  es: { verified: "Protecci\u00f3n contra duplicados verificada", sameReceipt: "Mismo recibo", zeroDebit: "Segundo d\u00e9bito", before: "Antes", after: "Despu\u00e9s" },
  pt: { verified: "Prote\u00e7\u00e3o contra duplicados verificada", sameReceipt: "Mesmo recibo", zeroDebit: "Segundo d\u00e9bito", before: "Antes", after: "Depois" },
};



type X402ChatIntent = { operation: "demo_payment"; requestId: string };
type X402Payment = {
  id: string;
  signingAddress: string;
  signingHash: `0x${string}` | null;
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
  signingAddress: string;
  signingHash: `0x${string}` | null;
  status: string;
  transactionHash: string | null;
  explorerUrl: string | null;
  expiresAt: string;
  preview: { title: string; description: string; network: string; asset: string; amount: string; destination: string };
};
type X402Status = {
  x402Usdc: {
    trustlineActive: boolean;
    balance: string;
    faucetUrl: string;
    internalFaucet?: { configured: boolean };
  };
  resource: string;
  recent: X402Payment[];
};
type X402ReplayEvidence = {
  transactionHash: string;
  balanceBefore: string;
  balanceAfter: string;
  replayDebit: "0.0000000 USDC";
};

type ChatAction = {
  label: string;
  message?: string;
  href?: string;
  connect?: string;
  popup?: {
    provider: string;
    url: string;
    completionMessage: string;
    permissions: string[];
  };
};

type ExternalConnection = {
  provider: string;
  status: string;
  updatedAt: string;
};


type SoroswapChatIntent = {
  operation: "swap";
  assetIn: "XLM" | "USDC";
  assetOut: "XLM" | "USDC";
  amount: string;
  slippageBps: number;
  requestId: string;
};

type SoroswapApproval = {
  id: string;
  action: "soroswap.swap";
  status: string;
  signingAddress: string;
  signingHash: `0x${string}` | null;
  transactionHash: string | null;
  explorerUrl: string | null;
  expiresAt: string;
  preview: {
    title: string;
    description: string;
    network: string;
    wallet: string;
    assetIn: "XLM" | "USDC";
    assetOut: "XLM" | "USDC";
    amountIn: string;
    amountOut: string;
    minimumAmountOut: string;
    priceImpactPct: string;
    platform: string;
    slippageBps: number;
  };
};
type DefindexChatIntent =
  | { operation: "deposit"; asset: "XLM" | "USDC"; amount: string; requestId: string }
  | { operation: "usdc_trustline"; asset: "USDC"; requestId: string };

type DefindexApproval = {
  id: string;
  action: string;
  signingAddress: string;
  signingHash: `0x${string}` | null;
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
  workflow?: {
    id: string;
    status: string;
    engine: "langgraph";
    version: number;
  };
  connection?: {
    name: string;
    stage: string;
    priority: string;
  };
  defindexIntent?: DefindexChatIntent;
  soroswapIntent?: SoroswapChatIntent;
  x402Intent?: X402ChatIntent;
  memoryUpdated?: boolean;
  memoryContext?: {
    provider: "neon-topic-router";
    domains: string[];
    items: Array<{
      id: string;
      kind: string;
      label: string;
      source: string;
      score: number;
    }>;
  };
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
  const { signRawHash } = useSignRawHash();
  const ui = chatUi[locale];
  const dui = defindexUi[locale];
  const xui = x402Ui[locale];
  const xrui = x402ResultUi[locale];
  const xreui = x402ReplayUi[locale];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [liveWalletBalance, setLiveWalletBalance] = useState(walletBalance);
  const [status, setStatus] = useState<"loading" | "ready" | "sending" | "error">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [connections, setConnections] = useState<ExternalConnection[]>([]);
  const [connectionNotice, setConnectionNotice] = useState<string | null>(null);
  const [connectionPopup, setConnectionPopup] = useState<{
    provider: string;
    url: string;
    completionMessage: string;
    permissions: string[];
    status: "review" | "waiting" | "returned" | "verified";
  } | null>(null);
  const popupWindowRef = useRef<Window | null>(null);
  const [bridgeAvailable, setBridgeAvailable] = useState(false);
  const [bridgeBusy, setBridgeBusy] = useState(false);
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const [bridgeEvidence, setBridgeEvidence] = useState<UnblckBrowserEvidence | null>(null);
  const bridgeRequestRef = useRef<string | null>(null);
  const bridgeTimeoutRef = useRef<number | null>(null);



  const [defindexOpen, setDefindexOpen] = useState(false);
  const [defindexStatus, setDefindexStatus] = useState<DefindexStatus | null>(null);
  const [defindexApproval, setDefindexApproval] = useState<DefindexApproval | null>(null);
  const [defindexBusy, setDefindexBusy] = useState<string | null>(null);
  const [soroswapOpen, setSoroswapOpen] = useState(false);
  const [soroswapApproval, setSoroswapApproval] = useState<SoroswapApproval | null>(null);
  const [soroswapBusy, setSoroswapBusy] = useState(false);
  const [soroswapNotice, setSoroswapNotice] = useState<string | null>(null);
  const [defindexNotice, setDefindexNotice] = useState<string | null>(null);
  const [xlmDepositAmount, setXlmDepositAmount] = useState("1");
  const [usdcDepositAmount, setUsdcDepositAmount] = useState("1");
  const [x402Open, setX402Open] = useState(false);
  const [x402Status, setX402Status] = useState<X402Status | null>(null);
  const [liveX402UsdcBalance, setLiveX402UsdcBalance] = useState<string | null>(null);
  const [x402Payment, setX402Payment] = useState<X402Payment | null>(null);
  const [x402Trustline, setX402Trustline] = useState<X402TrustlineApproval | null>(null);
  const [x402Busy, setX402Busy] = useState(false);
  const [x402ReplayEvidence, setX402ReplayEvidence] = useState<X402ReplayEvidence | null>(null);
  const [x402Notice, setX402Notice] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const followsLatestRef = useRef(true);
  const initialScrollRef = useRef(false);
  const [isAtLatest, setIsAtLatest] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);

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
    let active = true;
    async function loadX402Balance() {
      try {
        const token = await getAccessToken();
        if (!token) return;
        const response = await fetch("/api/agent/x402", {
          headers: { Authorization: "Bearer " + token },
          cache: "no-store",
        });
        const result = await response.json() as X402Status;
        if (active && response.ok) {
          setX402Status(result);
          setLiveX402UsdcBalance(result.x402Usdc.balance);
        }
      } catch {
        // The chat remains usable while an optional on-chain balance refresh recovers.
      }
    }
    void loadX402Balance();
    return () => {
      active = false;
    };
  }, [getAccessToken]);


  useEffect(() => {
    const thread = threadRef.current;
    if (!thread) return;

    if (!initialScrollRef.current) {
      thread.scrollTop = thread.scrollHeight;
      initialScrollRef.current = true;
      followsLatestRef.current = true;
      setIsAtLatest(true);
      return;
    }

    if (followsLatestRef.current || status === "sending") {
      thread.scrollTo({ top: thread.scrollHeight, behavior: "smooth" });
      setIsAtLatest(true);
      setHasNewMessages(false);
      return;
    }

    setHasNewMessages(true);
  }, [messages, status]);

  useEffect(() => {
    if (!defindexOpen && !soroswapOpen && !x402Open && !connectionPopup) return;
    function closeActionPanel(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setDefindexOpen(false);
      setSoroswapOpen(false);
      setX402Open(false);
      setConnectionPopup(null);
      composerRef.current?.focus();
    }
    window.addEventListener("keydown", closeActionPanel);
    return () => window.removeEventListener("keydown", closeActionPanel);
  }, [defindexOpen, soroswapOpen, x402Open, connectionPopup]);

  useEffect(() => {
    if (connectionPopup?.status !== "waiting") return;
    const timer = window.setInterval(() => {
      if (popupWindowRef.current?.closed) {
        popupWindowRef.current = null;
        setConnectionPopup((current) =>
          current ? { ...current, status: "returned" } : current,
        );
      }
    }, 600);
    return () => window.clearInterval(timer);
  }, [connectionPopup?.status]);

  useEffect(() => {
    function acceptConnectionCallback(event: MessageEvent) {
      if (event.source !== window || event.origin !== window.location.origin) return;
      if (event.data?.type === "agent-assistant:connection-complete") {
        setConnectionPopup((current) =>
          current && current.provider === event.data.provider
            ? { ...current, status: "returned" }
            : current,
        );
        return;
      }
      const bridgeEvent = parseBrowserBridgeEvent(event.data);
      if (!bridgeEvent) return;
      if (bridgeEvent.type === "BRIDGE_HELLO") {
        setBridgeAvailable(true);
        return;
      }
      if (bridgeEvent.requestId !== bridgeRequestRef.current) return;
      bridgeRequestRef.current = null;
      if (bridgeTimeoutRef.current !== null) {
        window.clearTimeout(bridgeTimeoutRef.current);
        bridgeTimeoutRef.current = null;
      }
      setBridgeBusy(false);
      if (!bridgeEvent.ok || !bridgeEvent.data?.authenticated) {
        const message = locale === "es"
          ? "No se encontr\u00f3 una pesta\u00f1a UNBLCK autenticada en este perfil."
          : locale === "pt"
            ? "Nenhuma aba autenticada da UNBLCK foi encontrada neste perfil."
            : "No authenticated UNBLCK tab was found in this browser profile.";
        setBridgeError(message);
        return;
      }
      setBridgeError(null);
      setBridgeEvidence(bridgeEvent.data);
      setConnectionPopup((current) =>
        current?.provider === "unblck" ? { ...current, status: "verified" } : current,
      );
      setConnectionNotice(
        locale === "es"
          ? "Sesi\u00f3n UNBLCK verificada por el Browser Bridge. No se cre\u00f3 ninguna reserva."
          : locale === "pt"
            ? "Sess\u00e3o UNBLCK verificada pelo Browser Bridge. Nenhuma reserva foi criada."
            : "UNBLCK session verified by the Browser Bridge. No reservation was created.",
      );
    }
    window.addEventListener("message", acceptConnectionCallback);
    window.postMessage(browserBridgePing(), window.location.origin);
    return () => {
      window.removeEventListener("message", acceptConnectionCallback);
      if (bridgeTimeoutRef.current !== null) window.clearTimeout(bridgeTimeoutRef.current);
    };
  }, [locale]);

  function handleThreadScroll() {
    const thread = threadRef.current;
    if (!thread) return;
    const nearLatest = thread.scrollHeight - thread.scrollTop - thread.clientHeight < 72;
    followsLatestRef.current = nearLatest;
    setIsAtLatest(nearLatest);
    if (nearLatest) setHasNewMessages(false);
  }

  function scrollToLatest() {
    const thread = threadRef.current;
    if (!thread) return;
    followsLatestRef.current = true;
    thread.scrollTo({ top: thread.scrollHeight, behavior: "smooth" });
    setIsAtLatest(true);
    setHasNewMessages(false);
  }

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
    if (composerRef.current) composerRef.current.style.height = "";
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
      if (assistantMessage.soroswapIntent) {
        await prepareSoroswap(assistantMessage.soroswapIntent);
      } else if (assistantMessage.x402Intent) {
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



  function reviewPopupConnection(action: NonNullable<ChatAction["popup"]>) {
    setConnectionPopup({ ...action, status: "review" });
    setBridgeError(null);
    setBridgeEvidence(null);
  }

  function verifyBrowserConnection() {
    if (!connectionPopup || connectionPopup.provider !== "unblck" || bridgeBusy) return;
    const requestId = crypto.randomUUID();
    bridgeRequestRef.current = requestId;
    setBridgeBusy(true);
    setBridgeError(null);
    window.postMessage(browserBridgeRequest(requestId), window.location.origin);
    bridgeTimeoutRef.current = window.setTimeout(() => {
      if (bridgeRequestRef.current !== requestId) return;
      bridgeRequestRef.current = null;
      setBridgeBusy(false);
      setBridgeError(
        locale === "es"
          ? "El Browser Bridge no respondi\u00f3. Confirma que la extensi\u00f3n est\u00e9 activa."
          : locale === "pt"
            ? "O Browser Bridge n\u00e3o respondeu. Confirme que a extens\u00e3o est\u00e1 ativa."
            : "The Browser Bridge did not respond. Confirm that the extension is enabled.",
      );
    }, 8000);
  }

  function openPopupConnection() {
    if (!connectionPopup) return;
    const width = Math.min(560, window.screen.availWidth - 32);
    const height = Math.min(740, window.screen.availHeight - 48);
    const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
    const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);
    const popup = window.open(
      connectionPopup.url,
      "agent-assistant-" + connectionPopup.provider,
      [
        "popup=yes",
        "width=" + Math.round(width),
        "height=" + Math.round(height),
        "left=" + Math.round(left),
        "top=" + Math.round(top),
        "resizable=yes",
        "scrollbars=yes",
      ].join(","),
    );
    if (!popup) {
      setError(
        locale === "es"
          ? "El navegador bloque\u00f3 la ventana. Permite popups para este sitio e int\u00e9ntalo otra vez."
          : locale === "pt"
            ? "O navegador bloqueou a janela. Permita popups para este site e tente novamente."
            : "The browser blocked the window. Allow popups for this site and try again.",
      );
      return;
    }
    popupWindowRef.current = popup;
    popup.focus();
    setConnectionPopup((current) =>
      current ? { ...current, status: "waiting" } : current,
    );
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
  function applyX402Status(nextStatus: X402Status) {
    setX402Status(nextStatus);
    setLiveX402UsdcBalance(nextStatus.x402Usdc.balance);
    return nextStatus;
  }

  async function refreshX402Status(expectedMaximum?: number) {
    let latest: X402Status | null = null;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      latest = await x402Fetch() as X402Status;
      const balance = Number(latest.x402Usdc.balance);
      if (
        expectedMaximum === undefined ||
        (Number.isFinite(balance) && balance <= expectedMaximum + 0.0000001)
      ) {
        break;
      }
      if (attempt < 3) {
        await new Promise((resolve) => window.setTimeout(resolve, 250));
      }
    }
    if (!latest) throw new Error("x402_status_unavailable");
    return applyX402Status(latest);
  }


  async function prepareX402(requestId = crypto.randomUUID()) {
    setDefindexOpen(false);
    setSoroswapOpen(false);
    setX402Open(true);
    setX402Busy(true);
    setX402Notice(null);
    setX402ReplayEvidence(null);
    setX402Payment(null);
    try {
      const statusResult = await x402Fetch();
      applyX402Status(statusResult);
      if (!statusResult.x402Usdc.trustlineActive) {
        const trustlineResult = await x402Fetch({ action: "prepare_trustline", requestId: `${requestId}-trustline` });
        if (!trustlineResult.alreadyComplete) setX402Trustline(trustlineResult.approval);
        return;
      }
      if (Number(statusResult.x402Usdc.balance) < 0.01) {
        if (statusResult.x402Usdc.internalFaucet?.configured) {
          await x402Fetch({ action: "claim_testnet_usdc" });
          const fundedStatus = await x402Fetch();
          applyX402Status(fundedStatus);
          if (Number(fundedStatus.x402Usdc.balance) < 0.01) throw new Error("testnet_usdc_funding_not_visible");
          setX402Notice(
            locale === "es" ? "El faucet interno agreg\u00f3 autom\u00e1ticamente 0,50 USDC Testnet."
              : locale === "pt" ? "O faucet interno adicionou automaticamente 0,50 USDC Testnet."
                : "The internal faucet automatically added 0.50 USDC Testnet.",
          );
        } else {
          setX402Notice(xui.trustline);
          return;
        }
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
      if (!x402Trustline.signingHash) {
        throw new Error("This approval must be prepared again.");
      }
      const signed = await signRawHash({
        address: x402Trustline.signingAddress,
        chainType: "stellar",
        hash: x402Trustline.signingHash,
      });
      const result = await x402Fetch({
        action: "execute_trustline",
        approvalId: x402Trustline.id,
        explicitConfirmation: true,
        signature: signed.signature,
      });
      setX402Trustline(result.approval);
      await prepareX402(crypto.randomUUID());
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
    setX402ReplayEvidence(null);
    try {
      if (!x402Payment.signingHash) {
        throw new Error("This payment must be prepared again.");
      }
      const signed = await signRawHash({
        address: x402Payment.signingAddress,
        chainType: "stellar",
        hash: x402Payment.signingHash,
      });
      const previousBalance = Number(x402Status?.x402Usdc.balance ?? liveX402UsdcBalance);
      const result = await x402Fetch({
        action: "execute",
        paymentId: x402Payment.id,
        explicitConfirmation: true,
        signature: signed.signature,
      });
      setX402Payment(result.payment);
      setX402Notice(result.replayed ? xui.replayed : xui.confirmed);
      setLiveX402UsdcBalance(null);
      const paymentAmount = Number(result.payment.amount);
      const expectedMaximum = !result.replayed && Number.isFinite(previousBalance) && Number.isFinite(paymentAmount)
        ? Math.max(0, previousBalance - paymentAmount)
        : undefined;
      await refreshX402Status(expectedMaximum);
    } catch (caught) {
      setX402Notice(caught instanceof Error ? caught.message : "x402 payment failed");
    } finally {
      setX402Busy(false);
    }
  }
  async function verifyX402Replay() {
    if (!x402Payment || x402Payment.status !== "confirmed") return;
    setX402Busy(true);
    setX402Notice(null);
    setX402ReplayEvidence(null);
    try {
      const before = await refreshX402Status();
      const originalHash = x402Payment.transactionHash;
      if (!originalHash) throw new Error("x402_original_receipt_missing");
      const result = await x402Fetch({
        action: "execute",
        paymentId: x402Payment.id,
        explicitConfirmation: true,
      });
      if (!result.replayed || result.payment.transactionHash !== originalHash) {
        throw new Error("x402_duplicate_protection_not_verified");
      }
      const after = await refreshX402Status();
      if (before.x402Usdc.balance !== after.x402Usdc.balance) {
        throw new Error("x402_duplicate_replay_changed_balance");
      }
      setX402Payment(result.payment);
      setX402Notice(xui.replayed);
      setX402ReplayEvidence({
        transactionHash: originalHash,
        balanceBefore: before.x402Usdc.balance,
        balanceAfter: after.x402Usdc.balance,
        replayDebit: "0.0000000 USDC",
      });
    } catch (caught) {
      setX402Notice(caught instanceof Error ? caught.message : "x402 replay check failed");
    } finally {
      setX402Busy(false);
    }
  }

  async function openLatestX402Receipt() {
    setDefindexOpen(false);
    setSoroswapOpen(false);
    setX402Open(true);
    setX402Busy(true);
    setX402Notice(null);
    setX402ReplayEvidence(null);
    try {
      const current = await x402Fetch() as X402Status;
      applyX402Status(current);
      const latest = current.recent.find(
        (payment) => payment.status === "confirmed" && Boolean(payment.transactionHash),
      );
      if (!latest) {
        setX402Notice(
          locale === "es" ? "Todav\u00eda no existe un pago x402 confirmado."
            : locale === "pt" ? "Ainda n\u00e3o existe um pagamento x402 confirmado."
              : "No confirmed x402 payment exists yet.",
        );
        return;
      }
      setX402Payment(latest);
      setX402Notice(
        locale === "es" ? "\u00daltimo recibo x402 recuperado desde Neon."
          : locale === "pt" ? "\u00daltimo recibo x402 recuperado da Neon."
            : "Latest x402 receipt restored from Neon.",
      );
    } catch (caught) {
      setX402Notice(caught instanceof Error ? caught.message : "x402 receipt lookup failed");
    } finally {
      setX402Busy(false);
    }
  }

  async function soroswapFetch(body?: Record<string, unknown>) {
    const token = await getAccessToken();
    if (!token) throw new Error("Authentication token unavailable");
    const response = await fetch("/api/agent/soroswap", {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: "Bearer " + token,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Soroswap request failed");
    return result;
  }

  async function prepareSoroswap(intent: SoroswapChatIntent) {
    setDefindexOpen(false);
    setX402Open(false);
    setSoroswapOpen(true);
    setSoroswapBusy(true);
    setSoroswapNotice(null);
    setSoroswapApproval(null);
    try {
      const result = await soroswapFetch({
        action: "prepare",
        assetIn: intent.assetIn,
        assetOut: intent.assetOut,
        amount: intent.amount,
        slippageBps: intent.slippageBps,
        requestId: intent.requestId,
      });
      setSoroswapApproval(result.approval);
      if (result.replayed) {
        setSoroswapNotice(
          locale === "es"
            ? "Esta solicitud ya estaba preparada o confirmada."
            : locale === "pt"
              ? "Esta solicitacao ja estava preparada ou confirmada."
              : "This request was already prepared or confirmed.",
        );
      }
    } catch (caught) {
      setSoroswapNotice(
        caught instanceof Error ? caught.message : "Soroswap preparation failed",
      );
    } finally {
      setSoroswapBusy(false);
    }
  }

  async function confirmSoroswap() {
    if (!soroswapApproval?.signingHash) return;
    setSoroswapBusy(true);
    setSoroswapNotice(null);
    try {
      const signed = await signRawHash({
        address: soroswapApproval.signingAddress,
        chainType: "stellar",
        hash: soroswapApproval.signingHash,
      });
      const result = await soroswapFetch({
        action: "execute",
        approvalId: soroswapApproval.id,
        explicitConfirmation: true,
        signature: signed.signature,
      });
      setSoroswapApproval(result.approval);
      setSoroswapNotice(
        result.replayed
          ? locale === "es"
            ? "El swap ya estaba confirmado; se recupero el mismo recibo."
            : locale === "pt"
              ? "O swap ja estava confirmado; o mesmo recibo foi recuperado."
              : "The swap was already confirmed; the same receipt was returned."
          : locale === "es"
            ? "Swap confirmado en Stellar Testnet."
            : locale === "pt"
              ? "Swap confirmado na Stellar Testnet."
              : "Swap confirmed on Stellar Testnet.",
      );
    } catch (caught) {
      setSoroswapNotice(
        caught instanceof Error ? caught.message : "Soroswap execution failed",
      );
    } finally {
      setSoroswapBusy(false);
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
    setX402Open(false);
    setSoroswapOpen(false);
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
    setX402Open(false);
    setSoroswapOpen(false);
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
      if (!defindexApproval.signingHash) {
        throw new Error("This DeFindex action must be prepared again.");
      }
      const signed = await signRawHash({
        address: defindexApproval.signingAddress,
        chainType: "stellar",
        hash: defindexApproval.signingHash,
      });
      const result = await defindexFetch({
        action: "execute",
        approvalId: defindexApproval.id,
        explicitConfirmation: true,
        signature: signed.signature,
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

  const x402ResourceSummary = x402Payment?.resourcePreview
    ? summarizeX402Resource(x402Payment.resourcePreview, x402Payment.resourceUrl)
    : null;
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

        <div
          className="agent-chat-thread"
          aria-live="polite"
          ref={threadRef}
          onScroll={handleThreadScroll}
        >
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
                {message.workflow && (
                  <span className="agent-workflow-state" title={message.workflow.id}>
                    LangGraph / {message.workflow.status} / v{message.workflow.version}
                  </span>
                )}
                <div className="agent-message-copy">
                  <MessageText content={message.content} />
                </div>
                {message.memoryContext?.items.length ? (
                  <details className="agent-memory-context">
                    <summary>
                      {locale === "es" ? "Memoria relevante" : locale === "pt" ? "Memoria relevante" : "Relevant memory"}
                    </summary>
                    <p>{message.memoryContext.domains.join(" / ")}</p>
                    <ul>
                      {message.memoryContext.items.map((item) => (
                        <li key={item.id}>
                          <strong>{item.label}</strong> / {item.kind} / {item.source}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
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
                      action.popup ? (
                        <button
                          key={action.label}
                          type="button"
                          className="primary"
                          disabled={status === "sending"}
                          onClick={() => reviewPopupConnection(action.popup!)}
                        >
                          {action.label}
                        </button>
                      ) : action.connect ? (
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
        </div>

        {connectionPopup && (
          <div className="connection-center-backdrop">
            <section className="connection-center-card" role="dialog" aria-modal="true" aria-labelledby="connection-center-title">
              <header>
                <div>
                  <span>{locale === "es" ? "CENTRO DE CONEXIONES" : locale === "pt" ? "CENTRO DE CONEX\u00d5ES" : "CONNECTION CENTER"}</span>
                  <h3 id="connection-center-title">
                    {locale === "es" ? "Conectar con " : locale === "pt" ? "Conectar com " : "Connect to "}
                    {connectionPopup.provider.toUpperCase()}
                  </h3>
                </div>
                <button type="button" aria-label="Close" onClick={() => setConnectionPopup(null)}>X</button>
              </header>
              <p>
                {locale === "es"
                  ? "Permaneces en agent-assistant. La autenticaci\u00f3n y la sesi\u00f3n se mantienen en el sitio oficial del proveedor."
                  : locale === "pt"
                    ? "Voc\u00ea permanece no agent-assistant. A autentica\u00e7\u00e3o e a sess\u00e3o ficam no site oficial do provedor."
                    : "You stay in agent-assistant. Authentication and the session remain on the provider's official site."}
              </p>
              <div className={"connection-bridge-presence " + (bridgeAvailable ? "detected" : "missing")}>
                <i />
                <span>
                  {bridgeAvailable
                    ? locale === "es" ? "Browser Bridge detectado" : locale === "pt" ? "Browser Bridge detectado" : "Browser Bridge detected"
                    : locale === "es" ? "Browser Bridge no detectado" : locale === "pt" ? "Browser Bridge n\u00e3o detectado" : "Browser Bridge not detected"}
                </span>
                {!bridgeAvailable && (
                  <a href="/agent-assistant-browser-bridge.zip" download>
                    {locale === "es" ? "Gu\u00eda de instalaci\u00f3n" : locale === "pt" ? "Guia de instala\u00e7\u00e3o" : "Installation guide"}
                  </a>
                )}
              </div>
              <ul>
                {connectionPopup.permissions.map((permission) => <li key={permission}>{permission}</li>)}
              </ul>
              {bridgeEvidence && (
                <article className="connection-bridge-evidence">
                  <header>
                    <strong>{locale === "es" ? "Sesi\u00f3n verificada" : locale === "pt" ? "Sess\u00e3o verificada" : "Session verified"}</strong>
                    <span>{new Date(bridgeEvidence.observedAt).toLocaleTimeString(locale)}</span>
                  </header>
                  <dl>
                    <div>
                      <dt>{locale === "es" ? "Cr\u00e9ditos" : locale === "pt" ? "Cr\u00e9ditos" : "Credits"}</dt>
                      <dd>{bridgeEvidence.hub.creditsRemaining ?? "\u2014"}/{bridgeEvidence.hub.creditsTotal ?? "\u2014"}</dd>
                    </div>
                    <div>
                      <dt>{locale === "es" ? "Calendario" : locale === "pt" ? "Calend\u00e1rio" : "Calendar"}</dt>
                      <dd>{bridgeEvidence.hub.month ?? "\u2014"}</dd>
                    </div>
                    <div>
                      <dt>{locale === "es" ? "Fechas habilitadas" : locale === "pt" ? "Datas habilitadas" : "Enabled dates"}</dt>
                      <dd>{bridgeEvidence.hub.enabledDates.length ? bridgeEvidence.hub.enabledDates.join(", ") : "\u2014"}</dd>
                    </div>
                  </dl>
                  {bridgeEvidence.hub.bookingPolicy && <p>{bridgeEvidence.hub.bookingPolicy}</p>}
                </article>
              )}
              {bridgeError && <p className="connection-bridge-error">{bridgeError}</p>}
              <div className={"connection-center-status " + connectionPopup.status}>
                <i />
                <span>
                  {connectionPopup.status === "verified"
                    ? locale === "es" ? "Portal autenticado y evidencia de solo lectura recibida." : locale === "pt" ? "Portal autenticado e evid\u00eancia somente leitura recebida." : "Authenticated portal and read-only evidence received."
                    : connectionPopup.status === "review"
                      ? locale === "es" ? "Revisa antes de abrir o verificar" : locale === "pt" ? "Revise antes de abrir ou verificar" : "Review before opening or verifying"
                      : connectionPopup.status === "waiting"
                        ? locale === "es" ? "Ventana abierta. Completa el magic link all\u00ed." : locale === "pt" ? "Janela aberta. Conclua o magic link nela." : "Window open. Complete the magic link there."
                        : locale === "es" ? "La ventana se cerr\u00f3. Verifica la sesi\u00f3n con el bridge." : locale === "pt" ? "A janela foi fechada. Verifique a sess\u00e3o com a ponte." : "The window closed. Verify the session with the bridge."}
                </span>
              </div>
              <footer>
                <button type="button" className="secondary" onClick={() => setConnectionPopup(null)}>
                  {connectionPopup.status === "verified"
                    ? locale === "es" ? "Cerrar" : locale === "pt" ? "Fechar" : "Close"
                    : locale === "es" ? "Cancelar" : locale === "pt" ? "Cancelar" : "Cancel"}
                </button>
                {connectionPopup.provider === "unblck" && connectionPopup.status !== "verified" && (
                  <button type="button" className="primary" disabled={!bridgeAvailable || bridgeBusy} onClick={verifyBrowserConnection}>
                    {bridgeBusy
                      ? locale === "es" ? "Verificando..." : locale === "pt" ? "Verificando..." : "Verifying..."
                      : locale === "es" ? "Verificar sesi\u00f3n" : locale === "pt" ? "Verificar sess\u00e3o" : "Verify browser session"}
                  </button>
                )}
                {connectionPopup.status === "review" ? (
                  <button type="button" className="secondary" onClick={openPopupConnection}>
                    {locale === "es" ? "Abrir login oficial" : locale === "pt" ? "Abrir login oficial" : "Open official login"}
                  </button>
                ) : connectionPopup.status !== "verified" ? (
                  <button type="button" className="secondary" onClick={openPopupConnection}>
                    {locale === "es" ? "Abrir otra vez" : locale === "pt" ? "Abrir novamente" : "Open again"}
                  </button>
                ) : null}
              </footer>
              <small>
                {connectionPopup.status === "verified"
                  ? locale === "es" ? "Evidencia local de solo lectura. No se cre\u00f3 ninguna reserva." : locale === "pt" ? "Evid\u00eancia local somente leitura. Nenhuma reserva foi criada." : "Local read-only evidence. No reservation was created."
                  : locale === "es" ? "Abrir el login no verifica la sesi\u00f3n ni crea una reserva." : locale === "pt" ? "Abrir o login n\u00e3o verifica a sess\u00e3o nem cria uma reserva." : "Opening login does not verify the session or create a reservation."}
              </small>
            </section>
          </div>
        )}

        {!isAtLatest && !defindexOpen && !soroswapOpen && !x402Open && !connectionPopup && (
          <button className="agent-chat-jump" type="button" onClick={scrollToLatest}>
            <span aria-hidden="true">{"\u2193"}</span>
            {hasNewMessages
              ? locale === "es" ? "Nuevos mensajes" : locale === "pt" ? "Novas mensagens" : "New messages"
              : locale === "es" ? "Ir al final" : locale === "pt" ? "Ir ao fim" : "Jump to latest"}
          </button>
        )}


        {soroswapOpen && (
          <section className="defindex-agent-panel" aria-label="Soroswap Stellar Testnet swap" role="dialog">
            <header>
              <div>
                <span>SOROSWAP ? STELLAR TESTNET</span>
                <h3>
                  {locale === "es"
                    ? "Swap preparado desde el chat, con aprobacion Privy."
                    : locale === "pt"
                      ? "Swap preparado pelo chat, com aprovacao Privy."
                      : "Swap prepared from chat, with Privy approval."}
                </h3>
              </div>
              <button type="button" onClick={() => setSoroswapOpen(false)}>
                {locale === "es" ? "Cerrar" : locale === "pt" ? "Fechar" : "Close"}
              </button>
            </header>
            {soroswapBusy && !soroswapApproval && (
              <p className="defindex-agent-loading">
                {locale === "es"
                  ? "Cotizando y construyendo el XDR sin firmar..."
                  : locale === "pt"
                    ? "Cotando e construindo o XDR sem assinatura..."
                    : "Quoting and building the unsigned XDR..."}
              </p>
            )}
            {soroswapApproval && (
              <div className={"defindex-approval " + soroswapApproval.status}>
                <span>
                  {locale === "es"
                    ? "SWAP EXACTO PARA APROBACION"
                    : locale === "pt"
                      ? "SWAP EXATO PARA APROVACAO"
                      : "EXACT SWAP FOR APPROVAL"}
                </span>
                <h4>{soroswapApproval.preview.title}</h4>
                <p>{soroswapApproval.preview.description}</p>
                <dl>
                  <div><dt>{ui.network}</dt><dd>{soroswapApproval.preview.network}</dd></div>
                  <div><dt>{locale === "es" ? "Entregas" : locale === "pt" ? "Voce envia" : "You send"}</dt><dd>{soroswapApproval.preview.amountIn} {soroswapApproval.preview.assetIn}</dd></div>
                  <div><dt>{locale === "es" ? "Estimado" : locale === "pt" ? "Estimado" : "Estimated"}</dt><dd>{soroswapApproval.preview.amountOut} {soroswapApproval.preview.assetOut}</dd></div>
                  <div><dt>{locale === "es" ? "Minimo" : locale === "pt" ? "Minimo" : "Minimum"}</dt><dd>{soroswapApproval.preview.minimumAmountOut} {soroswapApproval.preview.assetOut}</dd></div>
                  <div><dt>Slippage</dt><dd>{soroswapApproval.preview.slippageBps / 100}%</dd></div>
                  <div><dt>{locale === "es" ? "Ruta" : locale === "pt" ? "Rota" : "Route"}</dt><dd>{soroswapApproval.preview.platform}</dd></div>
                </dl>
                {soroswapApproval.status === "prepared" ? (
                  <button type="button" disabled={soroswapBusy} onClick={() => void confirmSoroswap()}>
                    {soroswapBusy
                      ? locale === "es" ? "Firmando y enviando..." : locale === "pt" ? "Assinando e enviando..." : "Signing and submitting..."
                      : locale === "es" ? "Confirmar swap con Privy" : locale === "pt" ? "Confirmar swap com Privy" : "Confirm swap with Privy"}
                  </button>
                ) : soroswapApproval.explorerUrl ? (
                  <a href={soroswapApproval.explorerUrl} target="_blank" rel="noreferrer">
                    {locale === "es" ? "Abrir recibo" : locale === "pt" ? "Abrir recibo" : "Open receipt"}
                  </a>
                ) : null}
              </div>
            )}
            {soroswapNotice && <p className="defindex-agent-notice">{soroswapNotice}</p>}
          </section>
        )}

        {defindexOpen && (
          <section className="defindex-agent-panel" aria-label="DeFindex Testnet actions" role="dialog">
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
          <section className="defindex-agent-panel" aria-label="x402 Stellar Testnet payment" role="dialog">
            <header>
              <div><span>{xui.label}</span><h3>{xui.heading}</h3></div>
              <button type="button" onClick={() => setX402Open(false)}>{xui.close}</button>
            </header>
            <div className="x402-live-balance" aria-live="polite">
              <span>{xrui.balance}</span>
              <strong>{liveX402UsdcBalance === null ? xrui.updating : `${liveX402UsdcBalance} USDC`}</strong>
            </div>
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
                  <div className="x402-confirmed-actions">
                    <a href={x402Payment.explorerUrl} target="_blank" rel="noreferrer">{xui.receipt}</a>
                    <button type="button" disabled={x402Busy} onClick={() => void verifyX402Replay()}>
                      {x402Busy ? xrui.checkingReplay : xrui.verifyReplay}
                    </button>
                  </div>
                ) : null}
                {x402ReplayEvidence && (
                  <div className="x402-replay-proof" role="status">
                    <strong>{xreui.verified}</strong>
                    <code>{x402ReplayEvidence.transactionHash}</code>
                    <dl>
                      <div><dt>{xreui.before}</dt><dd>{x402ReplayEvidence.balanceBefore} USDC</dd></div>
                      <div><dt>{xreui.after}</dt><dd>{x402ReplayEvidence.balanceAfter} USDC</dd></div>
                      <div><dt>{xreui.zeroDebit}</dt><dd>{x402ReplayEvidence.replayDebit}</dd></div>
                    </dl>
                    <span>{xreui.sameReceipt} {"\u00b7"} {"\u2713"}</span>
                  </div>
                )}
                {x402ResourceSummary && (
                  <div className="x402-resource-card">
                    <span aria-hidden="true">{"\u2713"}</span>
                    <div>
                      <strong>{x402ResourceSummary.title ?? xrui.resourceDelivered}</strong>
                      {x402ResourceSummary.summary && <p>{x402ResourceSummary.summary}</p>}
                      {x402ResourceSummary.source && <small>{xrui.source}: {x402ResourceSummary.source}</small>}
                    </div>
                  </div>
                )}
              </div>
            )}
            {x402Notice && <p className="defindex-agent-notice">{x402Notice}</p>}
          </section>
        )}
        {error && <p className="agent-chat-error">{error}. Your draft was preserved.</p>}

        <form className="agent-chat-composer" onSubmit={submit}>
          <textarea
            aria-label="Message your agent"
            ref={composerRef}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              event.currentTarget.style.height = "auto";
              event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 112)}px`;
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (draft.trim()) void sendMessage(draft);
              }
            }}
            placeholder={ui.placeholder}
            rows={1}
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
          <div><dt>{xrui.balance}</dt><dd>{liveX402UsdcBalance === null ? "\u2014" : `${liveX402UsdcBalance} USDC`}</dd></div>
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
          <button onClick={() => void openLatestX402Receipt()}>
            {locale === "es" ? "Recibo x402" : locale === "pt" ? "Recibo x402" : "x402 receipt"}
          </button>
          <button onClick={() => void sendMessage(ui.proofPrompt)}>{ui.proof}</button>
          <button onClick={() => void sendMessage(ui.travalaPrompt)}>Travala</button>
          <button onClick={() => void sendMessage(ui.connectionsPrompt)}>{ui.connections}</button>
        </section>
      </aside>
    </section>
  );
}
