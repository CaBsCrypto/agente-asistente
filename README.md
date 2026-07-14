# agent-assistant

<p align="center">
  <img src="public/agent-assistant-readme-cover.png" alt="agent-assistant connects people, agents, applications and payments through explicit permissions" width="100%" />
</p>

**A permissioned personal agent that connects to apps, prepares commerce actions and will pay from a user-owned wallet.**

The product combines a simple chat for end users with MCP, WebMCP and API surfaces for developers. Sensitive actions are constrained by identity, policy, explicit approval, idempotency and durable evidence.

> **Honest MVP boundary:** authentication, Stellar wallet creation, CoinMarketCap data, persistent user state and the commerce safety demo are real. Notion is implemented and awaiting complete user validation. Wallet-signed payments, DeFindex execution, merchant fulfillment and mainnet settlement are not live.

[Live product](https://agente-asistente.vercel.app) · [Open the agent](https://agente-asistente.vercel.app/agent) · [Safety demo](https://agente-asistente.vercel.app/demo) · [Integration Lab](https://agente-asistente.vercel.app/connections) · [Waitlist](https://agente-asistente.vercel.app/waitlist)

## What works now

Status meanings are shared across all project documentation:

- **Live:** deployed and verified against a real external system.
- **Ready to validate:** implemented, but missing a complete user acceptance test.
- **Sandbox:** working product proof with simulated execution or settlement.
- **Planned:** researched or designed, not implemented.

| Capability | Status | Current proof |
| --- | --- | --- |
| Google/email login | Live | Privy authentication on /agent |
| Automatic Stellar wallet | Live | One user-owned wallet, activated on Stellar Testnet |
| Wallet balance and explorer link | Live | Horizon account lookup |
| Persistent chat and user state | Live | Neon Postgres |
| CoinMarketCap quotes | Live, read-only | Official Trial Pro API |
| CoinMarketCap watchlist | Live, read-only | Per-user persistent watchlist |
| Notion OAuth and search | Ready to validate, read-only | OAuth PKCE, encrypted tokens and official Notion MCP |
| Travala hotel discovery | Live, read-only | Public Travala Travel MCP |
| Intent, policy and replay protection | Sandbox | Durable intent and one receipt per execution |
| Public inbound MCP | Sandbox | Seven tools at /api/mcp |
| Chrome WebMCP | Experimental sandbox | Offer discovery and intent preparation |
| Wallet-signed Stellar payment | Planned, next proof | No transaction submitted by the product yet |
| DeFindex, UNBLCK and ArcusX | Planned partner pilots | Contact or integration path only |
| Gmail, Drive, Calendar and Trello | Planned | Catalog entries only |

The dated source of truth is [docs/product-status.md](docs/product-status.md).

## Try the real product

### 1. Create the agent and wallet

1. Open [the agent](https://agente-asistente.vercel.app/agent).
2. Sign in with Google or email through Privy.
3. The server verifies the Privy access token and creates one user-owned Stellar wallet when needed.
4. The wallet is activated on Stellar Testnet and displayed with its balance and explorer link.

The application does not generate a password or expose a seed phrase. Login establishes identity; it does not authorize a payment.

### 2. Query CoinMarketCap

Try these prompts:

~~~text
What is the current XLM price on CoinMarketCap?
Add XLM to my CoinMarketCap watchlist
Show my crypto watchlist
~~~

Quotes come from CoinMarketCap and include a timestamp. This connection cannot trade or move funds.

### 3. Connect Notion

Use **Connect Notion** in the agent, approve access in Notion, then try:

~~~text
Search my Notion for agent payments
Find my YC notes in Notion
~~~

OAuth tokens are encrypted before storage in Neon. Until production consent and a search succeed for a real user, this integration remains **Ready to validate**.

### 4. Test duplicate-resistant execution

Open the [Safety demo](https://agente-asistente.vercel.app/demo), create an intent, evaluate policy, approve it and execute twice. The second request returns the original receipt.

Settlement is simulated. Persistence, authorization hashes, audit records and receipt uniqueness are real.

## Product model

~~~mermaid
flowchart LR
    U["User in chat"] --> ID["Privy identity"]
    ID --> A["Agent and tool router"]
    A --> P["Policy and explicit approval"]
    A --> N["Notion MCP"]
    A --> C["CoinMarketCap API"]
    A --> T["Travala MCP"]
    P --> W["User-owned Stellar wallet"]
    W --> S["Stellar Testnet"]
    A <--> DB["Neon state and audit trail"]
~~~

| Audience | Experience |
| --- | --- |
| End user | Login, automatic wallet, chat, connections, permissions and history |
| Developer or merchant | MCP/API tools, structured offers, intents, policy, receipts and integration guides |

### Safe action lifecycle

~~~mermaid
flowchart LR
    D["Discover"] --> I["Freeze intent"]
    I --> R["Evaluate rules"]
    R --> A["Ask for approval"]
    A --> E["Execute once"]
    E --> V["Verify settlement"]
    V --> F["Verify fulfillment"]
    F --> X["Durable receipt"]
~~~

Payment and fulfillment are separate. A transaction hash proves network settlement; it does not prove that a hotel, task or physical product was delivered.

## MCP and WebMCP

Public sandbox endpoint:

~~~text
https://agente-asistente.vercel.app/api/mcp
~~~

Example client configuration:

~~~json
{
  "mcpServers": {
    "agent-assistant": {
      "url": "https://agente-asistente.vercel.app/api/mcp"
    }
  }
}
~~~

| Tool | Purpose | Mutates state |
| --- | --- | --- |
| search_offers | Discover structured offers | No |
| get_offer | Read an offer | No |
| create_intent | Freeze an action under an idempotency key | Yes |
| evaluate_policy | Apply expiry, network and demo spending rules | Yes |
| demo_authorize_intent | Record sandbox confirmation | Yes |
| execute_authorized_intent | Create or replay one sandbox receipt | Yes |
| get_receipt | Retrieve execution evidence | No |

Inbound MCP lets other agents use agent-assistant. Outbound connectors let agent-assistant use Notion, CoinMarketCap and Travala. These directions may use MCP, OAuth or a conventional API.

Chrome WebMCP registers search_agent_offers and prepare_commerce_intent. Wallet authorization and execution are intentionally excluded.

See [docs/mcp-integration.md](docs/mcp-integration.md) for the complete contract.

## Local development

### Requirements

- Node.js 22.13.0 or newer
- npm
- Neon Postgres for persistent state
- Privy credentials for authentication and Stellar wallets

### Install

~~~bash
git clone https://github.com/CaBsCrypto/agente-asistente.git
cd agente-asistente
npm install
copy .env.example .env.local
npm run db:migrate
npm run dev
~~~

Open http://localhost:3000. Commerce orchestration can use process memory without DATABASE_URL, but waitlist, user history and connections require Neon.

### Environment variables

| Variable | Required for | Exposure |
| --- | --- | --- |
| DATABASE_URL | Neon persistence | Server only |
| NEXT_PUBLIC_PRIVY_APP_ID | Privy browser client | Public identifier |
| NEXT_PUBLIC_PRIVY_CLIENT_ID | Optional domain-specific Privy client | Public identifier |
| PRIVY_APP_ID | Server-side Privy operations | Server only |
| PRIVY_APP_SECRET | Token verification and wallet API | Secret, server only |
| CONNECTOR_ENCRYPTION_KEY | OAuth token encryption | Secret, server only |
| ADMIN_USERNAME | Founder admin login | Server only |
| ADMIN_PASSWORD_HASH | Founder admin login | Secret, server only |
| ADMIN_SESSION_SECRET | Signed admin session | Secret, server only |
| ADMIN_EMAILS | Optional founder allowlist | Server only |

Never commit .env.local, credentials, OAuth tokens, admin secrets or wallet keys.

### Validate

~~~bash
npm test
npm run lint
npm run build
~~~

Database commands:

~~~bash
npm run db:generate
npm run db:migrate
~~~

## Main routes

| Route | Purpose |
| --- | --- |
| / | Product landing |
| /login | Privy login entry point |
| /agent | Authenticated chat, wallet and connections |
| /demo | Intent, authorization and replay-safety proof |
| /connections | Integration research and priority tracker |
| /developers | Public developer entry point |
| /waitlist | Early-access capture |
| /admin | Protected founder dashboard |
| /admin/stellar | Founder Stellar test lab |
| /api/mcp | Public sandbox MCP server |
| /api/commerce | Commerce orchestration API |
| /api/health | Runtime and persistence status |
| /.well-known/mcp | MCP discovery metadata |

## Immediate roadmap

1. Complete the real-user Notion OAuth and search acceptance test.
2. Build one explicitly approved, Privy-signed Stellar Testnet payment.
3. Persist its transaction hash and make retries return the same receipt.
4. Connect that proof to one controlled partner or DeFindex test flow.
5. Collect three design-partner commitments.
6. Move CoinMarketCap toward an official API, MCP or x402 pilot.

For YC, the strongest claim is: **a user can create a permissioned agent, receive a real Testnet wallet, connect real data sources and see the safety mechanism that will prevent duplicate payments; the next proof is one reproducible wallet-signed payment.**

## Security principles

- **Non-custodial:** the orchestration layer never needs the private key.
- **Least privilege:** each connection receives only the required scopes.
- **Explicit authority:** identity, connection consent and payment approval are separate.
- **Frozen intent:** merchant, amount, network and expiry are fixed before approval.
- **Replay safety:** duplicate execution returns the previous result.
- **Encrypted credentials:** external OAuth tokens are encrypted at rest.
- **Independent evidence:** settlement and fulfillment are verified separately.
- **Honest status:** research, sandbox behavior and production integrations are not conflated.

## Documentation

Start at the [documentation index](docs/README.md).

- [Architecture and flows](docs/architecture.md)
- [Developer guide](docs/developer-guide.md)
- [Product status](docs/product-status.md)
- [90-second demo](docs/live-demo.md)
- [MCP integration](docs/mcp-integration.md)
- [Privy and Stellar Testnet](docs/privy-stellar-testnet.md)
- [CoinMarketCap partner pilot](docs/coinmarketcap-partner-pilot.md)
- [Admin operations](docs/admin-operations.md)
- [Waitlist operations](docs/waitlist-operations.md)
- [New integration agent prompt](docs/NEW_PRODUCT_INTEGRATION_AGENT_PROMPT.md)

## Project

agent-assistant is an early-stage, solo-founder project built in Latin America for a global agent economy. The first wedge is a trusted personal agent with real connections and a user-owned Stellar wallet. The long-term infrastructure helps businesses become discoverable, actionable and payable by agents.

Join the [waitlist](https://agente-asistente.vercel.app/waitlist) or propose a pilot through the [Integration Lab](https://agente-asistente.vercel.app/connections).
