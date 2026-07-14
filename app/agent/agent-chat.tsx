"use client";

import { useEffect, useRef, useState } from "react";

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "sending" | "error">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [connections, setConnections] = useState<ExternalConnection[]>([]);
  const [connectionNotice, setConnectionNotice] = useState<string | null>(null);
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
              <strong>Your agent</strong>
              <small>Stellar Testnet · policy-controlled</small>
            </div>
          </div>
          <span className="agent-chat-memory">NEON MEMORY ON</span>
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
                    "Search my Notion workspace for pending project tasks",
                  )
                }
              >
                Run first search
              </button>
            )}
          </div>
        )}

        <div className="agent-chat-thread" aria-live="polite">
          {status === "loading" && (
            <div className="agent-chat-loading">
              <i />
              <span>Loading your conversation...</span>
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
              <span>Checking capabilities and safety boundaries</span>
            </div>
          )}
          <div ref={endRef} />
        </div>

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
            placeholder="Ask your agent to search Notion, check a connection or prepare an action..."
            rows={2}
            maxLength={2000}
          />
          <button disabled={!draft.trim() || status === "sending"}>Send</button>
        </form>
        <small className="agent-chat-boundary">
          The agent can prepare actions. Payments and irreversible operations always require scoped authorization.
        </small>
      </div>

      <aside className="agent-chat-context">
        <div>
          <p className="eyebrow">LIVE CONTEXT</p>
          <h2>Ready to act, within your rules.</h2>
        </div>
        <dl>
          <div><dt>Identity</dt><dd>{email}</dd></div>
          <div><dt>Wallet</dt><dd>{walletAddress.slice(0, 8) + "..." + walletAddress.slice(-6)}</dd></div>
          <div><dt>Balance</dt><dd>{walletBalance} XLM</dd></div>
          <div><dt>Network</dt><dd>Stellar Testnet</dd></div>
        </dl>
        <a
          href={"https://stellar.expert/explorer/testnet/account/" + walletAddress}
          target="_blank"
          rel="noreferrer"
        >
          Verify wallet on-chain
        </a>
        <div className="agent-connected-apps">
          <strong>LIVE CAPABILITIES</strong>
          <span>
            CoinMarketCap <i>read only</i>
          </span>
          {connections.map((connection) => (
            <span key={connection.provider}>
              {connection.provider === "notion" ? "Notion" : connection.provider}
              <i>{connection.status}</i>
            </span>
          ))}
        </div>
        <section>
          <strong>PERSONAL HELP</strong>
          <button
            onClick={() =>
              void sendMessage(
                connections.some(
                  (connection) =>
                    connection.provider === "notion" &&
                    connection.status === "active",
                )
                  ? "Search my Notion workspace for pending project tasks"
                  : "Connect me to Notion",
              )
            }
          >
            {connections.some(
              (connection) =>
                connection.provider === "notion" &&
                connection.status === "active",
            )
              ? "Search Notion"
              : "Connect Notion"}
          </button>
          <button
            onClick={() =>
              void sendMessage(
                "What is the current XLM price on CoinMarketCap?",
              )
            }
          >
            XLM price
          </button>
          <button
            onClick={() => void sendMessage("Show my crypto watchlist")}
          >
            Watchlist
          </button>
          <button onClick={() => void sendMessage("Connect me to DeFindex")}>DeFindex</button>
          <button onClick={() => void sendMessage("Connect me to Travala")}>Travala</button>
          <button onClick={() => void sendMessage("What can I connect to?")}>Connections</button>
        </section>
      </aside>
    </section>
  );
}