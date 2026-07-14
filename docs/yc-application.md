# YC application answer bank

Last updated: July 14, 2026

This is the working source for the application and interview. Replace every bracketed field before submission. Never convert a roadmap item into a traction claim.

## Company in one sentence

**agent-assistant is a permissioned action layer that lets AI agents use services and make non-custodial payments from user-owned wallets.**

Short alternative:

**The control and commerce layer between AI agents, user-owned wallets and businesses.**

## What are you building?

People are beginning to ask agents to research, reserve, hire and pay, but today's integrations stop at chat or give broad access with weak controls. agent-assistant gives each user a persistent agent and a user-owned Stellar wallet, connects the agent to external products through MCP, APIs and OAuth, and applies the same lifecycle to every sensitive action: freeze the intent, evaluate policy, request exact approval, execute once and preserve evidence.

The product also gives businesses a path to become discoverable and actionable by agents through structured offers and narrow MCP tools. We are starting with Stellar Testnet and Latin American design partners, but the interface is designed for global services.

## What works today?

- Privy Google/email authentication in production.
- One automatically created, user-owned Stellar Testnet wallet per user.
- On-chain wallet activation, balance lookup and explorer verification.
- Persistent chat, connections and watchlists in Neon Postgres.
- Live read-only CoinMarketCap quotes and watchlists.
- Live read-only Travala hotel discovery.
- Public inbound MCP commerce sandbox with seven narrow tools.
- Durable intent, policy, explicit sandbox approval and duplicate-resistant receipt.
- Direct DeFindex Soroban integration implemented for XLM and USDC and ready for a user acceptance test.

Not yet claimed as complete:

- No confirmed DeFindex deposit receipt from the current user flow.
- Notion OAuth and search still require a complete real-user acceptance test.
- No mainnet payments, merchant fulfillment or production escrow.
- No proprietary smart contract deployed.

## Why this problem?

AI agents can already recommend products and call tools, but real commerce requires more than tool access. A useful agent needs identity, scoped permissions, spending limits, replay protection, settlement evidence and a separate proof that the service was delivered. This missing control layer becomes especially visible in Latin America, where businesses operate across fragmented payment methods, informal workflows and uneven API infrastructure.

## Why now?

MCP, browser-native agent interfaces and machine-readable payment protocols are converging. More software is becoming callable by agents, but the safe authorization and merchant adoption layer is still unsettled. The opportunity is to become the neutral bridge that helps users delegate safely and helps businesses receive agent-originated demand.

## What is different?

Most products optimize one side of the market: a consumer agent, a wallet, an MCP server or a payment rail. agent-assistant connects both directions:

1. Our agent can use external products.
2. External agents can use our commerce tools.
3. Businesses can publish structured services that either side can discover.
4. The same policy, approval, idempotency and evidence model governs every sensitive action.

The wedge is not another chat interface. It is the trust layer that turns discovery into controlled execution.

## Initial customer and wedge

Initial users are crypto-native professionals and small teams that already use agents and need help researching, organizing and acting across services. Initial design partners are service businesses in Latin America that can expose one controlled action, such as a reservation, task or digital service.

The first partner candidates are DeFindex, UNBLCK and ArcusX. Travala provides an external read-only travel discovery path. Do not describe any candidate as a signed customer until written confirmation exists.

## Business model hypothesis

Start with paid integration and operations software for businesses:

- Monthly merchant or provider plan for catalog, agent visibility, policy controls and analytics.
- Usage fee for successfully executed agent actions.
- Enterprise integration and support for marketplaces or regulated workflows.

Do not lock pricing in the application before at least ten merchant interviews. The immediate validation question is whether a business will pay to receive qualified, permissioned agent demand.

## Solo founder answer

I am currently the sole founder and have built the product directly. I am open to a cofounder only if the person materially increases the company's speed and probability of winning, particularly in payments infrastructure, distribution or security. I am committed full-time and can participate in San Francisco. Add the founder's specific technical and domain history here: **[FOUNDER BACKGROUND]**.

## Evidence for the demo

| Claim | Proof shown | Status language |
| --- | --- | --- |
| Persistent identity | Privy login | Live |
| User-owned wallet | Stellar address + explorer | Live |
| External product access | CoinMarketCap or Travala response | Live, read-only |
| Controlled execution | Intent + policy + exact approval | Sandbox |
| Duplicate resistance | Same receipt returned on retry | Sandbox |
| On-chain DeFindex action | Explorer transaction | Do not show until validated |

## Metrics to insert before submission

- Waitlist signups: **[COUNT]**
- Activated users: **[COUNT]**
- Completed demo sessions: **[COUNT]**
- Merchant interviews: **[COUNT]**
- Pilot commitments or LOIs: **[COUNT]**
- Confirmed on-chain Testnet actions: **[COUNT]**

## Founder inputs still required

1. Full legal name, location and company entity status.
2. Founder biography and strongest examples of products personally built.
3. Exact date work started and full-time commitment date.
4. Current ownership and any previous equity commitments.
5. Verified user, waitlist and partner-interview numbers.
6. A one-minute founder video answer in natural language.
7. Why this founder will persist for ten years, stated from personal experience.

## Interview-level answer

**What are you?** A permissioned commerce and action layer for AI agents.

**What can I try?** Sign in, receive a Stellar Testnet wallet, use live external data and run a durable duplicate-resistance proof.

**What is the next technical proof?** One Privy-signed DeFindex XLM Testnet deposit whose transaction hash is reused on retry.

**Why could this become large?** Every agent that acts needs controlled authority, and every business that wants agent demand needs a machine-readable and payable interface.