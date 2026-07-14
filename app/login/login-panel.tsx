"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPanel({ configured }: { configured: boolean }) {
  if (!configured) return <LoginSetupRequired />;
  return <PrivyLogin />;
}

function LoginSetupRequired() {
  return (
    <section className="login-shell shell">
      <div className="login-copy">
        <p className="eyebrow">SECURE ACCOUNT ACCESS</p>
        <h1>Privy credentials are required.</h1>
        <p>The login experience is ready but its public App ID is not configured in this environment.</p>
      </div>
      <aside className="login-card">
        <strong>Missing configuration</strong>
        <code>NEXT_PUBLIC_PRIVY_APP_ID</code>
      </aside>
    </section>
  );
}

function PrivyLogin() {
  const { ready, authenticated, login } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (ready && authenticated) router.replace("/agent");
  }, [authenticated, ready, router]);

  return (
    <section className="login-shell shell">
      <div className="login-copy">
        <p className="eyebrow">YOUR AGENT ACCOUNT</p>
        <h1>One login for your agent, wallet and history.</h1>
        <p>
          Continue securely with email, Google or a passkey. Privy manages your
          identity and wallet authorization; agent-assistant stores only the
          account profile and activity required to operate.
        </p>
        <button className="agent-primary" disabled={!ready} onClick={() => login()}>
          {ready ? "Sign in or create account" : "Preparing secure sign-in..."}
        </button>
        <small>No wallet password, seed phrase or private key is stored by agent-assistant.</small>
      </div>
      <aside className="login-card">
        <header><span>ACCOUNT INCLUDES</span><b>STELLAR TESTNET</b></header>
        <ol>
          <li><b>01</b><span>Privy identity and secure session</span></li>
          <li><b>02</b><span>Automatic user-owned Stellar wallet</span></li>
          <li><b>03</b><span>Neon-backed profile and activity history</span></li>
          <li><b>04</b><span>Policies, intents and receipts linked to you</span></li>
        </ol>
      </aside>
    </section>
  );
}