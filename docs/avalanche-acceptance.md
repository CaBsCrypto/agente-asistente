# Avalanche acceptance gates

Carmelita separates **implemented code** from **verified transactions**. A feature can be merged while disabled or approval-gated, but it is not described as live until reproducible on-chain evidence exists.

## Status vocabulary

- `planned`: designed, but not callable.
- `ready_to_test`: implemented and covered by automated tests; a real testnet receipt is still missing.
- `live`: a real testnet transaction has been verified and its evidence is recorded.
- Mainnet remains disabled until a separate security and operational review.

Current truth:

- Avalanche x402 purchase: `live` on Fuji.
- Pangolin AVAX → Circle USDC swap: `ready_to_test`.
- Circle CCTP Fuji → Stellar bridge: `ready_to_test`.

## Safe acceptance runner

The runner has no execution mode. It never receives private keys, signs payloads, or calls `eth_sendTransaction`.

```bash
npm run acceptance:avalanche:doctor
```

This performs live, read-only checks against Fuji, Pangolin, Circle and the x402 facilitator. It also validates the public capability registry.

For user-specific checks, authenticate locally with a short-lived Privy access token:

```powershell
$env:AGENT_ACCEPTANCE_BASE_URL="http://localhost:3001"
$env:AGENT_ACCEPTANCE_PRIVY_TOKEN="<temporary Privy access token>"
npm run acceptance:avalanche:authenticated
```

To create a frozen Pangolin preview without broadcasting:

```powershell
$env:ACCEPT_AVALANCHE_PREPARATION="I_UNDERSTAND_NO_FUNDS_MOVE"
npm run acceptance:avalanche:prepare
```

Set `AVALANCHE_ACCEPTANCE_OUTPUT` to save a JSON report. Do not commit tokens or generated user reports.

## Promotion gates

### Pangolin swap

Promote to `live` only after preserving:

1. the Privy wallet, request ID and frozen preview;
2. one real 0.1 AVAX Fuji transaction hash;
3. verified router, sender, calldata, value and successful receipt;
4. AVAX/USDC balances before and after;
5. a duplicate record attempt rejected or returned idempotently.

### CCTP Fuji → Stellar

Promote to `live` only after preserving:

1. domains Avalanche 1 → Stellar 27 and official Circle contracts;
2. source and destination balances before execution;
3. separate, scoped Privy confirmations;
4. Fuji burn transaction and message hash;
5. Circle attestation bound to that message;
6. Stellar mint/forward transaction and destination balance;
7. idempotent replay behavior and ambiguous-state quarantine.

## Merge policy

Automated tests, read-only discovery, previews and approval-gated implementations may merge while marked `ready_to_test`. Status promotion must be a separate evidence commit. Unrelated scratch work, including the unfinished Aave connector in the main worktree, must not be included.
