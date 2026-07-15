# Privy + Stellar Testnet

The public /agent experience uses Privy native Stellar support with @stellar/stellar-sdk. Privy creates the user-owned wallet; the authenticated user drives Testnet setup through the chat.

## Current architecture

~~~mermaid
sequenceDiagram
    participant U as User
    participant P as Privy
    participant A as agent-assistant
    participant H as Stellar Horizon
    U->>P: Sign in with Google or email
    P-->>U: Access token
    U->>A: Open authenticated agent
    A->>P: Verify token and resolve user
    A->>P: Get or create user-owned Stellar wallet
    A->>H: Read account and balances
    A-->>U: Wallet-ready chat
    U->>A: Recarga mi wallet con XLM de Testnet
    A->>H: Call Friendbot only if the account is absent
    H-->>A: Activated account and fake Testnet XLM
    A-->>U: Updated status and explorer receipt
~~~

- Privy authenticates the user and verifies the access token server-side.
- @privy-io/node lists and creates wallets with chain type stellar.
- The authenticated Privy user owns the wallet.
- A deterministic external ID and SDK idempotency key prevent duplicate wallets.
- Login creates the wallet identity but does not request Testnet funds.
- The chat calls Friendbot only when the user requests Testnet XLM and the account does not already exist.
- Horizon is the source of truth for account existence, balances and trustlines.
- @stellar/stellar-sdk constructs transactions and submits only after explicit approval.

There is no application-generated password and no seed phrase shown during signup. The orchestration layer does not need the private key.

## Chat-native onboarding

Use these messages in order, or ask for the next step at any time:

~~~text
Dame mi wallet
Recarga mi wallet con XLM de Testnet
Activa XLM
Activa USDC
¿Cuál es el siguiente paso de configuración Testnet?
Deposita 1 XLM en DeFindex Testnet
~~~

The state machine is on-chain, not a fragile checklist:

1. **Wallet:** the agent resolves the wallet linked to the current Privy user.
2. **Testnet XLM:** if the account is absent, the agent asks Friendbot to create and fund it. If it already exists, the agent does not call Friendbot again.
3. **XLM activation:** XLM is native, so no separate trustline exists. The agent reports the current account state.
4. **USDC activation:** the agent prepares the trustline for the exact issuer required by the DeFindex vault. The user reviews and signs with Privy.
5. **USDC funding:** a compatible distributor is still required. The agent never substitutes another asset with the same code.
6. **DeFindex:** the agent prepares the deposit from text; the user approves the exact transaction before submission.

The same commands are recognized in English, Spanish and Portuguese.

## What is implemented

- Privy Google/email authentication.
- Server-side access-token verification.
- Automatic, duplicate-resistant Stellar wallet provisioning.
- Chat-requested Stellar Testnet account funding.
- Live wallet, XLM and exact USDC trustline status.
- Exact DeFindex USDC trustline preparation.
- DeFindex XLM and USDC deposit preparation.
- Transaction-specific Privy signing and signature verification.
- Horizon submission, durable receipt and idempotent retry handling.
- Mainnet disabled.

## Acceptance proof still required

The code path is ready, but product evidence is not complete until a real authenticated user records:

1. The wallet before and after chat-requested Friendbot funding.
2. A Privy-confirmed DeFindex XLM transaction.
3. The explorer-verifiable transaction receipt.
4. A retry that returns the same stored receipt without a second submission.

A funded exact-issuer USDC distributor is separately required before claiming an end-to-end USDC deposit.

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
| Stellar | Stellar Testnet, later Mainnet | Active now |
| Ethereum/EVM | Base, BNB Chain, Avalanche and other EVM networks | Disabled, future |
| Solana/SVM | Solana and SVM networks | Disabled, future |

This is one identity with multiple potential wallets, not one universal address or key. The YC MVP intentionally creates only the Stellar wallet.

## Safety boundary

- Chat text can request data, funding and transaction preparation.
- Friendbot is Testnet-only and provides no real value.
- Login never authorizes a transaction.
- Trustlines and deposits require transaction-specific Privy confirmation.
- Mainnet remains disabled until the Testnet proof has deterministic tests, observable failures and a documented recovery path.
