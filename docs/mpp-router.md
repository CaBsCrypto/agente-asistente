# MPP Router

Status: **live catalog discovery, payment execution disabled**.

MPP Router aggregates paid agent APIs behind one Stellar USDC payment route.
Its public catalog can be inspected without a provider account or individual API
keys. The live catalog contains both free and paid endpoints; prices and payment
verification status vary by provider and can change.

## What is free

- Opening the catalog and documentation.
- Discovering available services through the public `llms.txt`.
- Calling an endpoint whose current live catalog price is explicitly `free`.
- Comparing candidates before an action is prepared.

## What may be paid

- Calling a metered provider endpoint through the router.
- The exact price is provider/endpoint-specific.
- The agent must read the live price; neither the provider's external free tier
  nor an old cached price is enough evidence.

MPP Router currently describes a Mainnet Stellar USDC flow. Because the product
is Testnet-first, agent-assistant exposes discovery only. It does not
automatically pay or silently cross from Testnet to Mainnet.

## Current implementation

- Catalog source: `https://apiserver.mpprouter.dev/v1/services/search?status=active&limit=20`.
- Live discovery: `GET /api/agent/infrastructure`.
- Network response is bounded to 500 KB, cached for one hour and times out after
  six seconds.
- A small labeled fallback catalog keeps the UI understandable during an outage.
- `executionEnabled` is hard-coded to `false`.

## First paid pilot gate

Before the first MPP payment:

1. Select one reversible, low-cost API.
2. Show provider, endpoint, exact maximum price, network and requested output.
3. Require explicit Mainnet opt-in separate from the current Testnet mode.
4. Enforce per-call and daily USDC limits.
5. Bind the payment to a request hash and idempotency key.
6. Store the response, settlement evidence and failure/refund state.
7. Repeat the same request and prove it cannot charge twice.

Official references:

- https://www.mpprouter.dev/
- https://apiserver.mpprouter.dev/llms.txt
- https://developers.stellar.org/docs/build/agentic-payments/mpp
