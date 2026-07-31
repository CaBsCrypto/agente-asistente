# Avalanche connection intelligence

Branch: `feat/avalanche-connection-intelligence`

This layer lets Carmelita and authenticated MCP clients discover what Avalanche
capabilities exist and run a deterministic preflight before any wallet prompt.
It never signs, broadcasts or moves funds.

## Surfaces

- `POST /api/agent/avalanche/capabilities` with `list` or `plan`.
- Personal MCP tool `list_avalanche_capabilities`.
- Personal MCP tool `plan_avalanche_capability`.

Each capability declares its provider, status, network, operation class,
required balances or wallets, approval boundary, current evidence and next
acceptance step. The initial catalog covers the official Avalanche docs MCP,
Privy Fuji wallet actions, Dexalot reads, 0xGasless x402 and Circle CCTP V2.

## Security boundary

Planning is read-only. A plan may say that an action is executable, but it is
not an authorization. Financial actions still require a separately prepared,
transaction-scoped Privy approval. The registry contains no keys, signers or
broadcast function.

## Next extension

Add provider health evidence and timestamps without turning health checks into
auto-execution. Never fail over a signed x402 authorization to another
facilitator because the signature is bound to the frozen payment requirement.
