# Circle CCTP V2 multichain bridge

Status: local Testnet planning, readiness and confirmation flow implemented on
`feat/multichain-wallet-foundation`. The full bridge is not yet validated
onchain end to end.

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

Every response from this planning endpoint states that no transaction was
prepared and no funds moved.

## Confirmation flow implemented locally

The chat can now start a separate authenticated execution flow:

```http
POST /api/agent/bridge/cctp/execute
Authorization: Bearer <Privy access token>
Content-Type: application/json
```

It prepares one transaction at a time and requires a fresh user confirmation
through Privy before each signature:

1. Create the official Circle Testnet USDC trustline on Stellar when missing.
2. Approve exactly the requested USDC amount on Avalanche Fuji when needed.
3. Burn that amount through Circle CCTP V2 with the pinned Stellar forwarder.
4. Check Circle Sandbox attestation only when the user requests it.
5. Prepare and sign `mint_and_forward` on Stellar Testnet.

Submitted hashes are stored before receipt verification. A timeout or
ambiguous response remains resumable or moves to `reconciliation_required`;
the server does not silently broadcast a replacement.

Recovery is durable across page reloads:

- The EVM hash is written locally immediately after Privy broadcasts it and
  is reconciled with the server before any new signature can be requested.
- Submitted approve and burn hashes are verified again, never replaced.
- An expired EVM preview can be regenerated only when no hash was broadcast.
- The signed Stellar XDR and deterministic hash are stored before submission.
  A retry checks Stellar first and can only resubmit that exact payload.

Before any Stellar mint is prepared, Carmelita decodes the raw CCTP V2
message and binds it to the persisted plan: versions, domains, source
TokenMessenger, destination TokenMessenger, forwarder, finality, official
Fuji USDC, source wallet, amount, maximum fee and destination hook must all
match. Circle's onchain attestation verification remains the final authority.

The local UI exposes this as **Start bridge with confirmations** after the
readiness checks pass. Implementation and automated acceptance tests are
complete; a real Privy Fuji-to-Stellar run remains the final proof.

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

## Execution state machine

```text
draft
  -> approve_prepared
  -> approve_submitted
  -> approve_confirmed
  -> burn_prepared
  -> burn_submitted
  -> attesting
  -> mint_prepared
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

The normal first run needs three confirmations when the Stellar trustline
already exists. It needs four when the trustline must also be created. Later
runs may need only two when both the trustline and source allowance are
already sufficient.

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

The automated suite currently covers preparation, exact allowance, ABI
invariants, explicit confirmations, durable state, idempotency, bounded
attestation checks and hash persistence. The destination balance delta and a
complete pair of live transaction hashes must still be captured in the manual
onchain run.

## Sources

- [Supported chains and domains](https://developers.circle.com/cctp/concepts/supported-chains-and-domains)
- [CCTP on Stellar](https://developers.circle.com/cctp/references/stellar)
- [Stellar CCTP contracts](https://developers.circle.com/cctp/references/stellar-contracts)
- [Transfer USDC to Stellar](https://developers.circle.com/cctp/quickstarts/transfer-usdc-stellar-arc)
