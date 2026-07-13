# agent-assistant MCP integration

## Status

The project exposes a working remote MCP server at `POST /api/mcp` over
Streamable HTTP. It is a public sandbox: it does not custody assets, sign
wallets or move real funds.

## Connect

```json
{
  "mcpServers": {
    "agent-assistant": {
      "url": "https://agente-asistente.vercel.app/api/mcp"
    }
  }
}
```

Use `http://localhost:3000/api/mcp` locally. MCP Inspector can also connect to
that endpoint.

```bash
npx @modelcontextprotocol/inspector@latest
```

## Tools

- `search_offers`: read-only public offer discovery.
- `get_offer`: read one offer.
- `create_intent`: freeze an action without executing it; requires an
  `idempotencyKey`.
- `evaluate_policy`: check expiry and the 100 USDC sandbox limit.
- `demo_authorize_intent`: record explicit confirmation and issue a temporary
  capability; this is not a wallet signature.
- `execute_authorized_intent`: create a simulated receipt; repeated execution
  returns the original receipt.
- `get_receipt`: retrieve execution evidence.

## Recommended flow

1. Search and select an offer.
2. Create an intent with a stable idempotency key.
3. Evaluate policy.
4. Show the exact amount, network and conditions to the user.
5. Obtain explicit confirmation.
6. Execute with the temporary authorization capability.
7. Store and verify the receipt.
8. Verify fulfillment separately.

## WebMCP

`app/webmcp-registry.tsx` registers offer search and intent preparation through
`document.modelContext` when Chrome exposes the API. WebMCP requires an open
browser tab; the remote MCP works headlessly. Authorization and execution are
not exposed through WebMCP yet, which keeps the first browser surface safer.

## Persistence

The backend selects its store automatically:

- Without `DATABASE_URL`: temporary process memory for local development.
- With `DATABASE_URL`: Neon Postgres with durable idempotency and audit events.

The migration creates tables for intents, policy decisions, authorization
capabilities, receipts and audit events. Authorization tokens are stored as
SHA-256 hashes. The unique `commerce_intents_idempotency_key_uidx` constraint
prevents duplicate intents, and `receipts_intent_uidx` guarantees one receipt
per intent even when multiple instances receive the same request.

## Current security boundary

- The public endpoint is a sandbox and still needs OAuth 2.1 and per-tool scopes
  before production use.
- Execution creates a deterministic demo reference, not a blockchain
  transaction.
- Private keys must never be sent to this server; Privy or the user's wallet
  should sign outside the orchestration core.
- Settlement and fulfillment must be verified independently.
- Rate limits, revocation, alerts and MCP evaluations are still required.

## Path to a real transaction

1. Add user identity and wallet connection.
2. Add OAuth for remote MCP clients.
3. Create a user-signed Stellar testnet transaction.
4. Connect DeFindex and verify the result on-chain.
5. Preserve the current intent and receipt replay guarantees.
6. Add an IRL reservation and fulfillment confirmation.
7. Enforce limits per merchant, network, category and period.

## Health and discovery

- `GET /api/health`
- `GET /.well-known/mcp`
- `GET /api/commerce`
- `POST /api/mcp`
- Product proof: `GET /demo`
