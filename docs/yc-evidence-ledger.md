# YC evidence ledger

Last updated: July 21, 2026 (America/Santiago)

The single source of truth for what is **verified** versus **pending**. A green
readiness check is not an execution proof. Use only rows marked **Verified live**
in external materials.

## Verified live — real actions against real external systems

| Evidence | Result | Verification |
| --- | --- | --- |
| **UNBLCK real-world agent action** | The agent booked and cancelled real Tellus Hub day-passes (2026-07-21, 2026-07-24) from chat. Credits decremented 3/3 → 1/3, then a cancellation refunded one. | Confirmed on UNBLCK's own member portal (calendar + QR access pass per day); replies localized EN/ES |
| **Stellar x402 non-custodial payment** | A Privy user completed the official 0.01 USDC Testnet flow; a repeated confirmation returned the same receipt without a second debit. | Durable settlement, delivery evidence and replay-safe receipt |
| **DeFindex XLM DeFi deposit** | A Privy-signed 1 XLM deposit into the public DeFindex Testnet vault; wallet balance dropped ~1 XLM. | On-chain, explorer-verifiable transaction hash `71a45ae162a4b49419b8fcaa06d317eb08c2d588cd7c93c8e783c2dc8319b50a`; replay-safe receipt |
| **Market data** | Live XLM/BTC quotes with 24h/7d change, market cap, rank. | CoinGecko (keyless, primary), CoinMarketCap automatic fallback; read-only |
| **Travala hotel discovery** | Five Santiago options returned. | acceptance Travala 7/7 (hotels only; the MCP exposes no flights) |
| **Privy identity + user-owned wallet** | Google/email login; one user-owned Stellar Testnet wallet auto-created. | Production `/agent` |
| **Production health** | Postgres active, Mainnet disabled, MCP surfaces advertised, official x402 challenge returns exactly 0.0100000 USDC. | acceptance doctor 6/6 |

The three headline actions — **book (UNBLCK), pay (x402), deposit (DeFindex)** — each run the same lifecycle: freeze intent → policy → exact approval → execute once → durable evidence.

## Built, not yet switched on

| Item | State | To go live |
| --- | --- | --- |
| Telegram bot | Chat + full UNBLCK flow + read-only tools + web↔Telegram account linking merged and hardened; audit-fixed; signing Mini App scaffolded | A bot token + DB migration; then wallet signing via the Mini App + Privy |

## Pending (founder-assisted or acceptance)

| Evidence | Status | Next action |
| --- | --- | --- |
| Second-user wallet + memory isolation | Needs a fresh two-user acceptance | Save/query memories under two identities |
| Notion OAuth + search | Code implemented, ready to validate | One authenticated production search that succeeds twice |
| Design partners | Contacts identified | Three written bounded-pilot commitments (UNBLCK is a live technical integration, not a signed customer) |
| YC demo recording | Script + preflight exist | Record only after the stop conditions are green; include the UNBLCK booking |

## Evidence snapshots

- Production doctor: 6 passed, 0 failed.
- Travala acceptance: 7 passed, 0 failed (Santiago; first result DoubleTree by Hilton Santiago - Vitacura).
- DeFindex deposit: 2026-07-21, tx `71a45ae1…19b50a`, wallet 9998.97 → 9997.96 XLM.
- Graphify MCP: 957 nodes, 1,847 edges, 63 communities; 99% extracted relations.

## Founder-assisted gates (cannot be automated)

These intentionally require human identity or transaction approval:

1. A fresh second Privy login (two-user acceptance).
2. Three written partner commitments.
3. The final product recording and YC factual answers.

Never put Privy tokens, signatures, OTP codes, private email content or admin credentials in this ledger.
