# Avalanche ecosystem discovery and Dexalot Testnet

Status: local implementation on `feat/multichain-wallet-foundation`. Testnet only.

## What is real

- Carmelita can search official Avalanche documentation through the hosted
  Builder Hub MCP (`docs_search` only).
- Carmelita can list the currently deployed Dexalot Testnet markets.
- Carmelita can request a non-firm Simple Quote for a supported Testnet pair.
- These operations are read-only, authenticated with the user's Privy session,
  same-origin and never request a wallet signature.

Official sources:

- [Avalanche hosted MCP](https://build.avax.network/docs/tooling/ai-llm/mcp-server)
- [Dexalot REST API](https://docs.dexalot.com/en/apiv2/RestApi.html)
- [Dexalot Simple Swap](https://docs.dexalot.com/en/apiv2/SimpleSwap.html)

## Chat acceptance

```text
Busca protocolos de lending en Avalanche
Lista los pares disponibles en Dexalot Testnet
Cotiza 1 AVAX a USDC en Dexalot
```

The first command uses the official Avalanche MCP. The second reads
`GET /privapi/trading/pairs`. The third validates the pair against that live
catalog and reads `GET /api/rfq/pairprice`.

## Safety boundary

Live evidence captured on 2026-07-29:

- The public Testnet catalog returned 14 deployed pairs, including
  `AVAX/USDC`, from the documented endpoint.
- The public Simple Quote endpoint returned one successful non-firm quote for
  `1 AVAX -> 8.93 USDC`.
- Later explicit requests returned HTTP `400 {"success":false}` for the same
  input. Carmelita therefore treats the quote provider as transient and
  fail-closed: it shows no price, performs no automatic retry and prepares no
  transaction.

A Testnet market listing is presently validated live. A quote is implemented
and schema-validated, but it must not be described as reliably available until
the provider is stable or Dexalot supplies a channel/API key. The key, if
obtained, must remain server-side.

The returned Dexalot price is explicitly non-firm. It does not reserve
liquidity and it is not a transaction simulation.

No order, approval, firm quote, deposit, withdrawal, bridge or trade is enabled.
Dexalot documents that execution happens through smart contracts and the
user's wallet. Before enabling execution Carmelita must add:

1. exact token and contract allowlists;
2. balance, allowance and gas checks;
3. calldata simulation on the correct Testnet chain;
4. minimum received, slippage and expiry policies;
5. transaction-specific Privy confirmation;
6. receipt verification and replay protection.

The existing Avalanche x402 gasless path cannot sponsor an arbitrary DEX
contract call. The first trading execution proof must use Testnet AVAX for gas
or a separately audited smart-account/paymaster path.

