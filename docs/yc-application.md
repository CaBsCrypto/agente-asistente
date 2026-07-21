# YC application answer bank

Last updated: July 21, 2026

This is the working source for the application and interview. Replace every bracketed field before submission. Never convert a roadmap item into a traction claim.

## Company in one sentence

**agent-assistant is a permissioned action layer that lets AI agents use services and make non-custodial payments from user-owned wallets.**

Short alternative:

**The control and commerce layer between AI agents, user-owned wallets and businesses.**

## What are you building?

People are beginning to ask agents to research, reserve, hire and pay, but today's integrations stop at chat or give broad access with weak controls. agent-assistant gives each user a persistent agent and a user-owned Stellar wallet, connects the agent to external products through MCP, APIs and OAuth, and applies the same lifecycle to every sensitive action: freeze the intent, evaluate policy, request exact approval, execute once and preserve evidence.

The product also gives businesses a path to become discoverable and actionable by agents through structured offers and narrow MCP tools. We are starting with Stellar Testnet and Latin American design partners, but the interface is designed for global services.

Strongest live proofs (verified against real external systems):

- **Real-world agent action — UNBLCK Agent Hub (Live).** From a chat message, the agent links a real WhatsApp/Telegram identity, reads live hub state, and books or cancels a real day-pass at the Tellus Hub. Each booking and the cancellation were confirmed on UNBLCK's own member portal, which issues a scannable QR access pass per day; a cancellation refunded the credit. The whole flow runs through the same lifecycle (frozen SHA-256 intent, policy, exact approval, execute-once, evidence) and is replay-safe. Localized EN/ES.
- **Non-custodial payment — Stellar x402 Testnet (Live proof).** A Privy user completed the official 0.01 USDC x402 flow; settlement, delivery evidence and the replay-safe receipt are durable, so a repeated confirmation returns the same receipt without a second debit. The wallet signs client-side; the server never holds the key.

What else works today:

- Privy Google/email authentication in production.
- One automatically created, user-owned Stellar Testnet wallet per user.
- On-chain wallet activation, balance lookup and explorer verification.
- Persistent chat, connections and watchlists in Neon Postgres.
- Live read-only CoinMarketCap quotes and watchlists.
- Live read-only Travala hotel discovery.
- Public inbound MCP commerce sandbox with seven narrow tools; the same durable intent, policy, approval and duplicate-resistant receipt model governs every sensitive action.
- A Telegram bot bridge that reaches the full agent (chat, UNBLCK, read-only tools) with account linking to the web identity; the scaffold for in-Telegram wallet signing (a Mini App) is in place.
- Direct DeFindex Soroban integration implemented for XLM and USDC and ready for a user acceptance test.

Not yet claimed as complete:

- No confirmed DeFindex deposit receipt from the current user flow.
- Notion OAuth and search still require a complete real-user acceptance test.
- The Telegram bot is built and merged but not yet switched on in production (pending bot credentials).
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

UNBLCK is now a **live technical integration**: the agent completes real hub bookings and cancellations against their Agent Hub API, confirmed on their own member portal. DeFindex and ArcusX remain candidates, and Travala provides an external read-only travel discovery path. A live technical integration is not a signed commercial deal — do not describe any partner as a signed or paying customer until written confirmation exists.

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
| **Real-world agent action** | **UNBLCK booking + cancellation, confirmed on the partner portal with a QR access pass** | **Live** |
| **Non-custodial payment** | **x402 0.01 USDC Testnet flow completed with a replay-safe receipt** | **Live Testnet proof** |
| Controlled execution | Intent + policy + exact approval | Sandbox (real on the UNBLCK and x402 paths) |
| Duplicate resistance | Same receipt / same workflow returned on retry | Live on UNBLCK and x402; sandbox elsewhere |
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

**What can I try?** Sign in, receive a Stellar Testnet wallet, use live external data, ask the agent to book and then cancel a real UNBLCK hub day-pass (confirmed on the partner's own portal), and complete the 0.01 USDC x402 Testnet payment whose receipt is reused on retry.

**What is the next technical proof?** One Privy-signed DeFindex XLM Testnet deposit whose transaction hash is reused on retry, plus the first written merchant/partner commitment.

**Why could this become large?** Every agent that acts needs controlled authority, and every business that wants agent demand needs a machine-readable and payable interface.