# Avalanche Fuji pre-reboot security checkpoint

Branch: `feat/multichain-wallet-foundation`
Scope: Fuji C-Chain only (`43113`)
Production status: not pushed, not deployed, no funds moved.

## Objective

Close confirmed transaction-binding and retry gaps before the next localhost
session, and define a disabled-by-default distributor contract that can be
configured after reboot without adding custody to Carmelita.

## Workstreams

| ID | Owner | Result | Status |
| --- | --- | --- | --- |
| SEC-01 | Security review | Audit Privy/browser compatibility and transaction binding | Complete |
| SEC-02 | Security review | Eliminate concurrent preview race | Complete |
| SEC-03 | Security review | Persist one normalized hash before RPC lookup | Complete |
| SEC-04 | Security review | Bind chain/from/to/value/nonce/gas/gasPrice/hash | Complete |
| SEC-05 | Security review | Make reverted receipts terminal and reload retry safe | Complete |
| DIST-01 | Distributor | Define fixed `0.005 AVAX` external service contract | Complete |
| DIST-02 | Distributor | Add fail-closed authenticated route and RPC verification | Complete |
| DIST-03 | Distributor | Extend read-only doctor and post-reboot runbook | Complete |
| QA-01 | Scrum Master | Run focused suites and diff checks | Complete |

## Confirmed findings

1. Concurrent prepares could return parameters that lost the database conflict.
   The client might then broadcast those unpersisted parameters before the
   record endpoint rejected them.
2. The browser stored a broadcast hash only in React state before the first RPC
   lookup. A propagation delay plus reload could lose the only retry handle.
3. Receipt status `0x0` was incorrectly treated as pending.
4. Receipt evidence did not bind nonce, gas limit, gas price or transaction
   chain ID to the frozen preview.
5. Wallet selection needed to require the Privy embedded wallet and verify the
   provider remained on `43113`.
6. An expired preview needed to be rejected before broadcast, not afterward.
7. Reloading a persisted `submitted` preview needed to hydrate the same hash and
   show verification-only UI.

The apparent mojibake in PowerShell output was a console-rendering artifact.
UTF-8 byte-level inspection found the correct middle dot, em dash and
Spanish/Portuguese accents, so no encoding rewrite was made.

## Safety invariants

- Only the database winner of a unique preview ID can reach the browser.
- A preview can transition atomically from `prepared` to `submitted` once.
- The first valid hash is normalized and durable before external RPC evidence.
- A different hash for the same preview is always rejected.
- `submitted` can only re-query the same hash; it cannot call broadcast again.
- `confirmed` and `failed` are terminal and replay-safe.
- The exact chain, sender, recipient, value, nonce, gas and gas price must match.
- Privy gas sponsorship remains disabled for Avalanche.
- No Mainnet network, endpoint or asset is accepted.

## Distributor boundary

Carmelita does not sign distributor transfers. The optional route delegates to
a separately operated, Fuji-only distributor service and is disabled unless all
server environment controls pass validation.

Required after reboot, but not configured or activated in this checkpoint:

```text
FUJI_DISTRIBUTOR_ENABLED=false
FUJI_DISTRIBUTOR_URL=https://<approved-host>/v1/fuji/drip
FUJI_DISTRIBUTOR_SECRET=<minimum-32-character-secret>
FUJI_DISTRIBUTOR_DAILY_LIMIT=100
FUJI_DISTRIBUTOR_TIMEOUT_MS=5000
```

The external service must enforce the stable idempotency key, once-per-user
claim and global daily cap. Carmelita independently verifies the returned Fuji
transaction against chain `43113`, recipient, `0.005 AVAX` and successful
receipt before displaying success.

## Post-reboot order

1. Complete a clean local dependency installation.
2. Run `npm run runtime:doctor`; distributor should report disabled.
3. Run focused Avalanche tests, lint and build.
4. Start localhost on port `3001`.
5. Test activation and manual faucet with user A.
6. Activate user B and copy its EVM address.
7. Prepare and approve `0.001 AVAX` from A to B.
8. Verify the same hash after reload and verify duplicate protection.
9. Only after the manual flow passes, provision the separate distributor
   service and secrets; keep `FUJI_DISTRIBUTOR_ENABLED=false` until its own
   contract tests and funded-wallet controls pass.

## Evidence required to close

- [x] Focused security and distributor suites pass.
- [x] Existing Avalanche chat/Fuji/isolation suites pass.
- [x] `git diff --check` passes.
- [x] Runtime doctor proves Fuji `43113`.
- [ ] Localhost acceptance produces one real Fuji hash.
- [ ] Reload returns the same hash without a second broadcast.
- No changes exist in `main`, no push/deployment occurred and no real funds were
  used.
## Pre-reboot verification

- 29/29 focused pure/static tests passed across security, chat, distributor,
  Fuji RPC, wallet center and Stellar/EVM isolation.
- Runtime doctor: 6 passed, 4 warnings and 1 environmental failure.
- The environmental failure is the incomplete local dependency tree
  (`next` and `@privy-io/react-auth` are absent from this worktree).
- Distributor remains disabled and made no external request.
- Fuji RPC returned chain ID `43113`.
- No browser flow, deployment, push or transfer was executed.
