"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "../language-toggle";

const chatUi = {
  en: { agent: "Your agent", controlled: "Stellar Testnet · policy-controlled", memory: "NEON MEMORY ON", loading: "Loading your conversation...", thinking: "Checking capabilities and safety boundaries", placeholder: "Ask your agent to search Notion, check a connection or prepare an action...", send: "Send", boundary: "The agent can prepare actions. Payments and irreversible operations always require scoped authorization.", context: "LIVE CONTEXT", contextTitle: "Ready to act, within your rules.", identity: "Identity", balance: "Balance", network: "Network", verify: "Verify wallet on-chain", capabilities: "LIVE CAPABILITIES", readOnly: "read only", help: "PERSONAL HELP", notionConnect: "Connect Notion", notionSearch: "Search Notion", firstSearch: "Run first search", price: "XLM price", watchlist: "Watchlist", proof: "Testnet proof", connections: "Connections", notionConnectPrompt: "Connect me to Notion", notionSearchPrompt: "Search my Notion workspace for pending project tasks", pricePrompt: "What is the current XLM price on CoinMarketCap?", watchlistPrompt: "Show my crypto watchlist", proofPrompt: "Start my DeFindex Testnet proof", travalaPrompt: "Connect me to Travala", connectionsPrompt: "What can I connect to?" },
  es: { agent: "Tu agente", controlled: "Stellar Testnet · controlado por políticas", memory: "MEMORIA NEON ACTIVA", loading: "Cargando tu conversación...", thinking: "Revisando capacidades y límites de seguridad", placeholder: "Pide a tu agente buscar en Notion, revisar una conexión o preparar una acción...", send: "Enviar", boundary: "El agente puede preparar acciones. Pagos y operaciones irreversibles siempre requieren autorización específica.", context: "CONTEXTO EN VIVO", contextTitle: "Listo para actuar dentro de tus reglas.", identity: "Identidad", balance: "Saldo", network: "Red", verify: "Verificar wallet on-chain", capabilities: "CAPACIDADES ACTIVAS", readOnly: "solo lectura", help: "AYUDA PERSONAL", notionConnect: "Conectar Notion", notionSearch: "Buscar en Notion", firstSearch: "Primera búsqueda", price: "Precio XLM", watchlist: "Watchlist", proof: "Prueba Testnet", connections: "Conexiones", notionConnectPrompt: "Conéctame con Notion", notionSearchPrompt: "Busca en mi Notion las tareas pendientes", pricePrompt: "¿Cuál es el precio actual de XLM en CoinMarketCap?", watchlistPrompt: "Muéstrame mi watchlist de criptomonedas", proofPrompt: "Inicia mi prueba DeFindex en Testnet", travalaPrompt: "Conéctame con Travala", connectionsPrompt: "¿Qué puedo conectar?" },
  pt: { agent: "Seu agente", controlled: "Stellar Testnet · controlado por políticas", memory: "MEMÓRIA NEON ATIVA", loading: "Carregando sua conversa...", thinking: "Verificando capacidades e limites de segurança", placeholder: "Peça ao agente para pesquisar no Notion, verificar uma conexão ou preparar uma ação...", send: "Enviar", boundary: "O agente pode preparar ações. Pagamentos e operações irreversíveis sempre exigem autorização específica.", context: "CONTEXTO AO VIVO", contextTitle: "Pronto para agir dentro das suas regras.", identity: "Identidade", balance: "Saldo", network: "Rede", verify: "Verificar wallet on-chain", capabilities: "CAPACIDADES ATIVAS", readOnly: "somente leitura", help: "AJUDA PESSOAL", notionConnect: "Conectar Notion", notionSearch: "Pesquisar no Notion", firstSearch: "Primeira pesquisa", price: "Preço do XLM", watchlist: "Watchlist", proof: "Prova Testnet", connections: "Conexões", notionConnectPrompt: "Conecte-me ao Notion", notionSearchPrompt: "Pesquise no meu Notion as tarefas pendentes", pricePrompt: "Qual é o preço atual do XLM no CoinMarketCap?", watchlistPrompt: "Mostre minha watchlist de criptomoedas", proofPrompt: "Inicie minha prova DeFindex na Testnet", travalaPrompt: "Conecte-me à Travala", connectionsPrompt: "O que posso conectar?" },
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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
      setMessages((current) => [
        ...current.filter((item) => item.id !== optimisticId),
        body.userMessage,
        body.assistantMessage,
      ]);
      setStatus("ready");
      if (message.toLowerCase().includes("defindex")) {
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
      setDefindexStatus(await defindexFetch());
    } catch (caught) {
      setDefindexNotice(caught instanceof Error ? caught.message : "DeFindex status failed");
    } finally {
      setDefindexBusy(null);
    }
  }

  async function prepareDefindex(
    operation: "usdc_trustline" | "deposit",
    asset?: "XLM" | "USDC",
    amount?: string,
  ) {
    setDefindexBusy(operation + (asset ?? ""));
    setDefindexNotice(null);
    setDefindexApproval(null);
    try {
      const result = await defindexFetch({
        action: "prepare",
        operation,
        ...(asset ? { asset, amount } : {}),
        requestId: crypto.randomUUID(),
      });
      if (result.alreadyComplete) {
        setDefindexNotice(result.message);
        await loadDefindex();
      } else {
        setDefindexApproval(result.approval);
      }
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "DeFindex preparation failed";
      setDefindexNotice(
        code === "usdc_trustline_required"
          ? "Enable the exact DeFindex USDC trustline first."
          : code,
      );
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
          ? "This action was already confirmed. The same receipt was returned."
          : "Confirmed on Stellar Testnet. The receipt is now available.",
      );
      setDefindexStatus(await defindexFetch());
    } catch (caught) {
      setDefindexNotice(
        caught instanceof Error ? caught.message : "DeFindex execution failed",
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
                <span>DEFINDEX · STELLAR TESTNET</span>
                <h3>Deposit through the agent, with explicit approval.</h3>
              </div>
              <button type="button" onClick={() => setDefindexOpen(false)}>Close</button>
            </header>
            {defindexBusy === "status" && <p className="defindex-agent-loading">Reading public vaults and your wallet...</p>}
            {defindexStatus && (
              <div className="defindex-agent-grid">
                <article>
                  <strong>XLM vault</strong>
                  <span>Wallet balance: {walletBalance} XLM</span>
                  <span>Vault shares: {defindexStatus.positions.XLM?.shares ?? "0"}</span>
                  <label>
                    Amount
                    <input value={xlmDepositAmount} onChange={(event) => setXlmDepositAmount(event.target.value)} inputMode="decimal" />
                  </label>
                  <button
                    type="button"
                    disabled={Boolean(defindexBusy)}
                    onClick={() => void prepareDefindex("deposit", "XLM", xlmDepositAmount)}
                  >
                    {defindexBusy === "depositXLM" ? "Simulating..." : "Review XLM deposit"}
                  </button>
                </article>
                <article>
                  <strong>USDC vault</strong>
                  <span>Trustline: {defindexStatus.usdcTrustline.active ? "active" : "required"}</span>
                  <span>Wallet balance: {defindexStatus.usdcTrustline.balance} USDC</span>
                  <span>Vault shares: {defindexStatus.positions.USDC?.shares ?? "0"}</span>
                  {!defindexStatus.usdcTrustline.active ? (
                    <button
                      type="button"
                      disabled={Boolean(defindexBusy)}
                      onClick={() => void prepareDefindex("usdc_trustline")}
                    >
                      {defindexBusy === "usdc_trustline" ? "Preparing..." : "Review USDC trustline"}
                    </button>
                  ) : (
                    <>
                      <label>
                        Amount
                        <input value={usdcDepositAmount} onChange={(event) => setUsdcDepositAmount(event.target.value)} inputMode="decimal" />
                      </label>
                      <button
                        type="button"
                        disabled={Boolean(defindexBusy) || Number(defindexStatus.usdcTrustline.balance) <= 0}
                        onClick={() => void prepareDefindex("deposit", "USDC", usdcDepositAmount)}
                      >
                        {defindexBusy === "depositUSDC" ? "Simulating..." : "Review USDC deposit"}
                      </button>
                    </>
                  )}
                  {defindexStatus.usdcTrustline.active && Number(defindexStatus.usdcTrustline.balance) <= 0 && (
                    <small>Trustline ready. The wallet still needs the exact Blend Testnet USDC before a deposit can be simulated.</small>
                  )}
                </article>
              </div>
            )}
            {defindexApproval && (
              <div className={"defindex-approval " + defindexApproval.status}>
                <span>EXACT ACTION FOR SIGNATURE</span>
                <h4>{defindexApproval.preview.title}</h4>
                <p>{defindexApproval.preview.description}</p>
                <dl>
                  <div><dt>{ui.network}</dt><dd>{defindexApproval.preview.network}</dd></div>
                  <div><dt>Asset</dt><dd>{defindexApproval.preview.asset}</dd></div>
                  <div><dt>Amount</dt><dd>{defindexApproval.preview.amount}</dd></div>
                  <div><dt>Destination</dt><dd>{defindexApproval.preview.destination}</dd></div>
                  <div><dt>Auto-invest request</dt><dd>{defindexApproval.preview.invest ? "Yes" : "No"}</dd></div>
                </dl>
                {defindexApproval.status === "prepared" ? (
                  <button type="button" disabled={Boolean(defindexBusy)} onClick={() => void confirmDefindex()}>
                    {defindexBusy === "execute" ? "Signing and submitting..." : "Confirm and sign with Privy"}
                  </button>
                ) : defindexApproval.explorerUrl ? (
                  <a href={defindexApproval.explorerUrl} target="_blank" rel="noreferrer">Open transaction receipt</a>
                ) : null}
              </div>
            )}
            {defindexNotice && <p className="defindex-agent-notice">{defindexNotice}</p>}
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
          <div><dt>{ui.balance}</dt><dd>{walletBalance} XLM</dd></div>
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
