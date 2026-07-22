# Product status

Last reviewed: **July 22, 2026**

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
| Market price quote | Live, read-only | CoinGecko response (keyless), CoinMarketCap fallback | Optional demo key for higher limits |
| Market watchlist | Live, read-only | Persistent symbols per user over CoinGecko/CoinMarketCap | Add scheduled alerts |
| Notion search | Implemented through LangGraph, ready to validate | OAuth PKCE, encrypted tokens, official MCP call and durable workflow trail | Complete one authenticated production search |
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
| Privy Stellar transaction signing | Live Testnet proof | User JWT authorization, verified Ed25519 signature and confirmed x402/DeFindex transactions | Repeat with a fresh user during acceptance testing |
| OpenZeppelin Stellar Channels | Configured, ready to validate | Official client pinned to Testnet; production key is server-side and user signature remains required | Submit one Privy-signed XDR and verify its explorer receipt |
| Privy x402 auth-entry signing | Live Testnet proof | Custom ClientStellarSigner delegated SEP-43 signing to the user-owned Privy wallet in a confirmed 0.01 USDC Testnet payment | Repeat with a fresh user and preserve the acceptance recording |
| Stellar x402 demo payment | Live Testnet proof | Confirmed 0.01 USDC settlement, protected delivery, durable receipt and zero-debit replay verification | Record the clean 90-second acceptance clip |
| DeFindex XLM deposit | Live Testnet proof, P0 | Validated Jul 21: a user completed a Privy-signed 1 XLM deposit into the public DeFindex Testnet vault, confirmed on-chain (transaction hash), with intent freeze, exact review and a replay-safe receipt | Repeat with a second user and record more receipts |
| DeFindex USDC trustline | Ready to validate, P0 | Exact issuer and ChangeTrust review implemented from chat | Confirm with Privy and explorer receipt |
| DeFindex USDC deposit | Blocked on compatible funding | Exact vault flow implemented; no controlled distributor for its issuer | Source exact Testnet USDC or deploy a controlled vault |
| Mainnet payment | Planned | None | Only after testnet safety review |
| Escrow or refunds | Planned | Research only | Choose non-custodial partner path |
| Fulfillment verification | Planned | Separate sandbox state | Validate one reservation or task |

## Integration pipeline

| Integration | Status | Access path | Limitation |
| --- | --- | --- | --- |
| Market data (CoinGecko + CoinMarketCap) | Live, read-only | CoinGecko primary (keyless, optional demo key), CoinMarketCap automatic fallback | No alerts, trade or x402 yet |
| Notion | LangGraph-routed, ready to validate | Official remote MCP + per-user OAuth | Authenticated production acceptance test pending |
| Travala | Live, read-only | Public Travel MCP (hotels only; no flights upstream) | No booking or payment |
| DeFindex | XLM Live Testnet proof; USDC blocked | Direct public Soroban contracts, no API key | XLM signed deposit confirmed on-chain; USDC deposit awaits exact-issuer funding |
| Telegram bot | Built; ready to switch on | Webhook adapter over the same agent core; account linking; Mini App scaffolded | Needs a bot token + migration to go live; wallet signing (Mini App + Privy) pending |
| UNBLCK | Live | Connect code, encrypted channel binding, live state, LangGraph approval for book/cancel and durable replay protection; verified end-to-end against the real Agent Hub API on Jul 20–21 (WhatsApp identity linked, real bookings and a cancellation confirmed on UNBLCK's own member portal, replies localized EN/ES) | Web-native channel is not supported upstream yet |
| ArcusX | Planned partner pilot | Direct contact | Task lifecycle contract needed |
| Gmail, Drive, Calendar | Planned | Future OAuth connectors | Catalog only |
| Trello | Planned | Future OAuth/API connector | Catalog only |
| MPP Router | Live discovery, execution disabled | Public llms.txt catalog; no provider API key needed for discovery | Choose one capped Mainnet endpoint only after explicit product approval |
| Stellar 8004 | Registration draft ready | Public machine-readable draft plus existing MCP endpoints | Choose owner wallet/network and register with on-chain proof |

## YC-ready proof versus remaining proof

Already demonstrable:

- A new user authenticates through Privy.
- The user receives a real user-owned Stellar wallet automatically; the x402 flow activates it with Friendbot and funds 0.50 USDC from the Testnet-only distributor after trustline approval.
- The agent reads real CoinGecko (fallback CoinMarketCap) and Travala data.
- The agent booked and cancelled a real UNBLCK hub day-pass, confirmed on the partner's own portal with a QR access pass.
- A user completed a Privy-signed 1 XLM DeFindex Testnet deposit, confirmed on-chain (transaction hash), with a replay-safe receipt.
- User state, chat and watchlists persist.
- The sandbox returns the same receipt on duplicate execution.

Required for the strongest application update:

1. One recorded text-only onboarding from wallet lookup through Friendbot funding.
2. A second Privy-signed DeFindex XLM Testnet deposit to widen the proof (the first is done).
3. One external OAuth connection completed end to end, ideally Notion.
4. Three design-partner commitments or letters of intent.
5. A concise 90-second recording with no simulated behavior described as real.
