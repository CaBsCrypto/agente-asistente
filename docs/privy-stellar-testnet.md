# Privy + Stellar Testnet

The public /agent onboarding and founder lab at /admin/stellar use Privy native Stellar support with @stellar/stellar-sdk.

## Current architecture

~~~mermaid
sequenceDiagram
    participant U as User
    participant P as Privy
    participant A as agent-assistant
    participant H as Stellar Horizon
    U->>P: Sign in with Google or email
    P-->>U: Access token
    U->>A: Bootstrap authenticated agent
    A->>P: Verify token and resolve user
    A->>P: Get or create user-owned Stellar wallet
    A->>H: Activate new Testnet account through Friendbot
    A->>H: Read account and balances
    A-->>U: Wallet-ready chat
~~~

- Privy authenticates the user and verifies the access token server-side.
- @privy-io/node lists and creates wallets with chain type stellar.
- The authenticated Privy user owns the wallet.
- A deterministic external ID and SDK idempotency key prevent duplicates.
- Friendbot activates new addresses on Stellar Testnet.
- Horizon returns the real account and balances.
- The founder lab verifies raw Ed25519 signing.
- @stellar/stellar-sdk constructs transactions and submits to the network.

There is no application-generated password and no seed phrase shown during signup. The orchestration layer does not need the private key.

## What is real

- Privy Google/email authentication.
- Server-side access-token verification.
- Automatic, duplicate-resistant Stellar wallet provisioning.
- Stellar Testnet activation and balance lookup.
- Explorer-visible account.
- Founder-only raw signature verification harness.

## What is not yet real

- Complete payment transaction XDR.
- Transaction-scoped user authorization.
- Horizon payment submission from the product.
- Durable on-chain transaction receipt and replay proof.
- Mainnet settlement, reconciliation or fulfillment evidence.

An activated account with Testnet XLM proves wallet provisioning. It does not prove the agent completed a payment.

## Environment

~~~dotenv
NEXT_PUBLIC_PRIVY_APP_ID=your-app-id
PRIVY_APP_ID=your-app-id
PRIVY_APP_SECRET=your-app-secret
NEXT_PUBLIC_PRIVY_CLIENT_ID=optional-client-id
~~~

NEXT_PUBLIC_PRIVY_APP_ID and PRIVY_APP_ID normally refer to the same application. PRIVY_APP_SECRET must never reach a Client Component, log, screenshot or commit.

## Multichain direction

| Wallet family | Networks | Status |
| --- | --- | --- |
| Stellar | Stellar Testnet, later mainnet | Active now |
| Ethereum/EVM | Base, BNB Chain, Avalanche and other EVM networks | Disabled, future |
| Solana/SVM | Solana and SVM networks | Disabled, future |

This is one identity with multiple wallets, not one universal address or key. The YC MVP intentionally creates only the Stellar wallet.

## Next payment proof

1. Create an intent containing destination, XLM amount, network and expiry.
2. Apply spend policy.
3. Build the Stellar Testnet transaction XDR.
4. Show the exact transaction and request scoped approval.
5. Sign through the user Privy wallet.
6. Submit once to Horizon.
7. Persist the transaction hash and ledger result.
8. On retry, return the stored receipt without signing or submitting again.

Mainnet remains disabled until this flow has deterministic tests, observable failures and a documented recovery path.
