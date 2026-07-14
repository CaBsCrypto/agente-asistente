"use client";

/* eslint-disable @next/next/no-img-element */

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


type TravelHotel = {
  hotelId: string;
  packageId: string;
  name: string;
  thumbnail?: string;
  rating?: number | null;
  star?: number | null;
  totalPriceUSD: number;
  pricePerNightUSD: number;
  currency: string;
  mealType?: string;
  address?: string;
  refundability?: string;
  cancellationPolicyString?: string;
};

type TravelSearchResult = {
  sessionId: string;
  searchedAt: string;
  hotels: TravelHotel[];
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
  const [travelResult, setTravelResult] = useState<TravelSearchResult | null>(null);
  const [travelStatus, setTravelStatus] = useState<"idle" | "searching" | "error">("idle");
  const [travelError, setTravelError] = useState<string | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<TravelHotel | null>(null);
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


  async function searchTravel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setTravelStatus("searching");
    setTravelError(null);
    setSelectedHotel(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Authentication token unavailable");
      const response = await fetch("/api/agent/travel/search", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          location: String(form.get("location") ?? ""),
          checkIn: String(form.get("checkIn") ?? ""),
          checkOut: String(form.get("checkOut") ?? ""),
          guests: Number(form.get("guests") ?? 1),
          maxPrice: Number(form.get("maxPrice") ?? 0) || undefined,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Travel search failed");
      setTravelResult(body);
      setTravelStatus("idle");
    } catch (caught) {
      setTravelError(caught instanceof Error ? caught.message : "Travel search failed");
      setTravelStatus("error");
    }
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
        <>
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

        <section className="agent-travel">
          <header>
            <div>
              <p className="eyebrow">LIVE TRAVALA SEARCH</p>
              <h2>Ask your agent to find a place to stay.</h2>
              <p>Real hotel inventory and prices. Search only: booking and payment remain disabled.</p>
            </div>
            <span>READ-ONLY MCP</span>
          </header>

          <form onSubmit={searchTravel}>
            <label>Where<input name="location" placeholder="Santiago, Chile" required minLength={2} /></label>
            <label>Check-in<input name="checkIn" type="date" required /></label>
            <label>Check-out<input name="checkOut" type="date" required /></label>
            <label>
              Guests
              <select name="guests" defaultValue="2">
                {[1, 2, 3, 4, 5, 6].map((count) => (
                  <option key={count} value={count}>{count}</option>
                ))}
              </select>
            </label>
            <label>Max USD/night<input name="maxPrice" type="number" min="1" max="10000" placeholder="200" /></label>
            <button disabled={travelStatus === "searching"}>
              {travelStatus === "searching" ? "Searching Travala..." : "Search hotels"}
            </button>
          </form>

          {travelError && <p className="agent-travel-error">{travelError}</p>}

          {travelResult && (
            <>
              <div className="agent-travel-summary">
                <strong>{travelResult.hotels.length} live options found</strong>
                <span>Prices can change until a booking is confirmed.</span>
              </div>
              <div className="agent-hotel-list">
                {travelResult.hotels.map((hotel) => (
                  <article key={hotel.packageId} className={selectedHotel?.packageId === hotel.packageId ? "selected" : ""}>
                    {hotel.thumbnail ? (
                      <img src={hotel.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="agent-hotel-placeholder">TRAVALA</div>
                    )}
                    <div>
                      <small>{hotel.star ? hotel.star + "-STAR HOTEL" : "HOTEL"}</small>
                      <h3>{hotel.name}</h3>
                      <p>{hotel.address ?? hotel.refundability ?? "Live Travala inventory"}</p>
                      <div className="agent-hotel-meta">
                        {hotel.rating != null && <span>Rating <b>{hotel.rating}</b></span>}
                        {hotel.refundability && <span>{hotel.refundability}</span>}
                        {hotel.mealType && <span>{hotel.mealType.replaceAll("_", " ")}</span>}
                      </div>
                    </div>
                    <footer>
                      <strong>{"$" + hotel.totalPriceUSD.toFixed(2)}</strong>
                      <small>{"$" + hotel.pricePerNightUSD.toFixed(2)} / night</small>
                      <button type="button" onClick={() => setSelectedHotel(hotel)}>
                        {selectedHotel?.packageId === hotel.packageId ? "Selected" : "Select"}
                      </button>
                    </footer>
                  </article>
                ))}
              </div>
            </>
          )}

          {selectedHotel && (
            <aside className="agent-travel-selection">
              <div>
                <p className="eyebrow">PREPARED FOR REVIEW</p>
                <h3>{selectedHotel.name}</h3>
                <p>{selectedHotel.cancellationPolicyString ?? "Review final conditions before booking."}</p>
              </div>
              <div>
                <strong>{"$" + selectedHotel.totalPriceUSD.toFixed(2)} USD</strong>
                <span>Booking disabled in the Stellar MVP</span>
              </div>
            </aside>
          )}
        </section>
        </>
      )}
    </section>
  );
}
