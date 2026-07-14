# MCP integration

agent-assistant participates in MCP in two directions:

- **Inbound MCP:** other agents call agent-assistant commerce tools.
- **Outbound connectors:** agent-assistant calls external MCP servers or APIs such as Notion, Travala and CoinMarketCap.

An external product does not automatically need MCP. OAuth plus an API can be sufficient; MCP is preferred when the provider offers a stable, scoped tool contract.

## Inbound remote MCP

Production Streamable HTTP endpoint:

~~~text
https://agente-asistente.vercel.app/api/mcp
~~~

Local endpoint:

~~~text
http://localhost:3000/api/mcp
~~~

Client configuration:

~~~json
{
  "mcpServers": {
    "agent-assistant": {
      "url": "https://agente-asistente.vercel.app/api/mcp"
    }
  }
}
~~~

Use MCP Inspector locally:

~~~bash
npx @modelcontextprotocol/inspector@latest
~~~

### Tools

| Tool | Behavior | Safety |
| --- | --- | --- |
| search_offers | Search public offers | Read-only, idempotent |
| get_offer | Read one offer | Read-only, idempotent |
| create_intent | Freeze an action under a caller idempotency key | Mutating, non-destructive, idempotent |
| evaluate_policy | Apply expiry, network and 100 USDC sandbox rules | Mutating, non-destructive, idempotent |
| demo_authorize_intent | Record sandbox confirmation | Not a wallet signature |
| execute_authorized_intent | Create or replay a simulated receipt | Destructive annotation, idempotent |
| get_receipt | Read execution evidence | Read-only, idempotent |

### Recommended flow

1. Search and select an offer.
2. Create an intent with a stable idempotency key.
3. Evaluate policy.
4. Display merchant, amount, network and expiry.
5. Obtain explicit user confirmation.
6. Execute with the temporary sandbox capability.
7. Store and verify the receipt.
8. Verify settlement and fulfillment separately.

The endpoint is a public sandbox. Production mutation requires user-bound OAuth 2.1, per-tool scopes, revocation, rate limits and evaluation coverage.

## Outbound connector model

| Provider | Transport | Authentication | Current scope |
| --- | --- | --- | --- |
| Notion | Official remote MCP | OAuth 2.1 with PKCE and dynamic registration | Read-only search; acceptance pending |
| Travala | Public remote MCP | Public access for current tool | Read-only hotel discovery |
| CoinMarketCap | Official Trial Pro API | Keyless trial endpoint | Read-only quotes and watchlist |

Outbound OAuth tokens are encrypted with CONNECTOR_ENCRYPTION_KEY. Login to agent-assistant does not grant access to an external provider; the user must complete that provider consent flow.

## WebMCP

When Chrome exposes document.modelContext, app/webmcp-registry.tsx registers:

- search_agent_offers
- prepare_commerce_intent

WebMCP acts in an open browser tab. Remote MCP works headlessly. Browser-scoped wallet authorization and execution are excluded.

## Persistence and replay safety

With DATABASE_URL, Neon stores intents, policy decisions, hashed authorization capabilities, receipts and audit events. Database uniqueness constraints enforce one intent per idempotency key and one receipt per intent.

Without DATABASE_URL, the commerce demo can use temporary process memory. This is not suitable for production, waitlist capture or persistent connections.

## Discovery and health

- GET /.well-known/mcp
- GET /api/health
- GET /api/commerce
- POST /api/mcp

## Path to production mutation

1. Add OAuth 2.1 and scopes to inbound MCP.
2. Bind every mutating tool call to the authenticated user.
3. Replace demo authorization with transaction-scoped wallet approval.
4. Submit one Stellar Testnet transaction and persist its hash.
5. Prove retries return the existing transaction without resubmission.
6. Add connector-specific settlement and fulfillment verification.
