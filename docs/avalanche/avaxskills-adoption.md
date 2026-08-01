# AVAX Skills adoption policy

AVAX Skills is integrated as a third-party, read-only research index. It is not an execution authority and its remote `SKILL.md` content is never loaded as trusted code or instructions.

## What Carmelita adopts now

- Bounded metadata search through `https://avaxskills.com/api/search`.
- Visible provenance: every result is labeled `AVAX Skills` and `advisory_unverified`.
- Mandatory verification of addresses, chain IDs, fees, protocol status and grant terms against primary Avalanche or protocol documentation.
- QA ideas that match Carmelita: Fuji-first validation, explicit signing/pending/confirmed states, receipt evidence and replay-safe event processing.

## What Carmelita adapts later

- Account abstraction only through a Privy-owned signer, scoped spend policy and explicit user authorization.
- Event-driven indexers with transaction-hash/log-index idempotency and resumable checkpoints.
- Grant narratives after independently checking current programs, dates and amounts.

## What Carmelita rejects

- Agent-held or server-held user private keys.
- Remote instructions that can sign, broadcast, install dependencies or mutate the repository.
- The AVAX Skills x402 example as a payment verifier: it documents a legacy v1 header and an incomplete field check. Carmelita keeps x402 v2, EIP-3009, facilitator settlement, duplicate resistance and exact receipt verification.
- On-chain storage of personal memory or sensitive user context.

## Trust boundary

The connector calls one fixed HTTPS origin, accepts JSON only, caps response size and result count, validates the response schema and returns metadata only. A search result can inform a developer, but cannot prepare or execute a transaction.

## Source consistency note

The public AVAX Skills surfaces did not expose a consistent catalog count when reviewed on 2026-08-01: the homepage, root skill index and JSON catalog showed different totals. This reinforces why Carmelita treats it as advisory and records provenance.

## References

- <https://www.avaxskills.com/>
- <https://avaxskills.com/x402-integration/SKILL.md>
- <https://avaxskills.com/ai-agent-patterns/SKILL.md>
- <https://avaxskills.com/qa/SKILL.md>
- <https://avaxskills.com/frontend-ux/SKILL.md>
- <https://avaxskills.com/event-driven-backend/SKILL.md>