# Bidirectional MCP gateway

Carmelita now has three MCP surfaces and one outbound connector layer.

~~~mermaid
flowchart LR
    EXT["External agent or MCP client"] --> PERSONAL["Personal Agent MCP"]
    EXT --> SANDBOX["Commerce Sandbox MCP"]
    PROVIDER["Service provider"] --> ADMIN["Provider Admin MCP"]
    ADMIN --> CATALOG["Published service catalog"]
    CATALOG --> SANDBOX
    PERSONAL --> OUTBOUND["Outbound connectors"]
    OUTBOUND --> NOTION["Notion MCP"]
    OUTBOUND --> TRAVALA["Travala MCP"]
    OUTBOUND --> CMC["Market data (CoinGecko)"]
~~~

This closes the architectural loop:

1. Carmelita can use external services.
2. external clients can use a user's agent.
3. providers can administer services that agents discover.

## Surface 1: commerce sandbox

Endpoint:

~~~text
https://agente-asistente.vercel.app/api/mcp
~~~

Authentication: public sandbox.

Purpose:

- Search built-in and provider-published offers.
- Create duplicate-resistant intents.
- Evaluate demo policy.
- Demonstrate explicit approval.
- Create or replay simulated receipts.

This endpoint does not sign wallets or settle payments.

## Surface 2: personal agent MCP

Endpoint:

~~~text
https://agente-asistente.vercel.app/api/mcp/agent
~~~

Authentication: bearer token containing the signed-in user's current Privy access token.

Current scopes:

- agent:read
- agent:chat

Tools:

| Tool | Scope | Behavior |
| --- | --- | --- |
| get_agent_context | agent:read | Read profile, wallet metadata, connections and authority limits |
| get_agent_conversation | agent:read | Read durable conversation history |
| send_agent_message | agent:chat | Use the personal agent and its connected read-only tools |

Example development configuration:

~~~json
{
  "mcpServers": {
    "my-agent-assistant": {
      "url": "https://agente-asistente.vercel.app/api/mcp/agent",
      "headers": {
        "Authorization": "Bearer PRIVY_ACCESS_TOKEN"
      }
    }
  }
}
~~~

A Privy browser token is a development bridge, not the final external-client authorization UX. Production requires an OAuth 2.1 authorization server, consent screen, refresh/revocation flow and resource metadata.

Payment signing is deliberately absent from this MCP.

## Surface 3: service provider admin MCP

Endpoint:

~~~text
https://agente-asistente.vercel.app/api/mcp/provider
~~~

Authentication: scoped provider bearer key beginning with aap_provider_.

Current scopes:

- provider:read
- provider:offers:write

Tools:

| Tool | Scope | Behavior |
| --- | --- | --- |
| get_service_provider | provider:read | Read the authenticated provider profile |
| list_service_offers | provider:read | Read all offers owned by the provider |
| upsert_service_offer | provider:offers:write | Create a draft or update by stable externalId |
| set_service_offer_status | provider:offers:write | Publish, pause, archive or return to draft |

Provider isolation is enforced server-side. A provider token only resolves its own providerId; callers cannot supply another provider ID.

Published offers are included in the public search_offers and get_offer tools. Draft, paused and archived offers are excluded.

### Supported offer contract

The first version intentionally accepts only:

- kinds: finance, reservation, task, travel, product or service.
- currency: USDC.
- networks: stellar-testnet, base-sepolia or offchain-demo.
- non-negative amounts up to the tool input limit.

This prevents providers from publishing an offer that the current commerce intent model cannot represent.

### Provider onboarding

~~~mermaid
sequenceDiagram
    participant Founder
    participant Admin as Founder admin API
    participant DB as Neon
    participant Provider
    participant MCP as Provider MCP
    participant Public as Public MCP

    Founder->>Admin: Create provider
    Admin->>DB: Store provider
    Admin->>DB: Store SHA-256 token hash and scopes
    Admin-->>Founder: Return raw token once
    Founder-->>Provider: Deliver token securely
    Provider->>MCP: Authenticate with bearer token
    Provider->>MCP: upsert_service_offer
    MCP->>DB: Save draft
    Provider->>MCP: set status = published
    MCP->>DB: Publish offer
    Public->>DB: search_offers
    DB-->>Public: Include published provider offer
~~~

Founder provisioning UI:

~~~text
https://agente-asistente.vercel.app/admin/providers
~~~

Founder provisioning endpoint:

~~~text
GET/POST /api/admin/providers
~~~

It requires the existing founder admin session and same-origin protection. POST returns the raw provider token once. Only its SHA-256 hash, prefix, scopes and lifecycle metadata are stored.

Example request body:

~~~json
{
  "slug": "unblck",
  "name": "UNBLCK",
  "contactEmail": "developer@example.com",
  "tokenName": "UNBLCK pilot key"
}
~~~

## Token and scope model

~~~mermaid
flowchart TD
    RAW["Raw provider key returned once"] --> HASH["SHA-256 hash"]
    HASH --> DB["Neon token record"]
    CALL["MCP request"] --> EXTRACT["Extract bearer token"]
    EXTRACT --> VERIFY["Hash and compare"]
    VERIFY --> STATUS{"Active and not expired?"}
    STATUS -- No --> DENY["401"]
    STATUS -- Yes --> SCOPE{"Required scope present?"}
    SCOPE -- No --> FORBID["Tool error: scope required"]
    SCOPE -- Yes --> SUBJECT["Bind providerId from token"]
    SUBJECT --> TOOL["Execute isolated tool"]
~~~

Raw keys are never recoverable from the database. Rotation and revocation APIs remain the next operational milestone.

## Outbound connector layer

The personal agent continues to consume external products:

| Provider | Transport | User consent | Scope |
| --- | --- | --- | --- |
| Notion | Remote MCP | OAuth | Read-only search; acceptance pending |
| Travala | Remote MCP | Current public access | Read-only hotel discovery |
| CoinGecko (primary) + CoinMarketCap (fallback) | HTTP API | Keyless, optional demo key | Read-only quotes/watchlist |

This layer is separate from inbound MCP. A provider may connect through MCP, OAuth API or a conventional server API.

## Current security boundary

Implemented:

- Separate personal and provider principals.
- Tool scopes.
- Provider-owned resource isolation.
- Hashed provider tokens.
- Optional token expiry and last-used timestamps.
- Draft-before-publish lifecycle.
- Published-provider offers in public discovery.
- No payment signing through personal or provider MCP.

Still required before public launch:

1. OAuth 2.1 authorization for external personal-agent clients.
2. Self-service token creation, rotation and revocation.
3. Provider ownership verification and self-service onboarding.
4. Rate limits and abuse detection.
5. Order, fulfillment, cancellation and refund tools.
6. Webhooks or event subscriptions for providers.
7. Audit UI and per-tool usage metrics.
8. A real Stellar Testnet payment with replay protection.

## Next MCP milestone

The next complete vertical slice should be:

1. Founder creates the UNBLCK provider.
2. UNBLCK receives a scoped pilot key.
3. Its developer publishes one offchain-demo reservation.
4. The public MCP discovers that reservation.
5. A user creates and approves an intent.
6. UNBLCK receives an order/fulfillment event.
7. Payment remains disabled or simulated until the Stellar proof is complete.
