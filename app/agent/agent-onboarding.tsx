"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useRef, useState } from "react";

type BootstrapResult = {
  user: { id: string };
  wallet: {
    id: string;
    address: string;
    chainType: string;
    created: boolean;
    owner: "user";
  };
  walletArchitecture: {
    active: readonly ["stellar"];
    future: readonly ["ethereum", "solana"];
    evmNetworks: readonly ["base", "bnb", "avalanche"];
  };
  account: {
    exists: boolean;
    sequence: string | null;
    balances: { asset: string; balance: string }[];
  };
  activation: "active" | "activated" | "pending";
};

function shortAddress(address: string) {
  return address.slice(0, 12) + "..." + address.slice(-10);
}

export default function AgentOnboarding({ configured }: { configured: boolean }) {
  if (!configured) return <PrivySetupRequired />;
  return <PrivyAgent />;
}

function PrivySetupRequired() {
  return (
    <section className="agent-entry shell">
      <div>
        <p className="eyebrow">ONE-TIME FOUNDER SETUP</p>
        <h1>Automatic wallets are ready for credentials.</h1>
        <p>
          Add the public Privy App ID and server App Secret to enable login.
          Users will not create or manage a wallet password themselves.
        </p>
      </div>
      <aside className="agent-setup-list">
        <strong>Required environment</strong>
        <code>NEXT_PUBLIC_PRIVY_APP_ID</code>
        <code>PRIVY_APP_ID</code>
        <code>PRIVY_APP_SECRET</code>
      </aside>
    </section>
  );
}

function PrivyAgent() {
  const { ready, authenticated, user, login, logout, getAccessToken } = usePrivy();
  const [result, setResult] = useState<BootstrapResult | null>(null);
  const [status, setStatus] = useState<"idle" | "creating" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const bootstrappedFor = useRef<string | null>(null);

  async function bootstrap(force = false) {
    if (!user?.id || (!force && bootstrappedFor.current === user.id)) return;
    bootstrappedFor.current = user.id;
    setStatus("creating");
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Authentication token unavailable");
      const response = await fetch("/api/agent/bootstrap", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Wallet bootstrap failed");
      setResult(body);
      setStatus("ready");
    } catch (caught) {
      bootstrappedFor.current = null;
      setError(caught instanceof Error ? caught.message : "Wallet bootstrap failed");
      setStatus("error");
    }
  }

  useEffect(() => {
    if (!ready || !authenticated || !user?.id) return;
    const task = window.setTimeout(() => void bootstrap(), 0);
    return () => window.clearTimeout(task);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated, user?.id]);

  async function signOut() {
    bootstrappedFor.current = null;
    setResult(null);
    setStatus("idle");
    await logout();
  }

  if (!ready) {
    return (
      <section className="agent-entry shell agent-loading">
        <i />
        <strong>Preparing secure sign-in...</strong>
      </section>
    );
  }

  if (!authenticated) {
    return (
      <section className="agent-entry shell">
        <div>
          <p className="eyebrow">YOUR ALWAYS-READY AGENT</p>
          <h1>Sign in once. Your Stellar wallet arrives with you.</h1>
          <p>
            Continue with email, Google or a passkey. Privy creates the identity;
            agent-assistant provisions one user-owned Stellar wallet through Privy immediately.
          </p>
          <button className="agent-primary" onClick={() => login()}>
            Create my agent
          </button>
          <small>No seed phrase or wallet password required during onboarding.</small>
        </div>
        <aside className="agent-onboarding-preview">
          <header><span>AUTOMATIC ONBOARDING</span><b>TESTNET</b></header>
          <ol>
            <li><b>01</b><span>Authenticate with Privy</span></li>
            <li><b>02</b><span>Create a user-owned Stellar wallet</span></li>
            <li><b>03</b><span>Activate it on Stellar Testnet</span></li>
            <li><b>04</b><span>Open the agent workspace</span></li>
          </ol>
        </aside>
      </section>
    );
  }

  return (
    <section className="agent-workspace shell">
      <header>
        <div>
          <p className="eyebrow">YOUR AGENT</p>
          <h1>{status === "ready" ? "Wallet ready. Agent ready." : "Creating your Stellar wallet..."}</h1>
          <p>{user?.email?.address ?? "Authenticated with Privy"}</p>
        </div>
        <button className="agent-signout" onClick={() => void signOut()}>Sign out</button>
      </header>

      {status === "creating" && (
        <div className="agent-provisioning">
          <i />
          <div><strong>Provisioning automatically</strong><span>Identity - wallet ownership - testnet activation</span></div>
        </div>
      )}

      {status === "error" && (
        <div className="agent-bootstrap-error">
          <strong>We could not finish wallet provisioning.</strong>
          <span>{error}</span>
          <button onClick={() => bootstrap(true)}>Retry safely</button>
        </div>
      )}

      {result && (
        <div className="agent-wallet-grid">
          <article className="agent-wallet-card">
            <header><span>STELLAR WALLET</span><b>{result.activation === "pending" ? "PENDING" : "ACTIVE"}</b></header>
            <div className="agent-wallet-mark">S</div>
            <h2>{shortAddress(result.wallet.address)}</h2>
            <code>{result.wallet.address}</code>
            <dl>
              <div><dt>Ownership</dt><dd>User-owned</dd></div>
              <div><dt>Network</dt><dd>Stellar Testnet</dd></div><div><dt>Provider</dt><dd>Privy native SDK</dd></div>
              <div><dt>Created</dt><dd>{result.wallet.created ? "Just now" : "Existing wallet"}</dd></div>
            </dl>
          </article>
          <div className="agent-ready-panel">
            <p className="eyebrow">AUTOMATIC BOOTSTRAP COMPLETE</p>
            <h2>Your agent now has a wallet identity.</h2>
            <p>
              Future actions can prepare intents and request scoped authorization
              from this wallet. Login alone never authorizes a payment.
            </p>
            <div className="agent-balances">
              {(result.account.balances.length
                ? result.account.balances
                : [{ asset: "XLM", balance: "Activation pending" }]
              ).map((balance) => (
                <span key={balance.asset}><b>{balance.asset}</b>{balance.balance}</span>
              ))}
            </div>
            <a href="/demo">Continue to the action console</a>
          </div>
        </div>
      )}
    </section>
  );
}
