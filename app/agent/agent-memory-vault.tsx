"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "../language-toggle";

type VaultItem = {
  id: string;
  record: "knowledge" | "policy";
  kind: string;
  label: string;
  content?: string;
  enforcement?: string;
  sensitivity: string;
  status: string;
  source: string;
  updatedAt: string;
};

type Decision = {
  id: string;
  actionType: string;
  outcome: string;
  reasonCodes: string[];
  explanation: {
    summary?: string;
    appliedRules?: string[];
    requiresApproval?: boolean;
  };
  createdAt: string;
};

type Vault = {
  knowledge: VaultItem[];
  policies: VaultItem[];
  decisions: Decision[];
};

const emptyVault: Vault = { knowledge: [], policies: [], decisions: [] };

const copy = {
  en: {
    eyebrow: "PERSONAL EXECUTION VAULT",
    title: "My Agent",
    text: "Teach preferences, set hard limits and review how every action was decided.",
    placeholder: "I prefer quiet hotels with a desk...",
    save: "Remember this",
    saving: "Saving...",
    knowledge: "Knowledge",
    rules: "Rules",
    decisions: "Decisions",
    empty: "Nothing here yet.",
    active: "Active",
    paused: "Paused",
    draft: "Draft",
    pause: "Pause",
    activate: "Activate",
    remove: "Delete",
    source: "Source",
    why: "Why",
    approval: "Explicit approval",
    refresh: "Refresh",
    examples: ["Only operate on Testnet", "Maximum 5 XLM per action", "Ask me before every payment"],
  },
  es: {
    eyebrow: "PERSONAL EXECUTION VAULT",
    title: "My Agent",
    text: "Ens\u00e9\u00f1ale tus preferencias, define l\u00edmites estrictos y revisa c\u00f3mo decidi\u00f3 cada acci\u00f3n.",
    placeholder: "Prefiero hoteles tranquilos y con escritorio...",
    save: "Recordar esto",
    saving: "Guardando...",
    knowledge: "Conocimiento",
    rules: "Reglas",
    decisions: "Decisiones",
    empty: "Todav\u00eda no hay registros.",
    active: "Activa",
    paused: "Pausada",
    draft: "Borrador",
    pause: "Pausar",
    activate: "Activar",
    remove: "Eliminar",
    source: "Fuente",
    why: "Por qu\u00e9",
    approval: "Aprobaci\u00f3n expl\u00edcita",
    refresh: "Actualizar",
    examples: ["Solo opero en Testnet", "M\u00e1ximo 5 XLM por operaci\u00f3n", "Preg\u00fantame antes de cada pago"],
  },
  pt: {
    eyebrow: "PERSONAL EXECUTION VAULT",
    title: "My Agent",
    text: "Ensine suas prefer\u00eancias, defina limites r\u00edgidos e revise como cada a\u00e7\u00e3o foi decidida.",
    placeholder: "Prefiro hot\u00e9is tranquilos e com mesa...",
    save: "Lembrar disso",
    saving: "Salvando...",
    knowledge: "Conhecimento",
    rules: "Regras",
    decisions: "Decis\u00f5es",
    empty: "Ainda n\u00e3o h\u00e1 registros.",
    active: "Ativa",
    paused: "Pausada",
    draft: "Rascunho",
    pause: "Pausar",
    activate: "Ativar",
    remove: "Excluir",
    source: "Fonte",
    why: "Por qu\u00ea",
    approval: "Aprova\u00e7\u00e3o expl\u00edcita",
    refresh: "Atualizar",
    examples: ["Opero somente na Testnet", "M\u00e1ximo 5 XLM por opera\u00e7\u00e3o", "Pergunte antes de cada pagamento"],
  },
};

