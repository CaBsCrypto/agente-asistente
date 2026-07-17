"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "../language-toggle";

type AutopilotState = {
  status: "off" | "active" | "paused" | "expired";
  config: {
    durationHours: number;
    xlmPerAction: number;
    usdcPerAction: number;
    maxDailyActions: number;
    allowedProviders: string[];
    expiresAt?: string;
    executionMode: "policy_only" | "delegated";
  };
  signer: {
    ready: boolean;
    status: "manual_signature_required" | "delegated";
  };
};

const copy = {
  en: {
    eyebrow: "DELEGATED AUTONOMY",
    title: "Testnet Autopilot",
    text: "Activate one time-bound authority envelope. The agent acts only inside the network, providers and spending limits shown here.",
    off: "OFF",
    active: "ACTIVE",
    paused: "PAUSED",
    expired: "EXPIRED",
    green: "LOW RISK",
    greenTitle: "Automatic now",
    greenText: "Prices, balances, Travala search, receipts and duplicate checks. Read-only and no signature.",
    amber: "CONTROLLED",
    amberTitle: "Policy automated",
    amberText: "Testnet funding, trustlines and exact intent preparation. Logged and constrained before execution.",
    red: "HIGH RISK",
    redTitle: "Signer gated",
    redText: "DeFindex deposits and x402 settlement move Testnet assets. Privy still requests a wallet signature until a delegated Stellar signer is configured.",
    network: "Network",
    networkValue: "Stellar Testnet only",
    xlm: "Per action",
    usdc: "Per action",
    daily: "Daily decisions",
    duration: "Authorization duration",
    hours: "hours",
    acknowledge: "I understand that Testnet transactions are public, irreversible and may consume network fees.",
    activate: "Activate Testnet Autopilot",
    activating: "Activating...",
    pause: "Pause immediately",
    pausing: "Pausing...",
    expires: "Expires",
    signerReady: "Privy delegated signer ready",
    signerManual: "Policy active · Privy signature still manual",
    boundary: "Mainnet is always blocked. Pausing removes delegated policy authority immediately.",
  },
  es: {
    eyebrow: "AUTONOMÍA DELEGADA",
    title: "Piloto automático Testnet",
    text: "Activa una autorización temporal. El agente solo puede actuar dentro de la red, proveedores y límites de gasto mostrados aquí.",
    off: "APAGADO",
    active: "ACTIVO",
    paused: "PAUSADO",
    expired: "EXPIRADO",
    green: "RIESGO BAJO",
    greenTitle: "Automático ahora",
    greenText: "Precios, balances, búsqueda Travala, recibos y pruebas de duplicados. Solo lectura y sin firma.",
    amber: "CONTROLADO",
    amberTitle: "Política automatizada",
    amberText: "Fondos Testnet, trustlines y preparación exacta de intenciones. Todo queda registrado y limitado antes de ejecutar.",
    red: "RIESGO ALTO",
    redTitle: "Protegido por firma",
    redText: "Los depósitos DeFindex y pagos x402 mueven activos Testnet. Privy todavía solicita firma hasta configurar un signer Stellar delegado.",
    network: "Red",
    networkValue: "Solo Stellar Testnet",
    xlm: "Por acción",
    usdc: "Por acción",
    daily: "Decisiones diarias",
    duration: "Duración de la autorización",
    hours: "horas",
    acknowledge: "Entiendo que las transacciones Testnet son públicas, irreversibles y pueden consumir comisiones de red.",
    activate: "Activar piloto automático",
    activating: "Activando...",
    pause: "Pausar inmediatamente",
    pausing: "Pausando...",
    expires: "Expira",
    signerReady: "Signer delegado de Privy listo",
    signerManual: "Política activa · firma Privy aún manual",
    boundary: "Mainnet siempre está bloqueado. Pausar elimina inmediatamente la autoridad delegada de la política.",
  },
  pt: {
    eyebrow: "AUTONOMIA DELEGADA",
    title: "Piloto automático Testnet",
    text: "Ative uma autorização temporária. O agente só atua dentro da rede, provedores e limites exibidos aqui.",
    off: "DESLIGADO",
    active: "ATIVO",
    paused: "PAUSADO",
    expired: "EXPIRADO",
    green: "RISCO BAIXO",
    greenTitle: "Automático agora",
    greenText: "Preços, saldos, busca Travala, recibos e testes de duplicidade. Somente leitura e sem assinatura.",
    amber: "CONTROLADO",
    amberTitle: "Política automatizada",
    amberText: "Fundos Testnet, trustlines e preparação exata de intenções. Tudo registrado e limitado antes da execução.",
    red: "RISCO ALTO",
    redTitle: "Protegido por assinatura",
    redText: "Depósitos DeFindex e pagamentos x402 movem ativos Testnet. A Privy ainda solicita assinatura até configurar um signer Stellar delegado.",
    network: "Rede",
    networkValue: "Somente Stellar Testnet",
    xlm: "Por ação",
    usdc: "Por ação",
    daily: "Decisões diárias",
    duration: "Duração da autorização",
    hours: "horas",
    acknowledge: "Entendo que transações Testnet são públicas, irreversíveis e podem consumir taxas de rede.",
    activate: "Ativar piloto automático",
    activating: "Ativando...",
    pause: "Pausar imediatamente",
    pausing: "Pausando...",
    expires: "Expira",
    signerReady: "Signer delegado da Privy pronto",
    signerManual: "Política ativa · assinatura Privy ainda manual",
    boundary: "Mainnet permanece bloqueada. Pausar remove imediatamente a autoridade delegada da política.",
  },
};

