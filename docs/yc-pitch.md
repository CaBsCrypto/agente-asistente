# YC pitch and narrative

Last updated: July 22, 2026

This document applies the [canonical Carmelita product narrative](product-narrative.md) to fundraising. Product status and evidence must come from [product-status.md](product-status.md) and [yc-evidence-ledger.md](yc-evidence-ledger.md).

## The narrative

AI assistants can recommend what to do, but they usually stop before a real
booking or payment. The missing layer is controlled execution: who is acting,
what the user authorized, how much can be spent, whether the action executed
once, and what evidence proves the result.

Carmelita gives every user a user-owned wallet, persistent preferences and
spending rules. It connects to services through APIs and MCP, prepares an exact
action, requests the required approval, executes it once and stores the receipt.

We are starting with crypto-native and local services in Latin America, where
commerce is fragmented and the founder already has direct access to early
projects. The long-term opportunity is to become the transaction layer used by
personal agents and agent-ready businesses globally.

## Recommended one-liner

**Carmelita is a personal AI agent with memory, permissions and a user-owned wallet that safely executes real-world actions.**

**Knows you. Acts for you.**

Expanded version:

**Every user gets a user-owned wallet and explicit spending rules; businesses
connect through APIs or MCP; every action produces verifiable evidence.**

Do not lead with WebMCP, x402, LangGraph, Stellar or “the agentic economy.” Those
are implementation details. Explain them only after the listener understands the
user action.

## Three-part story

### Problem

Agents can search and recommend, but real actions remain fragmented across
logins, permissions, payments and provider APIs. Giving an agent unrestricted
wallet or account access is unsafe, and retries can create duplicate charges or
bookings.

### Product

The agent converts a conversation into a frozen action, evaluates the user's
rules, asks for exact approval, executes once and preserves provider or on-chain
evidence. The server never holds the user's wallet key.

### Proof

- A real UNBLCK hub day-pass was booked and cancelled through chat.
- A Privy wallet completed a real 0.01 USDC x402 payment on Stellar Testnet.
- Replaying an already completed action returns the original receipt instead of
  executing again.
- A user deposited 1 XLM into a live DeFindex Testnet vault.
- Travala returns live hotel inventory without moving funds.

These are technical product proofs, not revenue or signed commercial
partnerships.

## One-minute founder video

YC asks for the founder speaking to camera, not a product demo. Use these bullet
points and speak naturally instead of reading a script:

1. Name, location and solo-founder status.
2. “I am building a personal AI agent that can complete transactions, not just
   recommend them.”
3. Agents currently stop at payment or booking because identity, authority and
   provider integrations are fragmented.
4. Every user gets a user-owned wallet and spending rules; services connect by
   API or MCP; the agent asks for exact approval and stores evidence.
5. State the three strongest proofs: UNBLCK, x402 and DeFindex.
6. Start in Latin America, where the founder has direct access to early services;
   expand globally as businesses become agent-ready.

Practice version, approximately one minute:

> Hi, I'm [NAME], the solo founder of Carmelita in Chile. I am building a
> personal AI agent that can complete bookings and payments, not just recommend
> them. Today agents usually stop before a real transaction because identity,
> permissions and provider integrations are fragmented. Carmelita gives
> every user a user-owned wallet and explicit spending rules. A service connects
> through its API or MCP; the agent prepares an exact action, asks for approval,
> executes it once and stores evidence. Our prototype has booked and cancelled a
> real UNBLCK day-pass, completed a 0.01 USDC x402 payment with replay protection,
> and deposited 1 XLM into DeFindex on Stellar Testnet. I am starting with
> crypto-native and local services in Latin America, where I already have direct
> access to early projects, and expanding into the transaction layer for personal
> agents globally.

Replace `[NAME]`. Do not memorize this word for word.

## 30-second conversational pitch

> AI assistants can find a hotel or a service, but they usually cannot complete
> the transaction safely. Carmelita gives each user a user-owned wallet,
> personal spending rules and exact approvals. Businesses connect through APIs or
> MCP, and every booking or payment executes once with evidence. We have already
> completed a real UNBLCK booking and cancellation, a Stellar x402 Testnet payment
> and a DeFindex deposit.

