# Privy + Stellar Testnet

The public /agent onboarding and the founder lab at /admin/stellar use Privy's
native Stellar wallet support together with @stellar/stellar-sdk.

## Current architecture

- Privy authenticates the user and verifies the access token.
- @privy-io/node lists and creates wallets with chain type stellar.
- The public wallet owner is the authenticated Privy user.
- A deterministic external ID and SDK idempotency key prevent duplicate wallets.
- Friendbot activates the address on Stellar Testnet.
- Horizon returns the real testnet account and balances.
- Privy performs raw Ed25519 signing.
- @stellar/stellar-sdk verifies signatures and will build transaction XDR.

Stellar is a Privy Tier 2 chain. Privy provides wallet creation, address
derivation, embedded ownership, exports and cryptographic signing. Stellar code
is still required to build and submit chain-specific transactions.

## Multichain direction

A single Privy identity can own several wallets:

- Stellar wallet: active now.
- Ethereum/EVM wallet: future; can operate across Base, BNB Chain, Avalanche
  and other EVM networks.
- Solana wallet: future.

These are separate wallet families under one user identity, not one universal
private key. Only Stellar is enabled in the current onboarding.

## What is real

- Public Privy authentication and server token verification.
- Automatic user-owned Stellar wallet provisioning.
- Duplicate-resistant wallet creation.
- Stellar Testnet activation and balance lookup.
- Founder-only signature verification proof.

## What remains

- A complete payment transaction XDR.
- Transaction-scoped user authorization.
- Horizon submission with durable replay protection.
- Mainnet, merchant settlement and fulfillment evidence.
- Optional EVM or Solana wallet provisioning.

## Environment

    NEXT_PUBLIC_PRIVY_APP_ID=your-app-id
    PRIVY_APP_ID=your-app-id
    PRIVY_APP_SECRET=your-app-secret

Never expose PRIVY_APP_SECRET to a Client Component, logs or source control.

## Next proof

Build one Stellar Testnet payment XDR, freeze amount and destination in a
commerce intent, request explicit approval, sign through Privy, submit once to
Horizon and persist the transaction hash as the receipt. Repeating the same
idempotency key must return the original receipt.