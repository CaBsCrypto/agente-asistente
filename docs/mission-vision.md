# Mission, vision and principles

Last reviewed: **July 22, 2026**

This document defines why Carmelita exists, the future it is working toward and
the principles that constrain how it gets there.

## Purpose

Technology should reduce the distance between a person''s intention and a useful
result without taking control away from that person.

Carmelita exists to make delegation practical: the user can ask naturally, keep
ownership of identity and funds, define the rules, and receive evidence of what
was actually done.

## Mission

> **Enable people to safely delegate real-world and digital actions to a
> personal agent while retaining control over their identity, data, accounts and
> money.**

We pursue this mission by connecting existing services to one conversational
experience and applying a consistent lifecycle of context, policy, approval,
execute-once behavior and verifiable evidence.

## Vision

> **A world where every person can have a trusted personal agent, and every
> useful business can be discovered and used by agents through open, secure and
> interoperable interfaces.**

In that world:

- people describe outcomes instead of operating fragmented applications;
- personal agents understand context without owning the user;
- autonomy grows only inside explicit, revocable rules;
- businesses expose narrow capabilities without rebuilding their products;
- wallets and accounts remain controlled by their owners;
- payments, bookings and deliveries produce independent evidence;
- local businesses participate in the same agent economy as global platforms.

## Our north star

Carmelita does not optimize for messages sent or answers generated.

The north-star outcome is:

> **A useful action completed correctly, within the user''s rules, with evidence
> and without an unintended duplicate.**

Supporting measures include:

- users who complete a first verified action;
- successful actions per active user;
- actions completed without manual app switching;
- approval comprehension and policy-block accuracy;
- duplicate actions prevented;
- connected providers with at least one verified capability;
- repeat usage and provider retention.

## Operating principles

### 1. User sovereignty

The user owns the relationship, context, accounts and wallet. Connections are
scoped and revocable. Carmelita should never require custody merely to make the
experience convenient.

### 2. Earned autonomy

Autonomy is not an all-or-nothing switch. Carmelita begins by preparing actions
and requesting approval. It earns more autonomy only through explicit rules,
limited scopes, predictable behavior and reversible decisions.

### 3. Proof over promises

A recommendation is not execution. A transaction hash is not fulfillment. An
integration is called live only when the result is confirmed in the provider or
network that owns the truth.

### 4. Exact authority

Approval applies to one frozen action: the intended account, provider, amount,
asset, destination and expiry. Changing a material parameter invalidates the
approval.

### 5. Safe repetition

Networks and users retry. Every write action must be designed so a retry returns
the prior outcome or fails safely instead of creating a duplicate payment,
booking or order.

### 6. Minimum necessary access

Start with one narrow capability and the smallest permission scope. A provider
does not need to expose its entire product, and a user should not grant broad
account access for a single action.

### 7. Provider truth

Inventory, prices, bookings, refunds and fulfillment remain authoritative in the
provider''s system. Carmelita orchestrates and verifies; it does not invent
provider state.

### 8. Accessible by default

The product should hide unnecessary protocol complexity. Users speak naturally
in their language. Technical detail becomes visible when it affects risk,
authority or verification.

### 9. Global architecture, local entry

Carmelita begins in Latin America because fragmented services and direct founder
relationships create an actionable wedge. Interfaces, security boundaries and
provider contracts are designed to work globally.

### 10. Honest progress

Testnet is labeled Testnet. Read-only is labeled read-only. A technical pilot is
not revenue, and outreach is not a partnership. Trust depends on saying exactly
what works.

## Strategic horizon

### Now — prove repeatable execution

- Make onboarding work for a fresh user.
- Demonstrate one real off-chain action and one real Testnet transaction.
- Preserve replay-safe receipts and understandable approvals.
- Validate the Personal Knowledge Vault with real preferences and rules.
- Secure design-partner commitments around narrow useful actions.

### Next — make integration self-service

- Let businesses publish and test one capability with less founder involvement.
- Add user-controlled OAuth connections and permission management.
- Expand reusable provider adapters and evidence contracts.
- Measure completed actions, repeat usage and provider value.
- Introduce carefully limited production payment paths only after security review.

### Later — become an open execution network

- Allow personal agents to use services across regions and payment rails.
- Make user policies portable across models, interfaces and devices.
- Support provider reputation based on verified execution and fulfillment.
- Coordinate reservations, purchases, tasks and financial actions without
  requiring one company to own every marketplace.

## What must remain true as Carmelita grows

~~~mermaid
flowchart LR
    I["User intent"] --> C["Relevant context"]
    C --> R["Explicit rules"]
    R --> A["Scoped authority"]
    A --> E["Execute once"]
    E --> V["Independent evidence"]
    V --> T["User trust"]
    T -. "earns limited autonomy" .-> A
~~~

Scale must not erase the trust model. More integrations, models, wallets or
automation should still preserve:

- clear identity;
- narrow authority;
- user-controlled approval;
- replay resistance;
- provider and network evidence;
- revocation;
- honest status.

## The promise we want to earn

> **Tell Carmelita what you need. It understands your context, works within your
> rules and brings back a result you can verify.**

This is an aspiration that must be earned action by action. The current product
status and limitations are documented in [Product status](product-status.md).