export default function AutopilotControl({
  getAccessToken,
}: {
  getAccessToken: () => Promise<string | null>;
}) {
  const { locale } = useLocale();
  const t = copy[locale];
  const [state, setState] = useState<AutopilotState | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [durationHours, setDurationHours] = useState<1 | 8 | 24>(24);
  const [busy, setBusy] = useState<"activate" | "pause" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(async (body?: Record<string, unknown>) => {
    const token = await getAccessToken();
    if (!token) throw new Error("Authentication token unavailable");
    const response = await fetch("/api/agent/autopilot", {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: "Bearer " + token,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Autopilot unavailable");
    return result as AutopilotState;
  }, [getAccessToken]);

  const load = useCallback(async () => {
    try {
      setState(await request());
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Autopilot unavailable");
    }
  }, [request]);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  async function mutate(action: "activate" | "pause") {
    setBusy(action);
    setError(null);
    try {
      const result = await request(action === "activate"
        ? {
            action,
            acknowledged: true,
            durationHours,
            xlmPerAction: 5,
            usdcPerAction: 0.05,
            maxDailyActions: 10,
          }
        : { action });
      setState(result);
      setAcknowledged(false);
      window.dispatchEvent(new Event("agent-memory-updated"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Autopilot could not be updated");
    } finally {
      setBusy(null);
    }
  }

  const status = state?.status ?? "off";
  const statusLabel = t[status];
  const active = status === "active";

  return (
    <section className={"autopilot-control " + status} aria-labelledby="autopilot-title">
      <header>
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <h3 id="autopilot-title">{t.title}</h3>
          <p>{t.text}</p>
        </div>
        <span className="autopilot-status"><i />{statusLabel}</span>
      </header>

      <div className="autopilot-risk-grid">
        <article className="low"><span>{t.green}</span><h4>{t.greenTitle}</h4><p>{t.greenText}</p></article>
        <article className="controlled"><span>{t.amber}</span><h4>{t.amberTitle}</h4><p>{t.amberText}</p></article>
        <article className="high"><span>{t.red}</span><h4>{t.redTitle}</h4><p>{t.redText}</p></article>
      </div>

      <dl className="autopilot-limits">
        <div><dt>{t.network}</dt><dd>{t.networkValue}</dd></div>
        <div><dt>{t.xlm}</dt><dd>5 XLM</dd></div>
        <div><dt>{t.usdc}</dt><dd>0.05 USDC</dd></div>
        <div><dt>{t.daily}</dt><dd>10</dd></div>
      </dl>

      <div className="autopilot-signer">
        <i />
        <div>
          <strong>{state?.signer.ready ? t.signerReady : t.signerManual}</strong>
          {active && state?.config.expiresAt && <small>{t.expires}: {new Date(state.config.expiresAt).toLocaleString()}</small>}
        </div>
      </div>

      {!active ? (
        <div className="autopilot-activation">
          <label>
            <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />
            <span>{t.acknowledge}</span>
          </label>
          <div>
            <label>{t.duration}
              <select value={durationHours} onChange={(event) => setDurationHours(Number(event.target.value) as 1 | 8 | 24)}>
                <option value={1}>1 {t.hours}</option>
                <option value={8}>8 {t.hours}</option>
                <option value={24}>24 {t.hours}</option>
              </select>
            </label>
            <button disabled={!acknowledged || Boolean(busy)} onClick={() => void mutate("activate")}>
              {busy === "activate" ? t.activating : t.activate}
            </button>
          </div>
        </div>
      ) : (
        <button className="autopilot-pause" disabled={Boolean(busy)} onClick={() => void mutate("pause")}>
          {busy === "pause" ? t.pausing : t.pause}
        </button>
      )}

      {error && <p className="autopilot-error">{error}</p>}
      <small className="autopilot-boundary">{t.boundary}</small>
    </section>
  );
}
