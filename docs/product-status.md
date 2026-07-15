# Product status

Last reviewed: **July 14, 2026**

This document separates deployed proof from product vision. Status definitions live in the [documentation index](README.md).

## End-user product

| Capability | Status | Evidence | Next proof |
| --- | --- | --- | --- |
| Privy Google/email login | Live | Production /agent authentication | Measure completed onboarding |
| Portuguese product entry | Live | Persistent EN/ES/PT locale, localized login and core Portuguese agent commands | Translate remaining technical evidence copy |
| Trilingual developer portal | Live | EN/ES/PT paths, MCP quickstart, embedded architecture and provider/onbound onboarding | Add interactive MCP playground |
| Automatic Stellar wallet | Live | Privy-owned Stellar address per user | Add recovery/support runbook |
| Stellar Testnet activation | Live | Horizon account and explorer record | Record activation latency |
| Wallet balance | Live | Horizon balance response | Add refresh/error telemetry |
| Persistent chat history | Live | Neon user and message records | Add export/deletion controls |
| Connection list | Live | Per-user Neon records | Add scopes and last-used metadata |
| CoinMarketCap quote | Live, read-only | Official Trial Pro API response | Partner key, MCP or production plan |
| CoinMarketCap watchlist | Live, read-only | Persistent symbols per user | Add scheduled alerts |
| Notion search | Ready to validate, read-only | OAuth PKCE, encrypted tokens and MCP call | Complete real-user consent and search |
| Travala hotel search | Live, read-only | Public Travel MCP response | Validate errors and UX |
| General language planning | Partial | Deterministic command routing | Add model-backed planning with evals |

## Commerce and payment layer

| Capability | Status | Evidence | Next proof |
| --- | --- | --- | --- |
| Personal agent MCP | Development foundation | Privy bearer bridge and three scoped tools | Add OAuth 2.1 consent for external clients |
| Service provider MCP | Development foundation | Hashed scoped keys and offer administration | Add UI, rotation, orders and fulfillment |
| Durable commerce intent | Sandbox | Neon record and idempotency key | Bind to real payment XDR |
| Policy evaluation | Sandbox | Persisted decision and demo limit | Per-user and merchant limits |
| Explicit demo approval | Sandbox | Short-lived hashed capability | Transaction-scoped Privy approval |
| Duplicate-resistant receipt | Sandbox | Unique receipt per intent | Reuse on-chain hash on retry |
| Privy Stellar transaction signing | Ready to validate | User JWT authorization plus verified Ed25519 transaction signature | Complete authenticated acceptance test |
| DeFindex XLM deposit | Ready to validate, P0 | Conversational EN/ES/PT intent, public vault simulation, prepared XDR and explicit Privy review | Confirm with Privy and explorer receipt |
| DeFindex USDC trustline/deposit | Ready to validate, P0 | Exact issuer, trustline and vault flow implemented | Fund compatible Testnet USDC and confirm deposit |
| Mainnet payment | Planned | None | Only after testnet safety review |
| Escrow or refunds | Planned | Research only | Choose non-custodial partner path |
| Fulfillment verification | Planned | Separate sandbox state | Validate one reservation or task |

## Integration pipeline

| Integration | Status | Access path | Limitation |
| --- | --- | --- | --- |
| CoinMarketCap | Live, read-only | Official Trial Pro API | No alerts, trade or x402 yet |
| Notion | Ready to validate | Official remote MCP + OAuth | Acceptance test pending |
| Travala | Live, read-only | Public Travel MCP | No booking or payment |
| DeFindex | Ready to validate | Direct public Soroban contracts, no API key | User confirms XLM, then USDC Testnet flows |
| UNBLCK | Planned partner pilot | Direct contact | Reservation contract needed |
| ArcusX | Planned partner pilot | Direct contact | Task lifecycle contract needed |
| Gmail, Drive, Calendar | Planned | Future OAuth connectors | Catalog only |
| Trello | Planned | Future OAuth/API connector | Catalog only |

## YC-ready proof versus remaining proof

Already demonstrable:

- A new user authenticates through Privy.
- The user receives a real Stellar Testnet wallet automatically.
- The agent reads real CoinMarketCap and Travala data.
- User state, chat and watchlists persist.
- The sandbox returns the same receipt on duplicate execution.

Required for the strongest application update:

1. One Privy-signed DeFindex XLM Testnet deposit with an explorer link.
2. The same DeFindex transaction hash returned on retry without a second submission.
3. One external OAuth connection completed end to end, ideally Notion.
4. Three design-partner commitments or letters of intent.
5. A concise 90-second recording with no simulated behavior described as real.