## Separate 90-second product demo

This is separate from the founder video.

### 0-15 seconds — identity

Show a new user signing in and receiving a different Stellar wallet.

Say:

> Every user gets their own wallet and private memory. Login creates identity; it
> never authorizes a payment.

### 15-40 seconds — exact payment

Show the frozen 0.01 USDC x402 action, explicit Privy approval and confirmed
Testnet receipt.

Say:

> The agent cannot change the recipient, asset or amount after approval. Privy
> signs from the user's wallet and our server never holds the key.

### 40-55 seconds — duplicate protection

Replay the same payment ID and show the same hash, unchanged balance and zero
second debit.

Say:

> Retries return the original receipt instead of charging the user twice.

### 55-75 seconds — real-world action

On the validated account, show UNBLCK state and the completed booking/cancellation
evidence.

Say:

> The same control flow works off-chain. The agent booked and cancelled a real
> day-pass through UNBLCK's API.

### 75-90 seconds — broader utility

Show a live Travala hotel search.

Say:

> Services can be discovered without moving money, and sensitive actions add
> policy and approval only when required. We are building the transaction layer
> between personal agents and businesses.

## Application answer: What does your company make?

> Carmelita is a personal AI agent with memory, permissions and a user-owned
> wallet that safely executes real-world actions. Each user gets persistent
> preferences and spending rules. Businesses connect through APIs or MCP; the
> agent freezes the requested action, applies policy, asks for exact approval,
> executes once and stores provider or on-chain evidence.

## Why now?

> Models can reliably call tools, services are becoming machine-readable through
> APIs and MCP, and embedded wallets plus machine-payment protocols now allow an
> agent to prepare real transactions. What is still missing is a shared control
> layer for user authority, duplicate prevention and fulfillment evidence.

## Why this founder?

> I live in Latin America and see both sides of the gap: users increasingly want
> agents to act for them, while local services remain fragmented across websites,
> messages and payment methods. I built the current product end to end as a solo
> founder and used direct relationships with local and Stellar projects to turn
> the idea into real booking and on-chain proofs.

Add concrete founder history before submission: products built, years of
experience, relevant communities and the hardest thing personally achieved.

## Initial customer and business model

The free personal agent creates demand. Service providers pay for agent-ready
catalogs, integrations, policy controls and analytics, plus a usage fee on
successfully completed actions. Initial design partners are crypto-native and
local service businesses that can expose one narrow action, such as a booking or
digital service.

This is a hypothesis until merchant interviews or paid pilots validate pricing.

## Defensibility

The moat is not the chat interface or a blockchain. It is the accumulated graph
of user rules, provider capabilities, execution history and verified outcomes,
plus the integration layer that makes the same approval and evidence model work
across many services.

## Honest boundaries

- Payments and DeFindex proofs are on Stellar Testnet, not Mainnet.
- UNBLCK is a live technical integration, not yet a paying customer.
- Travala is live search only; booking is not enabled.
- The company has no revenue yet unless that changes before submission.
- Do not claim a signed partnership, escrow, production merchant settlement or
  global coverage without evidence.

## Likely interview questions

**Why is this not just ChatGPT plus APIs?**

Because the difficult part is not generating text. It is binding an authenticated
user to a wallet, applying persistent policy, freezing exact transaction fields,
executing once and verifying provider or on-chain evidence across services.

**Who pays?**

Initially, service providers pay for integration and qualified agent demand. The
personal agent is the distribution surface. Pricing remains a hypothesis until
merchant interviews validate it.

**Why start in Latin America?**

It gives the founder direct access to fragmented service businesses where a
single API-enabled action creates immediate value. The protocol and product are
global; Latin America is the initial distribution wedge.

**What prevents OpenAI or wallets from doing this?**

They may provide models, wallets or generic tool calling. Carmelita is the
provider-neutral execution record and policy layer across models, wallets and
services. The current advantage is speed, focused integrations and verified
outcomes, not an unassailable moat today.

**What is the biggest risk?**

Distribution and merchant adoption, not basic technical feasibility. The next
milestone is repeated use by new users and written pilot commitments from service
providers.

## Final message to remember

**Carmelita knows you. Carmelita acts for you.**
