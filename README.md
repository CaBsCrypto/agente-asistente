# agent-assistant

Non-custodial commerce infrastructure for AI agents. The agent discovers and
prepares an action, policy constrains it, the user authorizes it, and the system
returns separate evidence for execution and fulfillment.

Production: https://agente-asistente.vercel.app

## What works today

- Public landing, integration lab and early-access waitlist.
- Founder dashboard for waitlist qualification and pilot tracking.
- Remote MCP with offer discovery, intent preparation, policy, authorization,
  execution and receipt tools.
- Chrome WebMCP registration for safe discovery and intent preparation.
- Durable Neon Postgres intents, policy decisions, authorization hashes, audit
  events and receipts.
- Database-enforced intent and receipt idempotency.
- Guided `/demo` flow that visibly proves duplicate execution protection.

Settlement remains simulated. No production funds or private keys are handled.

## Local development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and configure the documented values. The
commerce demo can fall back to process memory locally; production uses
`DATABASE_URL` for durable state.

## Validation

```bash
npm test
npm run build
```

## Main surfaces

- `/demo` — guided action and replay-protection proof.
- `/connections` — prioritized integration lab.
- `/developers` — MCP endpoint and tool documentation.
- `/waitlist` — early-access capture.
- `/admin` — protected founder operations.
- `/api/mcp` — remote MCP over Streamable HTTP.
- `/api/commerce` — demo commerce orchestration API.

## Safety boundary

The current product is a sandbox. Authorization is explicit but simulated; it
is not a wallet signature. The next technical milestone is replacing the demo
receipt with a user-signed Stellar testnet transaction while preserving the
same intent, policy, idempotency and audit contract.

See `docs/mcp-integration.md`, `docs/waitlist-operations.md` and
`docs/admin-operations.md` for operational detail.
