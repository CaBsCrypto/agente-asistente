"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Readiness = {
  state: "checking" | "ready" | "degraded";
  persistence: string;
  checkedAt: string;
};

const recordingSteps = [
  { time: "0-20s", status: "LIVE", title: "Identity + user-owned wallet", description: "Sign in with Privy and show the Stellar Testnet wallet linked to this user.", href: "/agent", action: "Open agent" },
  { time: "20-45s", status: "LIVE", title: "One real x402 payment", description: "Open the latest x402 receipt: 0.01 USDC, one Privy approval and an explorer-verifiable transaction.", href: "/agent", action: "Open x402 receipt" },
  { time: "45-65s", status: "LIVE", title: "Zero-debit replay", description: "Replay the same payment ID and show the same hash with an unchanged 0.49 USDC balance.", href: "/agent", action: "Verify duplicate protection" },
  { time: "65-90s", status: "LIVE", title: "Useful agent connection", description: "Search live Travala inventory to show that the same agent also discovers real services without spending.", href: "/agent", action: "Search Travala" },
];

const script = `Every user gets a user-owned Stellar wallet through Privy. Login establishes identity, but it never authorizes a payment.

From the chat, the user approved exactly 0.01 USDC for the official Stellar x402 resource. Privy signed only that authorization and the transaction settled on Stellar Testnet.

The payment intent, delivery evidence and transaction hash are stored in Neon. Replaying the same payment returns the original receipt: the hash is identical and the second debit is zero.

The same agent can also search live Travala inventory without moving funds. We are building the control and commerce layer that lets agents act for people safely.`;

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
          <p>Record each proof separately, then assemble the cleanest 90 seconds. Replaying the existing receipt is read-only and requires no new signature.</p>
        </div>
        <div className={`recording-preflight ${readiness.state}`}>
          <span><i />{readiness.state === "checking" ? "CHECKING" : readiness.state === "ready" ? "READY TO RECORD" : "CHECK REQUIRED"}</span>
          <strong>{readiness.state === "ready" ? "Backend and Postgres available" : readiness.state === "checking" ? "Running safe preflight…" : "One demo dependency did not respond"}</strong>
          <small>{readiness.state === "ready" ? `${readiness.persistence} persistence · checked ${readiness.checkedAt}` : "No new payment or wallet signature was attempted."}</small>
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