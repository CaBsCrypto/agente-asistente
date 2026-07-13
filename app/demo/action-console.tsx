"use client";

import { useEffect, useMemo, useState } from "react";

type Offer = {
  id: string;
  merchant: string;
  title: string;
  description: string;
  amount: number;
  currency: "USDC";
  network: string;
  availability: string;
};

type Policy = {
  allowed: boolean;
  reasons: string[];
  evaluatedAt: string;
  policyVersion: string;
};

type Intent = {
  id: string;
  offerId: string;
  amount: number;
  currency: "USDC";
  network: string;
  status: "prepared" | "policy_approved" | "authorized" | "executed" | "rejected";
  idempotencyKey: string;
  createdAt: string;
  expiresAt: string;
  policy?: Policy;
};

type Receipt = {
  id: string;
  intentId: string;
  status: string;
  network: string;
  amount: number;
  currency: "USDC";
  transactionRef: string;
  executedAt: string;
  fulfillment: string;
  replayed: boolean;
};

type Stage = "select" | "prepared" | "policy" | "authorized" | "executed" | "protected";

const stageOrder: Stage[] = ["select", "prepared", "policy", "authorized", "executed", "protected"];

const stageCopy: Record<Stage, [string, string]> = {
  select: ["01", "Select offer"],
  prepared: ["02", "Intent frozen"],
  policy: ["03", "Policy passed"],
  authorized: ["04", "User approved"],
  executed: ["05", "Receipt created"],
  protected: ["06", "Replay blocked"],
};

function makeKey() {
  return `demo-${crypto.randomUUID()}`;
}

function pretty(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ");
}

