"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Readiness = {
  state: "checking" | "ready" | "degraded";
  persistence: string;
  checkedAt: string;
};

const recordingSteps = [
  { time: "0–20s", status: "LIVE", title: "Identity + user-owned wallet", description: "Sign in through Privy and show the Stellar Testnet address, balance and explorer link.", href: "/agent", action: "Open agent" },
  { time: "20–45s", status: "LIVE", title: "One useful external connection", description: "Ask for the current XLM price or search Travala. Keep the action read-only and timestamped.", href: "/agent", action: "Use live connection" },
  { time: "45–60s", status: "OPTIONAL", title: "Permissioned app connection", description: "Show Notion only after its real OAuth acceptance test succeeds twice. Otherwise state that validation is pending.", href: "/connections", action: "Review integrations" },
  { time: "60–90s", status: "SANDBOX", title: "Duplicate-resistant execution", description: "Run the action below twice and show that the second request returns the original receipt.", href: "#safety-proof", action: "Run safety proof" },
];

const script = `Every user gets a user-owned Stellar wallet automatically. Login establishes identity, but it never authorizes a payment.

The agent can use real external data through narrow, permissioned connections. This read-only action cannot trade or move funds.

Before a sensitive action, agent-assistant freezes the merchant, asset, amount and expiry, evaluates policy and asks for explicit approval.

Settlement in this safety console is simulated. The intent, authorization and receipt are durable, and retrying the execution returns the original receipt instead of creating a duplicate charge. The next proof is the same lifecycle with one Privy-signed DeFindex transaction on Stellar Testnet.`;

export default function RecordingGuide() {
  const [readiness, setReadiness] = useState<Readiness>({ state: "checking", persistence: "checking", checkedAt: "" });
  const [copied, setCopied] = useState(false);

  const checkReadiness = useCallback(async () => {
    setReadiness((current) => ({ ...current, state: "checking" }));
    try {
      const [healthResponse, commerceResponse] = await Promise.all([
        fetch("/api/health", { cache: "no-store" }),
        fetch("/api/commerce", { cache: "no-store" }),
      ]);
      if (!healthResponse.ok || !commerceResponse.ok) throw new Error("preflight_failed");
      const health = (await healthResponse.json()) as { persistence?: string };
      const commerce = (await commerceResponse.json()) as { persistence?: string };
      setReadiness({
        state: "ready",
        persistence: commerce.persistence ?? health.persistence ?? "available",
        checkedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
    } catch {
      setReadiness({ state: "degraded", persistence: "unavailable", checkedAt: "" });
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void checkReadiness(), 0);
    return () => window.clearTimeout(timer);
  }, [checkReadiness]);

  async function copyScript() {
    await navigator.clipboard.writeText(script);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="recording-guide shell" aria-labelledby="recording-title">
      <header className="recording-guide-header">
        <div>
          <p className="eyebrow">YC RECORDING MODE</p>
          <h2 id="recording-title">A reliable story in four short clips.</h2>
          <p>Record each proof separately, then assemble the cleanest 90 seconds. No wallet action is required for the safety proof below.</p>
        </div>
        <div className={`recording-preflight ${readiness.state}`}>
          <span><i />{readiness.state === "checking" ? "CHECKING" : readiness.state === "ready" ? "READY TO RECORD" : "CHECK REQUIRED"}</span>
          <strong>{readiness.state === "ready" ? "Backend and commerce sandbox available" : readiness.state === "checking" ? "Running safe preflight…" : "One demo dependency did not respond"}</strong>
          <small>{readiness.state === "ready" ? `${readiness.persistence} persistence · checked ${readiness.checkedAt}` : "No funds or wallet signatures were attempted."}</small>
          <button type="button" onClick={() => void checkReadiness()} disabled={readiness.state === "checking"}>Check again</button>
        </div>
      </header>

      <div className="recording-steps">
        {recordingSteps.map((step) => (
          <article key={step.time}>
            <header><b>{step.time}</b><span className={step.status.toLowerCase()}>{step.status}</span></header>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
            <Link href={step.href}>{step.action} →</Link>
          </article>
        ))}
      </div>

      <div className="recording-script">
        <div><span>NARRATION</span><strong>Use verified language, not future claims.</strong></div>
        <p>{script}</p>
        <button type="button" onClick={() => void copyScript()}>{copied ? "Copied" : "Copy 90-second script"}</button>
      </div>
    </section>
  );
}