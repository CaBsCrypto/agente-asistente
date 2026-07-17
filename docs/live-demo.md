# 90-second live demo

Use one coherent story for YC: identity, one real payment, duplicate protection and one useful read-only connection.

## Preflight

- Production health responds at `/api/health`.
- Privy login works for the dedicated demo account.
- The Stellar Testnet wallet and explorer link are visible.
- The latest x402 payment is confirmed and the wallet has `0.4900000 USDC`.
- Neon persistence is active.
- Travala acceptance returns at least one current hotel result.
- Never show Privy tokens, signatures, OTPs or environment variables.

## Recommended script

### 0-20 seconds: identity and wallet

Open `/agent` and sign in. Show the wallet address, Testnet label and explorer link.

Say: “Every user gets a user-owned Stellar wallet through Privy. Login establishes identity, but it never authorizes a payment.”

### 20-45 seconds: real x402 settlement

Click **x402 receipt** to restore the latest confirmed payment from Neon. Show:

- `0.0100000 USDC`;
- Stellar Testnet;
- the recipient;
- the transaction receipt;
- the delivered protected resource.

Say: “The user approved exactly 0.01 USDC. Privy signed only that authorization and Stellar settled it once.”

### 45-65 seconds: duplicate-resistant replay

Click **Verify duplicate protection**. Show:

- the original transaction hash;
- balance before: `0.4900000 USDC`;
- balance after: `0.4900000 USDC`;
- second debit: `0.0000000 USDC`;
- same receipt.

Say: “A retry never reaches signing or settlement. It returns the original receipt and the wallet balance does not change.”

### 65-90 seconds: useful external service

Search live Travala hotel inventory. Do not imply booking or payment.

Say: “The same agent can discover real services without moving funds. We are building the control and commerce layer that lets agents act for people safely.”

## Verified evidence

- Privy-created Stellar wallet for a second user.
- Friendbot Testnet activation.
- Official x402 USDC trustline.
- Internal `0.50 USDC` Testnet funding.
- Real `0.01 USDC` x402 settlement.
- Explorer hash: `8ec3c7e8197aa286328329b6715295b45ac498195f280b5d18598f78d541f18f`.
- Final balance: `0.4900000 USDC`.
- Neon payment record with settlement, delivery preview and idempotency key.
- Live Travala read-only MCP search.

## Boundaries to state clearly

- Testnet assets have no real monetary value.
- Travala is search-only today; booking remains disabled.
- The `/demo` action console is a separate no-funds architecture sandbox.
- Mainnet payments remain disabled.
- DeFindex has a successful 1 XLM Testnet receipt, but it should be a separate optional clip.

## Recording checklist

1. Use the dedicated demo email and hide inbox/OTP screens.
2. Keep the explorer receipt ready.
3. Restore the existing x402 receipt; do not prepare a new payment.
4. Run the replay once and show the zero-debit evidence card.
5. Search Travala with future valid dates.
6. Record each proof separately and assemble the cleanest 90 seconds.
