# 90-second Carmelita product demo

Last reviewed: **July 22, 2026**

The demo must tell one story: a user asks, Carmelita applies context and rules,
executes through a real service or wallet, and returns evidence.

Do not tour the landing page or explain the technology stack first.

## Narrative

> AI assistants can recommend what to do. Carmelita completes the action safely.

The sequence moves from a familiar off-chain action to an on-chain payment. This
shows that the product is a reusable execution layer, not a crypto-only wallet
or a single-purpose booking bot.

## Preflight

- Production health responds at `/api/health`.
- Privy login works for the dedicated demo account.
- The Stellar Testnet wallet and explorer link are visible.
- The validated UNBLCK account and booking evidence are ready.
- The latest x402 receipt is restored from Neon.
- Duplicate verification returns the original hash and zero second debit.
- Never show OTPs, tokens, signatures, environment variables or private inboxes.

## Recording script

### 0–12 seconds — the promise

Show the Carmelita chat after login.

Say:

> “Carmelita is a personal AI agent that turns a conversation into a controlled,
> verifiable action.”

Ask:

~~~text
Muéstrame mi wallet y mis reglas.
~~~

Point to the user-owned Stellar address, Testnet label and approval limits.

### 12–35 seconds — a real service action

Show the prepared or previously completed UNBLCK action.

~~~text
Reserva un espacio de trabajo para el próximo viernes.
~~~

Say:

> “Carmelita checks the connected account, prepares the exact date and asks for
> approval. The booking is confirmed in UNBLCK''s own system.”

Show the provider reference or member-portal evidence. Do not imply payment if
the booking used an existing credit.

### 35–60 seconds — an exact payment

Restore the validated x402 receipt or prepare the exact 0.01 USDC Testnet action.

Say:

> “For a payment, the same agent adds a stricter gate. The recipient, asset and
> amount are frozen. Privy signs from the user''s wallet; our server never holds
> the key.”

Show:

- `0.0100000 USDC`;
- Stellar Testnet;
- transaction hash;
- protected delivery evidence.

### 60–75 seconds — duplicate protection

Run **Verify duplicate protection**.

Say:

> “A retry returns the original receipt. It never reaches signing or settlement
> a second time.”

Show the same hash, unchanged balance and `0.0000000 USDC` second debit.

### 75–90 seconds — the platform

Briefly show the Integration Lab and its honest statuses.

Say:

> “Businesses connect one narrow action through an API or MCP. Carmelita supplies
> identity, policy, approval, execute-once behavior and evidence. We are starting
> in Latin America and building this execution layer for services globally.”

Finish on:

> **Ask Carmelita. She prepares it. You decide.**

## Optional alternate clip

Use the Privy-signed 1 XLM DeFindex Testnet deposit instead of UNBLCK when the
audience is primarily crypto-native. Do not attempt to show every integration in
one video.

## Evidence to keep ready

- Privy-created Stellar wallet.
- UNBLCK provider booking/cancellation reference.
- x402 0.01 USDC Testnet receipt.
- Original and replay transaction hashes.
- Unchanged balance after replay.
- DeFindex 1 XLM Testnet explorer receipt.
- Integration Lab status labels.

## Honest boundaries

- Testnet assets have no real monetary value.
- UNBLCK is a live technical integration, not a paying customer unless a signed
  agreement says otherwise.
- Travala is search-only today.
- DeFindex XLM is proven; compatible USDC funding remains blocked.
- Mainnet payments, escrow and physical fulfillment guarantees are not live.

## Recording checklist

1. Record the founder video separately.
2. Hide login inbox and OTP screens.
3. Use existing verified receipts instead of risking a live-demo dependency.
4. Keep each proof clip short and legible.
5. Add captions for wallet, approval, provider evidence and replay protection.
6. Never describe a planned connection as working.