export default function AgentMemoryVault({
  getAccessToken,
}: {
  getAccessToken: () => Promise<string | null>;
}) {
  const { locale } = useLocale();
  const t = copy[locale];
  const [vault, setVault] = useState<Vault>(emptyVault);
  const [tab, setTab] = useState<"knowledge" | "policies" | "decisions">("knowledge");
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(async (init?: RequestInit) => {
    const token = await getAccessToken();
    if (!token) throw new Error("Authentication token unavailable");
    const response = await fetch("/api/agent/memory", {
      ...init,
      headers: {
        Authorization: "Bearer " + token,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
      },
      cache: "no-store",
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "Memory request failed");
    return body;
  }, [getAccessToken]);

  const load = useCallback(async () => {
    try {
      setStatus("loading");
      setVault(await request());
      setError(null);
      setStatus("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Memory unavailable");
      setStatus("error");
    }
  }, [request]);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    const refresh = () => void load();
    window.addEventListener("agent-memory-updated", refresh);
    return () => {
      window.clearTimeout(task);
      window.removeEventListener("agent-memory-updated", refresh);
    };
  }, [load]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const value = draft.trim();
    if (!value) return;
    setStatus("saving");
    setError(null);
    try {
      const prefix = locale === "es" ? "Recuerda que " : locale === "pt" ? "Lembre que " : "Remember that ";
      const created = await request({
        method: "POST",
        body: JSON.stringify({ text: prefix + value }),
      });
      if (created.item?.record === "policy") setTab("policies");
      setDraft("");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Memory could not be saved");
      setStatus("error");
    }
  }

  async function mutate(item: VaultItem, action: "toggle" | "delete") {
    setError(null);
    try {
      if (action === "delete") {
        await request({
          method: "DELETE",
          body: JSON.stringify({ record: item.record, id: item.id }),
        });
      } else {
        await request({
          method: "PATCH",
          body: JSON.stringify({
            record: item.record,
            id: item.id,
            status: item.status === "active" ? "paused" : "active",
          }),
        });
      }
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Memory could not be updated");
      setStatus("error");
    }
  }

  const items = tab === "knowledge" ? vault.knowledge : vault.policies;

  return (
    <section className="agent-memory-vault" id="my-agent">
      <header>
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <h2>{t.title}</h2>
          <p>{t.text}</p>
        </div>
        <div className="agent-memory-score">
          <strong>{vault.knowledge.filter((item) => item.status === "active").length + vault.policies.filter((item) => item.status === "active").length}</strong>
          <span>active controls</span>
        </div>
      </header>

      <form onSubmit={save}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t.placeholder}
          maxLength={1000}
          aria-label={t.placeholder}
        />
        <button disabled={!draft.trim() || status === "saving"}>
          {status === "saving" ? t.saving : t.save}
        </button>
      </form>

      <div className="agent-memory-examples">
        {t.examples.map((example) => (
          <button type="button" key={example} onClick={() => setDraft(example)}>
            + {example}
          </button>
        ))}
      </div>

      <nav aria-label="Personal agent configuration">
        <button className={tab === "knowledge" ? "active" : ""} onClick={() => setTab("knowledge")}>
          {t.knowledge} <b>{vault.knowledge.length}</b>
        </button>
        <button className={tab === "policies" ? "active" : ""} onClick={() => setTab("policies")}>
          {t.rules} <b>{vault.policies.length}</b>
        </button>
        <button className={tab === "decisions" ? "active" : ""} onClick={() => setTab("decisions")}>
          {t.decisions} <b>{vault.decisions.length}</b>
        </button>
        <button className="refresh" onClick={() => void load()}>{t.refresh}</button>
      </nav>

      {error && <p className="agent-memory-error">{error}</p>}

      {tab !== "decisions" ? (
        <div className="agent-memory-list">
          {!items.length && <p className="agent-memory-empty">{t.empty}</p>}
          {items.map((item) => (
            <article key={item.id} className={item.status}>
              <div className="agent-memory-kind">{item.kind.replaceAll("_", " ")}</div>
              <div>
                <h3>{item.label}</h3>
                {item.content && item.content !== item.label && <p>{item.content}</p>}
                <small>{t.source}: {item.source} {"\u00b7"} {new Date(item.updatedAt).toLocaleDateString()}</small>
              </div>
              <aside>
                <span>{item.status === "active" ? t.active : item.status === "draft" ? t.draft : t.paused}</span>
                <button onClick={() => void mutate(item, "toggle")}>
                  {item.status === "active" ? t.pause : t.activate}
                </button>
                <button className="delete" onClick={() => void mutate(item, "delete")}>{t.remove}</button>
              </aside>
            </article>
          ))}
        </div>
      ) : (
        <div className="agent-decision-list">
          {!vault.decisions.length && <p className="agent-memory-empty">{t.empty}</p>}
          {vault.decisions.map((decision) => (
            <article key={decision.id} className={decision.outcome}>
              <div>
                <span>{decision.outcome}</span>
                <strong>{decision.actionType}</strong>
                <time>{new Date(decision.createdAt).toLocaleString()}</time>
              </div>
              <p>{decision.explanation.summary ?? decision.reasonCodes.join(", ")}</p>
              <details>
                <summary>{t.why}</summary>
                <ul>
                  {(decision.explanation.appliedRules ?? decision.reasonCodes).map((reason) => <li key={reason}>{reason}</li>)}
                  {decision.explanation.requiresApproval && <li>{t.approval}</li>}
                </ul>
              </details>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

