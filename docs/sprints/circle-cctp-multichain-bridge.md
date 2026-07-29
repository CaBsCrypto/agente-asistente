# Circle CCTP V2 multichain bridge

Status: local Testnet planning and readiness on
`feat/multichain-wallet-foundation`. Execution is intentionally disabled.

## Decision

Carmelita will use Circle CCTP V2 as the first bridge layer for native USDC
between the wallet families already planned in the product:

| Network | CCTP domain | First rollout |
| --- | ---: | --- |
| Avalanche Fuji | 1 | Source |
| Stellar Testnet | 27 | Destination |
| Base Sepolia | 6 | Later |
| Solana Devnet | 5 | Later |

The first proof is **Avalanche Fuji → Stellar Testnet**. It reuses the
authenticated user's Privy EVM wallet and Privy Stellar wallet. Carmelita
never receives or pools the user's USDC.

## What works now

From the authenticated chat:

```text
Revisa si puedo usar el bridge CCTP
Puentea 1 USDC desde Avalanche Fuji a Stellar Testnet
```

The first command verifies both wallet records, Fuji AVAX, Fuji Testnet USDC,
Stellar XLM and the official Circle Testnet USDC trustline. The second creates
an immutable plan and queries the current Circle Sandbox fee.

The authenticated API offers the same non-mutating surface:

```http
POST /api/agent/bridge/cctp
Authorization: Bearer <Privy access token>
Content-Type: application/json

{ "action": "readiness" }
{ "action": "fees" }
{ "action": "plan", "amount": "1", "source": "avalanche:fuji", "destination": "stellar:testnet" }
```

Every response states that no transaction was prepared and no funds moved.

## Safety invariant for Stellar

Inbound CCTP transfers to Stellar must use Circle's `CctpForwarder`. Both
`mintRecipient` and `destinationCaller` in the Fuji burn must be the encoded
forwarder contract:

```text
CA66Q2WFBND6V4UEB7RD4SAXSVIWMD6RA4X3U32ELVFGXV5PJK4T4VSZ
```

The user's final `G...`, `M...` or `C...` recipient is encoded only in hook
data. A wrong recipient/caller configuration can permanently strand funds.
The plan builder therefore produces both fields from the same pinned contract
constant and tests their equality.

Stellar uses seven decimal places for account balances, while CCTP messages
always represent USDC with six decimals. Carmelita accepts at most six decimal
places for a bridge amount.

## Future execution state machine

```text
draft
  -> source_review
  -> source_approved
  -> approve_submitted
  -> burn_submitted
  -> attesting
  -> destination_review
  -> destination_approved
  -> mint_submitted
  -> completed
```

Ambiguous source or destination results move to `reconciliation_required`.
They are never retried automatically.

## Approvals

The first executable version requires explicit, transaction-specific Privy
approval for every on-chain write:

1. EVM USDC allowance approval on Avalanche Fuji, unless an adequate exact
   allowance already exists.
2. EVM CCTP burn with hook on Avalanche Fuji.
3. Soroban `mint_and_forward` on Stellar Testnet.

The normal first run therefore needs three confirmations; later runs may need
two when the source allowance is already sufficient.

A relayer may later submit the public mint call, but it must not weaken source
authorization, alter the final recipient or introduce Carmelita custody.

## Acceptance criteria for the real proof

- Both wallets belong to the same authenticated Privy user.
- Fuji wallet has AVAX and at least the requested amount of official Testnet
  USDC.
- Stellar wallet has XLM and the official Circle Testnet USDC trustline.
- Source transaction uses CCTP domain `1` and destination domain `27`.
- `mintRecipient` and `destinationCaller` equal the pinned Stellar
  `CctpForwarder`.
- Circle attestation is bound to the observed burn transaction.
- The destination balance increase equals the burn amount minus the quoted
  protocol fee.
- Both transaction hashes and final balance evidence are persisted.
- Duplicate execution and ambiguous-result retries are rejected.

## Sources

- [Supported chains and domains](https://developers.circle.com/cctp/concepts/supported-chains-and-domains)
- [CCTP on Stellar](https://developers.circle.com/cctp/references/stellar)
- [Stellar CCTP contracts](https://developers.circle.com/cctp/references/stellar-contracts)
- [Transfer USDC to Stellar](https://developers.circle.com/cctp/quickstarts/transfer-usdc-stellar-arc)
