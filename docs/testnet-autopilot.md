# Testnet Autopilot

Testnet Autopilot is a time-bound, user-activated authority envelope for the
Personal Execution Vault. It is not an unlimited wallet permission.

## Default envelope

| Control | Default |
| --- | --- |
| Network | Stellar Testnet only |
| XLM per action | 5 XLM |
| USDC per action | 0.05 USDC |
| Daily allowed decisions | 10 |
| Duration | 24 hours |
| Providers | DeFindex, Stellar x402, Travala, CoinGecko |
| Mainnet | Always blocked |
| Revocation | Immediate pause |

The user can select a duration of 1, 8 or 24 hours. Activation requires an
explicit risk acknowledgement. The policy, timestamps and limits are persisted
in Neon and evaluated before a sensitive action is prepared.

## Risk levels

### Green: automatic now

- price and balance lookup;
- Travala search;
- receipt retrieval;
- duplicate-payment verification.

These operations are read-only and require no wallet signature.

### Amber: controlled Testnet operations

- Friendbot and internal Testnet funding;
- trustline preparation;
- exact intent preparation;
- policy and allowlist evaluation.

These operations can change Testnet setup or prepare an irreversible action.
They are recorded and constrained before execution.

### Red: signer-gated execution

- DeFindex vault deposits;
- x402 settlement;
- any action that signs and submits an on-chain transaction.

The current user-owned Stellar wallet still asks Privy for a transaction-scoped
signature. Activating the local Autopilot policy does not bypass that control.

## Privy delegated signer milestone

Privy supports user-owned wallets with server access, additional signers,
Stellar policies and raw signing. Full unattended Stellar execution requires:

1. Create a server authorization key or key quorum in Privy.
2. Create a Stellar policy for the exact Testnet actions and limits.
3. Ask the wallet owner to add the restricted signer.
4. Store the authorization private key only in a server-side secret manager.
5. Use Privy raw signing for the exact Stellar transaction hash.
6. Verify the Ed25519 signature locally before submitting to Stellar.
7. Run duplicate, expiry, allowlist, limit and revocation acceptance tests.
8. Only then mark delegatedSignerReady and executionMode=delegated.

Official references:

- https://docs.privy.io/wallets/using-wallets/signers
- https://docs.privy.io/controls/common-use-cases/delegation
- https://docs.privy.io/security/wallet-infrastructure/policy-and-controls
- https://docs.privy.io/recipes/use-tier-2

## Security invariants

- Mainnet cannot be enabled through this control.
- An expired or paused policy cannot delegate approval.
- Actions outside the allowlist are blocked before signing.
- Per-action and daily limits are evaluated server-side.
- A separate always-require-approval user rule overrides Autopilot.
- Existing x402 and DeFindex idempotency protections remain mandatory.
- Login alone never activates Autopilot.

## OpenZeppelin Channels submission layer

OpenZeppelin Channels is now the preferred Testnet fee-sponsorship and
submission layer. It does not replace the Privy delegated-signer milestone.

The safe order is:

1. Build the exact transaction and evaluate policy.
2. Obtain the transaction-scoped user or delegated Privy signature.
3. Verify the signature against the expected user wallet.
4. Send only the signed XDR to OpenZeppelin Channels.
5. Persist the returned hash and reuse it on an idempotent retry.

The managed endpoint is pinned to Stellar Testnet and its server key is never
returned by the readiness API. Mainnet remains unavailable. See
[OpenZeppelin Stellar Channels](openzeppelin-stellar-channels.md).
