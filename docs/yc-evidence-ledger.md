# YC evidence ledger

Last updated: July 17, 2026 (America/Santiago)

This ledger separates verified evidence from pending founder-assisted acceptance. A green readiness check does not replace an on-chain execution proof.

| Evidence | Result | Verification | Status for YC | Next action |
| --- | --- | --- | --- | --- |
| Local code quality | 85/85 tests, lint and production build passed | npm run qa:local on July 17 | Verified locally | Repeat before final recording |
| Graphify MCP | 10 read-only tools listed; graph_stats and query_graph executed successfully | npm run graph:mcp:smoke | Verified locally | Start a new trusted Codex task to load project MCP config |
| Production health | Postgres active, Mainnet disabled | acceptance doctor, 6/6 | Verified live readiness | Preserve Testnet-only boundary |
| Production agent page | HTTP 200 | acceptance doctor | Verified live | Use the selected demo account |
| Public MCP discovery | Sandbox, personal-agent and provider surfaces advertised | acceptance doctor | Verified live discovery | Do not claim external OAuth clients yet |
| Official Stellar x402 challenge | Exact 0.0100000 USDC challenge returned | acceptance doctor | Verified live challenge only | Still requires confirmed payment/replay proof |
| Testnet distributor | 19.0000000 USDC and sufficient XLM | acceptance doctor | Verified readiness | Reserve balance for dedicated acceptance users |
| Travala search | Five Santiago options returned for Sep 1-3, 2026 | acceptance Travala, 7/7 | Verified live read-only | Repeat once before recording |
| Privy per-user wallet | Implemented and previously observed | Product evidence | Needs fresh two-user acceptance | Use a new second email |
| Personal memory isolation | Unit routing tests pass | Automated tests | Needs real two-user acceptance | Save and query memories under two identities |
| x402 duplicate resistance | Unit and sandbox replay tests pass | Automated tests | Needs confirmed on-chain replay audit | Run confirmed replay with temporary Privy token |
| DeFindex 1 XLM deposit | Preparation and signing path implemented | Automated tests | Needs founder-approved Testnet transaction | Approve exactly one XLM deposit |
| Notion search | OAuth and MCP code implemented | Automated tests | Optional real-user acceptance | Use only if it succeeds twice |
| Design partners | Contacts identified | Founder context | Pending written commitments | Obtain three bounded pilot statements |
| YC demo | Script and preflight exist | Documentation | Pending recording | Record only after stop conditions are green |

## Evidence captured on July 17

- Production doctor generated at 2026-07-18T03:46:26.926Z: 6 passed, 0 failed.
- Travala acceptance generated at 2026-07-18T03:46:29.693Z: 7 passed, 0 failed.
- Travala result: Santiago, Chile; five options; first result DoubleTree by Hilton Hotel Santiago - Vitacura.
- Graphify MCP: 957 nodes, 1,847 edges, 63 communities; 99% extracted relations.

## Founder-assisted gates

The remaining strongest proofs cannot be completed by background automation because they intentionally require human identity or transaction approval:

1. Fresh second Privy login.
2. Temporary dedicated-user access token for acceptance.
3. Exact DeFindex 1 XLM review and signature.
4. Three written partner commitments.
5. Final product recording and YC factual answers.

Never put Privy tokens, signatures, OTP codes, private email content or admin credentials in this ledger.
