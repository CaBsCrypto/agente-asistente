# Product status

Reviewed September 8, 2026. See [the consolidated PR #28 evidence](preview-pr28-2026-09-08.md) for the isolated Preview delivery and its remaining acceptance checks.

## Evidence categories

- **Verified:** observed successfully on the stated date and environment; does not imply every related flow works.
- **Implemented, acceptance pending:** code exists, but its authenticated end-to-end behavior still needs evidence.
- **Experimental:** test or limited capability that must retain its restrictions.
- **Planned:** not available as an operational user capability.

## Current capabilities

| Capability | Category | Evidence and remaining work |
| --- | --- | --- |
| Public agent page, health and MCP discovery | Verified | September 7 public diagnostic passed; health is not a database or signing acceptance test |
| CoinGecko quote | Verified | September 7 XLM connector request succeeded; real CoinMarketCap fallback still needs configured acceptance |
| Local application build and safety logic | Verified locally | See the stabilization evidence; local tests do not certify production or payments |
| Privy login, Stellar wallets, chat, memory, watchlist and user policies | Implemented, acceptance pending | Repeat with two users, session recovery, persistence and cross-user rejection |
| Stellar x402 and DeFindex XLM | Implemented, acceptance pending | Historical Testnet receipts documented; current user payment, delivery and zero-debit replay need acceptance |
| Notion and Stytch OAuth | Implemented, acceptance pending | Validate consent, scoped reads, renewal and revocation with real accounts |
| UNBLCK | Implemented, acceptance pending | Historical booking/cancellation documented; current availability and account linking need revalidation |
| Travala | Implemented, acceptance pending | September 7 public search returned HTTP 401; resolve upstream access before claiming live search |
| Personal MCP/REST Gateway | Implemented, acceptance pending | Discovery and planning only; no signing or submission; validate authenticated access |
| Telegram | Implemented, acceptance pending | Bot configuration and account acceptance needed; Mini App signing is unavailable |
| Admin, waitlist and connections | Implemented, acceptance pending | Validate roles, persistence and export using real configured accounts |
| Model-backed planner | Implemented, acceptance pending | Opt-in, plan-only; evaluate configured model and free-language behavior |
| Avalanche Fuji, Solana Devnet and CCTP | Experimental | Local contracts tested; each flow requires independent on-chain acceptance |
| WebMCP | Experimental | Shared registration, lifecycle and error handling; browser compatibility acceptance remains pending; no direct faucet tool |
| Commerce demo | Experimental | Simulated settlement is explicitly distinct from real fulfillment |
| Autopilot | Experimental | Policy-only baseline; no ready delegated signer |
| Soroswap and DeFindex USDC | Experimental | Revalidate upstream liquidity and exact-asset funding |
| MPP Router / Stellar 8004 | Experimental | Discovery / registration draft respectively; not automatic spending or on-chain registration |
| Stellar Bazaar consumption | Planned | Consumer implementation roadmap; no paid integration is enabled |
| Base, BNB, Gmail, Drive, Calendar, Trello, ArcusX | Planned | Do not advertise as available integrations |
| Mainnet, delegated autonomous payments, escrow and refunds | Planned | Separate future acceptance and product decisions |

## Next gates

1. Close isolated Preview acceptance: two test users, wallet bootstrap without funding, session recovery, persistence and account isolation. Consolidated local installation, lint, tests and build have passed.
2. After Preview acceptance, validate Stellar wallet → explicit payment → delivery → replay in Testnet with concrete approval per payment.
3. Implement and validate consumption from Stellar Bazaar exclusively inside Carmelita.
4. Expand multichain and additional channels with independent evidence.

See [the audit](auditoria-y-hoja-de-ruta-2026-09-07.md), [stabilization](stabilization-2026-09-07.md) and [Bazaar consumer plan](stellar-bazaar-consumer-plan.md). The July historical evidence remains in the audit and capability documents; it must not be presented as a new validation.
