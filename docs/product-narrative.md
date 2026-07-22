# Carmelita product narrative

Last reviewed: **July 22, 2026**

This is the canonical explanation of Carmelita. Use it before the technical
documentation, partner material, demo script or fundraising answers.

## The shortest explanation

> **Carmelita is a personal AI agent that turns a conversation into a controlled,
> verifiable action.**

It remembers the context the user chooses to save, connects to existing
services, applies explicit rules, asks for approval when necessary and returns
evidence of what happened.

**Primary promise:** Ask Carmelita. She prepares it. You decide.

**Supporting line:** Knows you. Acts for you.

## The problem

AI assistants are increasingly good at finding information and recommending the
next step. They still struggle to complete that step safely.

A real booking, payment or account action requires answers to questions that a
normal chat interface does not resolve:

- Who is the authenticated user?
- Which account or wallet is allowed to act?
- What exactly did the user approve?
- What limits and preferences apply?
- Can a retry create a duplicate charge or booking?
- What proves settlement?
- What separately proves delivery or fulfillment?

Carmelita is the execution and control layer between a user''s intent and the
services that can fulfill it.

## What the user experiences

The user should not need to understand MCP, APIs, wallets or orchestration
graphs.

They should be able to say:

- “Book me a workspace next Friday.”
- “Find a hotel that matches my preferences.”
- “Pay for this report, but never spend more than 10 USDC without asking.”
- “Deposit 1 XLM into DeFindex Testnet.”
- “Search my notes for the YC application.”

Carmelita then:

1. understands the requested outcome;
2. retrieves only relevant user context;
3. selects the appropriate connected service;
4. prepares the exact action;
5. applies rules and risk limits;
6. requests the required approval;
7. executes once;
8. returns provider or on-chain evidence.

## How it works

~~~mermaid
flowchart LR
    U["Natural-language request"] --> C["Relevant context"]
    C --> T["Select API, MCP or connector"]
    T --> I["Freeze exact action"]
    I --> P{"Policy and risk check"}
    P -->|Blocked| B["Explain why"]
    P -->|Approval required| A["User reviews and approves"]
    P -->|Allowed| E["Execute once"]
    A --> E
    E --> V["Verify provider or network evidence"]
    V --> R["Receipt and updated memory"]
~~~

The prepared action receives a stable digest. An approval is valid only for that
exact action. The workflow ID is also the idempotency key, so a retry returns
the previous result instead of executing again.

## The product has two sides

### Carmelita for people

A chat-first personal agent with:

- Privy authentication;
- a user-owned Stellar wallet;
- persistent conversation history;
- selected memories and preferences;
- spending and approval rules;
- connected applications;
- transaction and provider receipts.

### Carmelita for businesses

A path for a service to become discoverable and actionable by agents.

A business can start with one narrow action—search, quote, reserve, order or
cancel—through a conventional API, MCP server, WebMCP surface or guided
connector. Carmelita adds the shared control lifecycle around that action.

The business remains the source of truth for inventory, pricing, bookings and
fulfillment. Carmelita does not need to replace its application.

## What is real today

| Proof | Status | What it demonstrates |
| --- | --- | --- |
| Privy login and automatic Stellar wallet | Live | One persistent identity and user-owned wallet per user |
| UNBLCK booking and cancellation | Live | A real off-chain service action confirmed in the partner system |
| Stellar x402 payment | Live Testnet proof | A 0.01 USDC payment, protected delivery and replay-safe receipt |
| DeFindex deposit | Live Testnet proof | A Privy-signed 1 XLM vault deposit confirmed on-chain |
| Travala hotel search | Live, read-only | Real service discovery without payment authority |
| CoinGecko and CoinMarketCap | Live, read-only | Market information and persistent watchlists |
| Notion | Ready to validate | OAuth, encrypted tokens and official MCP routing are implemented |
| Mainnet payments and escrow | Planned | Not represented as production functionality |

Read [Product status](product-status.md) for the dated source of truth.

## Why the combination matters

A chatbot can generate text. A wallet can sign. An MCP server can expose a
tool. A payment rail can move value.

Carmelita combines the parts required for a user to delegate an outcome:

- **Memory** influences recommendations but never grants financial authority.
- **Identity** determines whose accounts and policies apply.
- **Connections** expose narrow capabilities from external services.
- **Rules** limit what can proceed and when approval is mandatory.
- **Execution** is bound to an exact, immutable action.
- **Evidence** distinguishes preparation, execution, settlement and fulfillment.

The durable advantage is the growing graph of user rules, provider capabilities,
execution history and verified outcomes—not the chat interface alone.

## Why start in Latin America

Latin American users already operate across fragmented websites, messaging
flows, wallets and payment methods. Many useful local services have no
agent-ready interface, but a single structured action can create immediate
value.

The initial wedge is local and crypto-native services where the founder has
direct access to teams. The architecture is global: a provider in Chile, India
or the United States can expose the same narrow action contract.

## Business model hypothesis

The personal agent is the demand surface. Businesses pay for:

- agent-ready catalog and offer publishing;
- connector setup and ongoing operations;
- policy, approval and audit tooling;
- analytics for qualified agent demand;
- usage on successfully completed actions;
- enterprise integrations and support.

This remains a hypothesis until interviews, paid pilots and repeat usage validate
pricing.

## Evidence language

Always keep these stages separate:

1. **Discovery:** Carmelita found the provider or tool.
2. **Authentication:** the user granted the required access.
3. **Preparation:** exact parameters were frozen and reviewed.
4. **Execution:** the provider or network accepted the action.
5. **Settlement:** money moved and a network receipt exists.
6. **Fulfillment:** the promised product or service was delivered.

Never use a discovery result as proof of execution, or a transaction hash as
proof of physical fulfillment.

## How to explain Carmelita by audience

### To a user

> Tell Carmelita what you need. It remembers your preferences, finds the right
> service and prepares the action. You approve what matters and receive a clear
> result.

### To a business

> Carmelita lets personal agents discover and use one controlled capability from
> your service without replacing your existing application or payment stack.

### To a developer

> Expose one narrow API or MCP action. Carmelita supplies identity, policy,
> exact approval, idempotent execution and evidence around it.

### To an investor

> Carmelita is the control and transaction layer between personal AI agents,
> user-owned accounts and businesses. The prototype has completed real bookings
> and replay-safe Stellar Testnet transactions.

## What Carmelita is not

- It is not a custodial wallet.
- It is not a generic chatbot wrapper.
- It is not a marketplace that must own every catalog.
- It is not a claim that every listed integration can execute.
- It is not a Mainnet payment or escrow product today.
- It is not a replacement for the provider''s inventory or fulfillment system.

## Read next

- New user: [User guide](user-guide.md)
- Business or partner: [Business onboarding](business-onboarding.md)
- Developer: [Developer guide](developer-guide.md)
- Architecture: [System architecture](architecture.md)
- Current truth: [Product status](product-status.md)
- Demo: [90-second live demo](live-demo.md)
- Fundraising: [YC pitch and narrative](yc-pitch.md)
