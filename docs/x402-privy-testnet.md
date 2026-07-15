# Privy + x402 on Stellar Testnet

This integration lets an authenticated user pay the official Stellar x402 demo from the embedded Privy Stellar wallet. Freighter and private-key export are not part of the product flow.

## Safety boundary

- Stellar Testnet only.
- Official x402 Testnet USDC only.
- Maximum initial payment: `0.01 USDC` (`100000` atomic units).
- Mainnet is rejected.
- Network, asset contract, recipient and amount are frozen before approval.
- Every trustline and payment requires a user JWT and an explicit UI confirmation.
- Stable idempotency keys prevent the same logical action from being submitted twice.

## User journey

1. Sign in with Privy and open the agent.
2. Ask: `Prueba el demo x402 en testnet`.
3. If required, review and confirm the official x402 USDC trustline.
4. Obtain Testnet USDC from the Circle faucet. Friendbot only provides Testnet XLM.
5. Repeat the command. The agent reads the live `PAYMENT-REQUIRED` challenge.
6. Review the exact `0.01 USDC` payment and confirm it with Privy.
7. The custom signer hashes the Soroban auth-entry, requests an Ed25519 `rawSign` from the user-owned Privy wallet, and returns the SEP-43 signature to the x402 client.
8. The paid request is retried and the settlement hash and delivered resource are stored in Neon.

## Components

- `app/x402/assets.ts`: canonical Testnet asset registry and limit.
- `app/x402/privy-signer.ts`: Privy implementation of `ClientStellarSigner`.
- `app/x402/protocol.ts`: challenge inspection, strict requirement selection and paid fetch.
- `app/x402/trustline.ts`: official x402 USDC trustline preparation.
- `app/api/agent/x402/route.ts`: authenticated prepare/approve/execute lifecycle.
- `agent_x402_payments`: durable challenge, settlement and delivery evidence.

## Acceptance proof still required

The code path and signature primitive are implemented and tested. The remaining acceptance step is operational: fund the logged-in user's exact x402 Testnet USDC balance and confirm one live payment against `https://stellar.org/x402-demo/api/protected/testnet`. Do not describe the external payment as completed until an explorer transaction hash is recorded.
