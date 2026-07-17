# Product status

Last reviewed: **July 17, 2026**

This document separates deployed proof from product vision. Status definitions live in the [documentation index](README.md).

## End-user product

| Capability | Status | Evidence | Next proof |
| --- | --- | --- | --- |
| Privy Google/email login | Live | Production /agent authentication | Measure completed onboarding |
| Public new-user manual | Live | Trilingual /guide with copyable Testnet journey, approval matrix and troubleshooting | Measure guide-to-agent conversion |
| Portuguese product entry | Live | Persistent EN/ES/PT locale, localized login and core Portuguese agent commands | Translate remaining technical evidence copy |
| Trilingual developer portal | Live | EN/ES/PT paths, MCP quickstart, embedded architecture and provider/onbound onboarding | Add interactive MCP playground |
| Automatic Stellar wallet | Live | Privy-owned Stellar address per user, created at login | Add recovery/support runbook |
| Chat-requested Stellar Testnet funding | Implemented, ready to validate | Friendbot runs only after a chat request and only for an absent account | Record new-user acceptance proof |
| Chat-native wallet setup | Implemented, ready to validate | EN/ES/PT wallet, XLM, USDC and readiness intents query live Horizon state | Record the complete text-only flow |
| Persistent chat history | Live | Neon user and message records | Add export/deletion controls |
| Personal Knowledge Vault | Implemented, ready to validate | Per-user Neon knowledge and policy records, chat capture and My Agent controls | Complete five-user retention and correction pilot |
| Per-user execution policies | Implemented, ready to validate | Network, spend, approval and risk preflight enforced before DeFindex preparation | Record allowed and blocked acceptance proofs |
| Decision explanations | Implemented, ready to validate | Why this action UI plus durable reason codes and applied rules | Measure user comprehension and trust |
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
| Policy evaluation | Implemented, ready to validate | Per-user rules enforced in chat and DeFindex prepare endpoint | Add merchant limits and complete acceptance test |
| Explicit demo approval | Sandbox | Short-lived hashed capability | Transaction-scoped Privy approval |
| Duplicate-resistant receipt | Sandbox | Unique receipt per intent | Reuse on-chain hash on retry |
| Privy Stellar transaction signing | Ready to validate | User JWT authorization plus verified Ed25519 transaction signature | Complete authenticated acceptance test |
| Privy x402 auth-entry signing | Implemented, ready to validate | Custom ClientStellarSigner hashes SEP-43 auth entries and delegates Ed25519 raw signing to the user-owned Privy wallet | Complete one live 0.01 USDC Testnet payment |
| Stellar x402 demo payment | Implemented, ready for acceptance | Live 402 challenge inspection, pinned asset/amount, automatic 0.50 USDC Testnet funding, atomic execution claim and durable replay receipt | Complete one live payment and record explorer hash |
| DeFindex XLM deposit | Ready to validate, P0 | Conversational EN/ES/PT intent, public vault simulation, prepared XDR and explicit Privy review | Confirm with Privy and explorer receipt |
| DeFindex USDC trustline | Ready to validate, P0 | Exact issuer and ChangeTrust review implemented from chat | Confirm with Privy and explorer receipt |
| DeFindex USDC deposit | Blocked on compatible funding | Exact vault flow implemented; no controlled distributor for its issuer | Source exact Testnet USDC or deploy a controlled vault |
| Mainnet payment | Planned | None | Only after testnet safety review |
| Escrow or refunds | Planned | Research only | Choose non-custodial partner path |
| Fulfillment verification | Planned | Separate sandbox state | Validate one reservation or task |

## Integration pipeline

| Integration | Status | Access path | Limitation |
| --- | --- | --- | --- |
| CoinMarketCap | Live, read-only | Official Trial Pro API | No alerts, trade or x402 yet |
| Notion | Ready to validate | Official remote MCP + OAuth | Acceptance test pending |
| Travala | Live, read-only | Public Travel MCP | No booking or payment |
| DeFindex | Ready to validate | Direct public Soroban contracts, no API key | Confirm XLM proof; USDC deposit awaits exact-issuer funding |
| UNBLCK | Planned partner pilot | Direct contact | Reservation contract needed |
| ArcusX | Planned partner pilot | Direct contact | Task lifecycle contract needed |
| Gmail, Drive, Calendar | Planned | Future OAuth connectors | Catalog only |
| Trello | Planned | Future OAuth/API connector | Catalog only |

## YC-ready proof versus remaining proof

Already demonstrable:

- A new user authenticates through Privy.
- The user receives a real user-owned Stellar wallet automatically; the x402 flow activates it with Friendbot and funds 0.50 USDC from the Testnet-only distributor after trustline approval.
- The agent reads real CoinMarketCap and Travala data.
- User state, chat and watchlists persist.
- The sandbox returns the same receipt on duplicate execution.

Required for the strongest application update:

1. One recorded text-only onboarding from wallet lookup through Friendbot funding.
2. One Privy-signed DeFindex XLM Testnet deposit with an explorer link.
3. The same DeFindex transaction hash returned on retry without a second submission.
4. One external OAuth connection completed end to end, ideally Notion.
5. Three design-partner commitments or letters of intent.
6. A concise 90-second recording with no simulated behavior described as real.
