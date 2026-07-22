# Carmelita for Business: onboarding guide

Last reviewed: **July 22, 2026**

This guide explains how an existing product or service becomes usable by
Carmelita and other personal agents.

## The goal

Do not integrate an entire company at once. Start with one useful, reversible
action such as:

- search availability;
- request a quote;
- reserve a date;
- create or cancel an order;
- publish a task;
- check status.

The provider remains the source of truth. Carmelita adds discovery,
authorization, execution control and evidence around the provider''s official
surface.

## Choose the smallest integration path

| Path | Best for | Provider work | Initial capability |
| --- | --- | --- | --- |
| Managed listing | Small business without an API | Submit catalog, rules and contact details | Discovery and assisted request |
| Guided connector | Product with stable web or internal endpoints | Share documentation and sandbox access | One narrow action |
| HTTP API | Product with an existing API | Provide auth, schemas and test environment | Reliable read and write tools |
| MCP server | Product already serving agents | Publish scoped tools and auth | Native agent discovery and calls |
| WebMCP | Browser-first service | Add structured page actions | In-browser discovery and preparation |
| Enterprise adapter | Marketplace or regulated workflow | Joint security and fulfillment design | Multiple governed actions |

MCP is not mandatory. A stable API is enough. Carmelita can expose the API as a
narrow tool while preserving the same user experience.

## Onboarding flow

~~~mermaid
flowchart LR
    A["1. Diagnose"] --> B["2. Choose one action"]
    B --> C["3. Define auth and scope"]
    C --> D["4. Map request and response"]
    D --> E["5. Test read-only"]
    E --> F["6. Test reversible write"]
    F --> G["7. Add evidence and replay safety"]
    G --> H["8. Publish verified status"]
~~~

### 1. Diagnose

Collect:

- service URL and documentation;
- catalog or inventory source;
- authentication method;
- sandbox or test account;
- rate limits;
- booking, cancellation and refund rules;
- expected provider receipt;
- support and escalation contact.

### 2. Choose one action

A useful first action has:

- clear inputs;
- a deterministic provider response;
- limited authority;
- a reversible test when possible;
- visible evidence in the provider''s own system.

### 3. Define authentication and scope

Use the narrowest available method:

- OAuth for per-user accounts;
- a scoped API key for a provider integration;
- a short-lived connection code for account linking;
- no authentication for genuinely public read-only discovery.

Carmelita never asks a user to paste a password into chat.

### 4. Define the action contract

Minimum example:

~~~json
{
  "action": "reserve_day",
  "provider": "example-workspace",
  "input": {
    "date": "2026-07-24",
    "locationId": "tellus-hub"
  },
  "authority": {
    "accountId": "connected-user",
    "approval": "required"
  },
  "idempotencyKey": "workflow_01J..."
}
~~~

The response should include:

~~~json
{
  "status": "confirmed",
  "providerReference": "booking_123",
  "occurredAt": "2026-07-22T12:00:00Z",
  "evidenceUrl": "https://provider.example/bookings/booking_123"
}
~~~

### 5. Validate in stages

| Stage | Required proof |
| --- | --- |
| Discovered | Tool or endpoint is reachable |
| Authenticated | Correct account is linked |
| Read-only connected | Live inventory or account state is returned |
| Ready to test | Exact write action can be prepared |
| Connected | Action is confirmed in the provider''s own system |
| Payment verified | Settlement receipt is confirmed separately |
| Fulfillment verified | Delivery evidence is confirmed separately |

The public integration status must never advance without evidence.

## Security requirements

Every sensitive action should have:

- authenticated subject;
- explicit capability scope;
- frozen parameters and digest;
- policy and risk evaluation;
- exact user approval when required;
- idempotency key;
- provider or on-chain receipt;
- audit record without secrets;
- revocation and error recovery path.

Carmelita does not custody user funds. A wallet action is signed by the user''s
wallet after transaction-specific review.

## What the provider receives

- a documented integration contract;
- a clear status in the Integration Lab;
- structured discovery through Carmelita;
- qualified requests with explicit user context;
- one canonical idempotency key per action;
- traceable evidence and error codes;
- a path from pilot to production.

## Definition of done for a pilot

A pilot is complete when:

- [ ] one action is documented;
- [ ] authentication works for a new user;
- [ ] a read-only request returns live data;
- [ ] a write request shows exact parameters before execution;
- [ ] the provider confirms the action in its own system;
- [ ] repeating the request does not duplicate the action;
- [ ] revocation or cancellation is tested when supported;
- [ ] limitations are visible in the UI and documentation;
- [ ] no secret appears in logs, screenshots or client code.

## Current reference implementations

- **UNBLCK:** connection code, live account state, booking and cancellation.
- **Travala:** public MCP hotel discovery; no booking authority.
- **Notion:** per-user OAuth plus official MCP search; acceptance pending.
- **DeFindex:** direct public Stellar contract action with user wallet signing.
- **x402:** payment challenge, exact approval, settlement and replay receipt.

## Start an integration

1. Read the [Developer guide](developer-guide.md).
2. Use the [new product integration brief](NEW_PRODUCT_INTEGRATION_AGENT_PROMPT.md).
3. Check the complete [API reference](api-reference.md).
4. Record every test using the [acceptance testing guide](acceptance-testing.md).
