# CoinMarketCap x Carmelita pilot

## What exists today

Carmelita is a permissioned personal agent with:

- Privy authentication.
- A user-owned Stellar Testnet wallet.
- Persistent conversation and user state.
- A public MCP server.
- Secure external OAuth connections.
- Live market quotes (CoinGecko is the current primary source; CoinMarketCap is the automatic fallback).
- Persistent per-user watchlists over that market-data layer.
- Explicit authorization boundaries for sensitive actions.

Current demo prompts:

- What is the current XLM price on CoinMarketCap?
- Add XLM to my CoinMarketCap watchlist
- Show my crypto watchlist

Market data today defaults to CoinGecko (keyless) with CoinMarketCap as an automatic fallback; both are read-only, do not trade or custody funds, and trial data is never represented as production-grade access. This pilot proposes making an official CoinMarketCap plan the primary, production-grade source.

## Proposed partner pilot

### Phase 1: official market-data connection

- Move from Trial Pro to a partner API key or CMC MCP.
- Discover assets by stable CMC IDs.
- Provide live quotes, market reports and token research.
- Add server-side caching and transparent timestamps.
- Measure searches, watchlist additions and repeated usage.

### Phase 2: agent-native paid data

- Connect the CMC x402 endpoint.
- Present the $0.01 USDC price before execution.
- Apply a user spending policy.
- Request explicit authorization.
- Pay only for successful delivery.
- Store an idempotent receipt and data-delivery proof.

This would demonstrate an end-to-end agent purchase of verified market data.

## What we would request from CoinMarketCap

1. A development or partner API key.
2. Guidance on the preferred MCP integration path.
3. A technical contact for x402 testing.
4. Confirmation of trial and production rate limits.
5. Permission to present the integration in a YC demo.
6. Feedback on joining a CMC hackathon or agent program.

## Outreach message

Hi [Name] — I am building Carmelita, a permissioned AI agent that connects to apps, has a user-owned wallet and can execute auditable actions and payments.

We have already integrated CoinMarketCap's official Trial Pro API into the live product. Users can ask for an XLM/BTC/ETH quote in chat, add assets to a persistent watchlist and see timestamped CMC market data.

I would like to explore a small official pilot with CoinMarketCap:

1. Move the prototype to the CMC MCP or a partner API key.
2. Use CMC x402 as our first agent-native paid-data flow.
3. Demonstrate spending policy, explicit authorization, successful delivery and a durable receipt.

We are preparing a Y Combinator application and would love to show this honestly as a working pilot, not as a partnership unless we agree on one.

Could we schedule a short technical conversation about the best integration path?