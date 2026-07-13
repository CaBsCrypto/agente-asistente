"use client";

import { useState } from "react";

type Readiness = {
  configured: boolean;
  network: string;
  chainType: string;
  horizonUrl: string;
  friendbotUrl: string;
  mode: string;
};

type Wallet = { id: string; address: string; chainType: string };
type Account = {
  exists: boolean;
  sequence: string | null;
  balances: { asset: string; balance: string }[];
};
type Proof = {
  verified: boolean;
  challenge: string;
  digest: string;
  signature: string;
  encoding: string;
};

function short(value: string, start = 12, end = 8) {
  return value.length <= start + end + 3
    ? value
    : value.slice(0, start) + "..." + value.slice(-end);
}

export default function StellarLab({
  initialReadiness,
}: {
  initialReadiness: Readiness;
}) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [proof, setProof] = useState<Proof | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: string) {
    setBusy(action);
    setError(null);

    try {
      const response = await fetch("/api/admin/stellar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ...(wallet
            ? { walletId: wallet.id, address: wallet.address }
            : {}),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "request_failed");

      if (body.wallet) {
        setWallet(body.wallet);
        setAccount(null);
        setProof(null);
      }
      if (body.account) setAccount(body.account);
      if (body.proof) setProof(body.proof);
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "unknown_error";
      setError(
        code === "privy_not_configured"
          ? "Add PRIVY_APP_ID and PRIVY_APP_SECRET to the environment first."
          : code.replaceAll("_", " "),
      );
    } finally {
      setBusy(null);
    }
  }

  const stages = [
    { label: "Credentials", done: initialReadiness.configured },
    { label: "Wallet", done: Boolean(wallet) },
    { label: "Funded", done: Boolean(account?.exists) },
    { label: "Signature", done: Boolean(proof?.verified) },
  ];

  return (
    <section className="stellar-lab">
      <ol className="stellar-test-progress">
        {stages.map((stage, index) => (
          <li key={stage.label} className={stage.done ? "done" : ""}>
            <b>0{index + 1}</b>
            <span>{stage.label}</span>
          </li>
        ))}
      </ol>

      <div className="stellar-lab-grid">
        <div className="stellar-lab-actions">
          <header>
            <div>
              <p className="eyebrow">FOUNDER TEST HARNESS</p>
              <h2>Run one proof at a time.</h2>
            </div>
            <span className="testnet-pill">TESTNET</span>
          </header>

          {!initialReadiness.configured && (
            <div className="stellar-setup-callout">
              <strong>Connect Privy first</strong>
              <p>
                Set the two server-only environment variables documented below,
                then redeploy. Secrets are never returned to this page.
              </p>
              <code>PRIVY_APP_ID · PRIVY_APP_SECRET</code>
            </div>
          )}

          <article className={wallet ? "complete" : ""}>
            <span>01</span>
            <div>
              <h3>Create a Stellar wallet</h3>
              <p>
                Privy creates an application-controlled test wallet using the
                Stellar chain type. This is infrastructure validation, not the
                final end-user custody model.
              </p>
              {wallet && (
                <dl>
                  <div><dt>Address</dt><dd title={wallet.address}>{short(wallet.address, 18, 12)}</dd></div>
                  <div><dt>Privy wallet ID</dt><dd title={wallet.id}>{short(wallet.id)}</dd></div>
                </dl>
              )}
            </div>
            <button
              disabled={!initialReadiness.configured || Boolean(busy)}
              onClick={() => run("create_wallet")}
            >
              {busy === "create_wallet" ? "Creating..." : wallet ? "Create another" : "Create wallet"}
            </button>
          </article>

          <article className={account?.exists ? "complete" : ""}>
            <span>02</span>
            <div>
              <h3>Fund with Friendbot</h3>
              <p>
                Create the account on Stellar Testnet and receive test XLM. No
                real asset is moved and nothing can reach mainnet.
              </p>
              {account?.exists && (
                <dl>
                  {account.balances.map((balance) => (
                    <div key={balance.asset}><dt>{balance.asset}</dt><dd>{balance.balance}</dd></div>
                  ))}
                </dl>
              )}
            </div>
            <div className="stellar-row-buttons">
              <button disabled={!wallet || Boolean(busy)} onClick={() => run("fund_wallet")}>{busy === "fund_wallet" ? "Funding..." : "Fund"}</button>
              <button className="secondary" disabled={!wallet || Boolean(busy)} onClick={() => run("refresh_account")}>Refresh</button>
            </div>
          </article>

          <article className={proof?.verified ? "complete" : ""}>
            <span>03</span>
            <div>
              <h3>Sign and verify a challenge</h3>
              <p>
                Privy signs a unique SHA-256 digest. Stellar SDK verifies the
                Ed25519 signature against the public address on our server.
              </p>
              {proof && (
                <dl>
                  <div><dt>Verified</dt><dd>{proof.verified ? "YES" : "NO"}</dd></div>
                  <div><dt>Digest</dt><dd title={proof.digest}>{short(proof.digest)}</dd></div>
                </dl>
              )}
            </div>
            <button disabled={!wallet || Boolean(busy)} onClick={() => run("sign_challenge")}>{busy === "sign_challenge" ? "Signing..." : "Sign challenge"}</button>
          </article>

          {error && <p className="stellar-lab-error">{error}</p>}
        </div>

        <aside className="stellar-proof-panel">
          <header>
            <span>LIVE PROOF</span>
            <b className={proof?.verified ? "verified" : ""}>
              {proof?.verified ? "VERIFIED" : "WAITING"}
            </b>
          </header>
          <div className="stellar-proof-body">
            {proof?.verified ? (
              <>
                <i>✓</i>
                <h3>Privy signed. Stellar verified.</h3>
                <p>
                  The signature matches this wallet&apos;s public key. We have a
                  working signing primitive for the next transaction test.
                </p>
                <dl>
                  <div><dt>Network</dt><dd>Stellar Testnet</dd></div>
                  <div><dt>Wallet</dt><dd>{wallet ? short(wallet.address) : "-"}</dd></div>
                  <div><dt>Challenge</dt><dd>{short(proof.challenge, 20, 8)}</dd></div>
                  <div><dt>Signature</dt><dd>{short(proof.signature)}</dd></div>
                </dl>
              </>
            ) : (
              <>
                <i>AA</i>
                <h3>No cryptographic proof yet.</h3>
                <p>
                  Complete the three actions to prove wallet creation, testnet
                  funding and server-side signature verification.
                </p>
              </>
            )}
          </div>
          <footer>
            Next: build a payment transaction XDR, request explicit approval,
            sign once, submit once, and reject duplicate execution.
          </footer>
        </aside>
      </div>
    </section>
  );
}
