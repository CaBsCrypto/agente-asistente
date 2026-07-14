# 90-second live demo

Use this sequence for YC, partner calls and product walkthroughs. Show one coherent story, not every planned integration.

## Preflight

- Production health responds at /api/health.
- Privy login works for the demo account.
- The Stellar Testnet wallet is visible and activated.
- CoinMarketCap returns an XLM quote.
- Neon persistence is active.
- If showing Notion, complete a real consent and search test before recording.

## Recommended script

### 0-20 seconds: identity and owned wallet

Open /agent and sign in. Show the Stellar Testnet address, balance and explorer link.

Say: “Every user gets a user-owned wallet automatically. The agent can prepare actions, but login alone never authorizes a payment.”

### 20-45 seconds: real external data

Send:

~~~text
What is the current XLM price on CoinMarketCap?
Add XLM to my CoinMarketCap watchlist
~~~

Show the timestamped quote and persistent watchlist.

Say: “This is a real read-only connection. It cannot trade or move funds.”

### 45-65 seconds: permissioned connections

If Notion has passed acceptance testing, show **Connect Notion**, approve access and search for a known page.

If it has not passed, show the connection UI and say: “The OAuth and MCP path is implemented; complete production validation is pending.” Do not attempt an unpredictable consent flow during the recording.

### 65-90 seconds: payment safety proof

Open /demo. Create an intent, evaluate policy, approve it and execute twice. Highlight replayed: true and the unchanged receipt.

Say: “Settlement here is simulated. Intent, policy and receipt are durable, and a retry cannot create a second execution. The next milestone replaces the simulated reference with one Privy-signed Stellar Testnet transaction.”

## Real versus simulated

Real:

- Privy authentication and token verification.
- User-owned Stellar wallet creation and Testnet activation.
- Horizon balance lookup.
- Neon users, chat, connections and watchlists.
- CoinMarketCap Trial Pro quotes.
- Travala read-only hotel discovery.
- Commerce intent persistence and receipt uniqueness.

Ready to validate:

- Notion OAuth, encrypted token storage and MCP search.

Simulated:

- Wallet authorization in /demo.
- Network settlement and transaction reference in /demo.
- Partner fulfillment confirmation.

## Failure-safe recording plan

1. Record login and wallet as one clip.
2. Record CoinMarketCap quote/watchlist as a second clip.
3. Record replay protection as a third clip.
4. Add Notion only after its real-user test succeeds twice.
5. Keep an explorer tab ready, but do not imply the wallet balance proves a payment.

## Definition of the next milestone

The payment demo is complete only when the product:

1. Freezes destination, asset and amount in an intent.
2. Requests explicit transaction-scoped approval.
3. Builds and signs a Stellar Testnet payment through Privy.
4. Submits it once to Horizon.
5. Persists the transaction hash as the receipt.
6. Returns that receipt for every retry without resubmitting.
