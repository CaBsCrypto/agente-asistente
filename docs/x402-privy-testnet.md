# Privy + x402 on Stellar Testnet

This integration lets an authenticated user pay the official Stellar x402 demo from the embedded Privy Stellar wallet. Freighter and private-key export are not part of the product flow.

## Safety boundary

- Stellar Testnet only.
- Official x402 Testnet USDC only.
- Maximum initial payment: `0.01 USDC` (`100000` atomic units).
- Mainnet is rejected.
- Network, asset contract, recipient and amount are frozen before approval.
- Every trustline and payment requires an authenticated Privy session and an explicit client-side wallet confirmation.
- Stable idempotency keys prevent the same logical action from being submitted twice.

## User journey

1. Sign in with Privy and open the agent.
2. Ask: `Prueba el demo x402 en testnet`.
3. The agent activates a new wallet with Friendbot when needed, then asks the user to review and confirm the official x402 USDC trustline.
4. When the internal faucet is configured, the agent sends `0.50 USDC` from its Testnet-only distributor automatically. Circle remains the manual fallback.
5. The agent reads the live `PAYMENT-REQUIRED` challenge without leaving the chat.
6. Review the exact `0.01 USDC` payment and confirm it with Privy.
7. Privy's Stellar client hook signs the pinned 32-byte authorization hash in the browser. The API verifies that Ed25519 signature against the user's wallet before creating the x402 payload.
8. The paid request is retried and the settlement hash and delivered resource are stored in Neon.

## Components

- `app/x402/assets.ts`: canonical Testnet asset registry and limit.
- `app/x402/client-authorization.ts`: pinned Soroban authorization preparation, client-signature verification and signed payload assembly.
- `app/x402/protocol.ts`: challenge inspection, strict requirement selection and paid fetch.
- `app/x402/trustline.ts`: official x402 USDC trustline preparation.
- `app/x402/testnet-faucet.ts`: Testnet-only USDC distributor with exact asset validation.
- `agent_testnet_faucet_claims`: one idempotent, auditable claim per Privy user and UTC hour.
- `app/api/agent/x402/route.ts`: authenticated prepare/approve/execute lifecycle.
- `agent_x402_payments`: durable challenge, settlement and delivery evidence.

## Acceptance proof (completed)

A Privy user completed the official 0.01 USDC Testnet payment against `https://stellar.org/x402-demo/api/protected/testnet`. Settlement, delivery evidence and a replay-safe receipt are durable, and a repeated confirmation returns the same receipt without a second debit — the payment is a Live Testnet proof, not a plan.

`npm run x402:signing:doctor` validates the live challenge and prepares the exact authorization hash without submitting a payment or moving funds.

## Internal faucet boundary

Set `STELLAR_TESTNET_USDC_DISTRIBUTOR_SECRET` only on the server. The corresponding account must hold XLM for fees, the official Circle Testnet USDC trustline and faucet USDC. It sends exactly `0.50 USDC` per user per UTC hour.

- It is hard-coded to Stellar Testnet and the official Testnet USDC issuer.
- The secret and distributor address are never sent together to the browser.
- It is developer infrastructure, not custody of user funds, and must never be reused on Mainnet.