export default function ActionConsole() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedId, setSelectedId] = useState("defindex-yield-demo");
  const [intent, setIntent] = useState<Intent | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [authorizationToken, setAuthorizationToken] = useState("");
  const [stage, setStage] = useState<Stage>("select");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [persistence, setPersistence] = useState("checking");
  const [idempotencyKey, setIdempotencyKey] = useState(makeKey);

  useEffect(() => {
    fetch("/api/commerce")
      .then(async (response) => {
        if (!response.ok) throw new Error("sandbox_unavailable");
        return response.json() as Promise<{ offers: Offer[]; persistence: string }>;
      })
      .then((result) => {
        setOffers(result.offers);
        setPersistence(result.persistence);
        setSelectedId((current) =>
          result.offers.some((offer) => offer.id === current)
            ? current
            : result.offers[0]?.id ?? current,
        );
      })
      .catch(() => setError("The live sandbox could not load. Please try again."));
  }, []);

  const selected = useMemo(
    () => offers.find((offer) => offer.id === selectedId),
    [offers, selectedId],
  );
  const activeIndex = stageOrder.indexOf(stage);

  async function call<T>(payload: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/commerce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as T & { error?: string };
      if (!response.ok || result.error) throw new Error(result.error || "request_failed");
      return result;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "request_failed";
      setError(`The action stopped safely: ${pretty(message)}.`);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function prepare() {
    if (!selected || !idempotencyKey) return;
    const result = await call<{ intent: Intent; replayed: boolean; persistence: string }>({
      action: "create_intent",
      offerId: selected.id,
      actorId: "public-product-demo",
      idempotencyKey,
    });
    if (!result) return;
    setIntent(result.intent);
    setPersistence(result.persistence);
    setStage("prepared");
  }

  async function evaluatePolicy() {
    if (!intent) return;
    const result = await call<{ intent: Intent }>({ action: "evaluate_policy", intentId: intent.id });
    if (!result) return;
    setIntent(result.intent);
    setStage(result.intent.policy?.allowed ? "policy" : "prepared");
  }

  async function authorize() {
    if (!intent) return;
    const result = await call<{ intent: Intent; authorizationToken: string }>({
      action: "authorize",
      intentId: intent.id,
      explicitUserConfirmation: true,
    });
    if (!result) return;
    setIntent(result.intent);
    setAuthorizationToken(result.authorizationToken);
    setStage("authorized");
  }

  async function execute(replay = false) {
    if (!intent || !authorizationToken) return;
    const result = await call<{ receipt: Receipt }>({
      action: "execute",
      intentId: intent.id,
      authorizationToken,
    });
    if (!result) return;
    setReceipt(result.receipt);
    setStage(replay && result.receipt.replayed ? "protected" : "executed");
  }

  function reset() {
    setIntent(null);
    setReceipt(null);
    setAuthorizationToken("");
    setIdempotencyKey(makeKey());
    setError("");
    setStage("select");
  }

  const nextAction =
    stage === "select" ? ["Prepare intent", prepare] as const
      : stage === "prepared" ? ["Run policy checks", evaluatePolicy] as const
        : stage === "policy" ? ["Approve exact action", authorize] as const
          : stage === "authorized" ? ["Execute simulated action", () => execute(false)] as const
            : stage === "executed" ? ["Try duplicate execution", () => execute(true)] as const
              : ["Start a new action", reset] as const;

  return (
    <section className="action-console shell" aria-label="Live action console">
      <ol className="action-steps">
        {stageOrder.map((item, index) => (
          <li className={index < activeIndex ? "done" : index === activeIndex ? "active" : ""} key={item}>
            <b>{stageCopy[item][0]}</b>
            <span>{stageCopy[item][1]}</span>
          </li>
        ))}
      </ol>

      <div className="action-workspace">
        <div className="action-builder">
          <header>
            <div>
              <p className="eyebrow">ACTION REQUEST</p>
              <h2>{selected?.title ?? "Loading agent-ready offers..."}</h2>
            </div>
            <span className="sandbox-state"><i />{persistence === "postgres" ? "Durable sandbox" : "Demo sandbox"}</span>
          </header>

          <label className="offer-picker">
            <span>Agent-selected offer</span>
            <select disabled={stage !== "select" || busy} value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
              {offers.map((offer) => <option value={offer.id} key={offer.id}>{offer.merchant} — {offer.title}</option>)}
            </select>
          </label>

          {selected && (
            <div className="offer-summary">
              <div><span>Merchant</span><strong>{selected.merchant}</strong></div>
              <div><span>Amount</span><strong>{selected.amount} {selected.currency}</strong></div>
              <div><span>Network</span><strong>{pretty(selected.network)}</strong></div>
              <div><span>Availability</span><strong>{pretty(selected.availability)}</strong></div>
              <p>{selected.description}</p>
            </div>
          )}

          {intent && (
            <div className="intent-proof">
              <div><span>Intent ID</span><code>{intent.id}</code></div>
              <div><span>Idempotency key</span><code>{intent.idempotencyKey}</code></div>
              <div><span>Expires</span><code>{new Date(intent.expiresAt).toLocaleTimeString()}</code></div>
              <div><span>Status</span><code>{pretty(intent.status)}</code></div>
            </div>
          )}

          {intent?.policy && (
            <div className={`policy-result ${intent.policy.allowed ? "pass" : "fail"}`}>
              <strong>{intent.policy.allowed ? "Policy checks passed" : "Policy blocked the action"}</strong>
              <div>{intent.policy.reasons.map((reason) => <span key={reason}>{pretty(reason)}</span>)}</div>
            </div>
          )}

          {error && <p className="action-error" role="alert">{error}</p>}

          <div className="action-controls">
            <button disabled={busy || !selected} onClick={() => nextAction[1]()}>
              {busy ? "Verifying..." : nextAction[0]}
            </button>
            {stage !== "select" && stage !== "protected" && <button className="action-reset" disabled={busy} onClick={reset}>Reset</button>}
          </div>
          <small className="action-disclosure">Live backend, simulated settlement. No wallet signature is requested and no funds move.</small>
        </div>

        <aside className="receipt-panel">
          <header>
            <span>EXECUTION RECEIPT</span>
            <b className={stage === "protected" ? "protected" : ""}>{stage === "protected" ? "REPLAY PROTECTED" : receipt ? "CREATED" : "PENDING"}</b>
          </header>
          {!receipt ? (
            <div className="receipt-empty">
              <i>AA</i>
              <strong>No receipt yet</strong>
              <p>The action must pass policy and explicit approval before execution.</p>
            </div>
          ) : (
            <div className="receipt-details">
              {stage === "protected" && <div className="replay-proof"><strong>No second receipt was created.</strong><span>The original receipt was returned.</span></div>}
              <dl>
                <div><dt>Receipt</dt><dd>{receipt.id}</dd></div>
                <div><dt>Settlement</dt><dd>{pretty(receipt.status)}</dd></div>
                <div><dt>Reference</dt><dd>{receipt.transactionRef}</dd></div>
                <div><dt>Amount</dt><dd>{receipt.amount} {receipt.currency}</dd></div>
                <div><dt>Fulfillment</dt><dd>{pretty(receipt.fulfillment)}</dd></div>
                <div><dt>Replayed</dt><dd>{receipt.replayed ? "Yes — safely" : "No"}</dd></div>
              </dl>
              <small>Payment evidence and fulfillment evidence remain separate.</small>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
