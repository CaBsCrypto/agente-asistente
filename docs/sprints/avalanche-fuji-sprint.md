# Sprint: Avalanche Fuji end-to-end proof

Status: in progress  
Branch: `feat/multichain-wallet-foundation`  
Workspace: `D:\00 CODEX - OPENIA\agente-asistente-multichain`  
Environment: Avalanche Fuji C-Chain only (`chainId 43113`)  
Production constraint: no merge into `main`, deployment, Mainnet transaction, or real funds. The branch is pushed for backup only.

## Sprint goal

Prove locally that an authenticated Privy user can ask Carmelita to activate an
EVM wallet, inspect its Avalanche Fuji balance, receive safe Testnet funding,
review and explicitly approve a `0.001 AVAX` transfer to a second Privy test
user, and receive one verifiable transaction receipt even if the request is
repeated.

## Operating workflow

1. Scrum Master freezes scope, dependencies, acceptance criteria and evidence.
2. Runtime team repairs the isolated worktree and exposes a reproducible local
   start/health workflow.
3. Wallet team implements chat intents, activation, Testnet distributor,
   transaction preview, user-owned Privy signing, receipt and replay protection.
4. Teams report tests, failures, risks and exact reproduction commands.
5. Scrum Master integrates results and runs the automated acceptance matrix.
6. The founder and Scrum Master run the manual two-user proof on localhost.
7. Nothing is declared complete without automated evidence plus an on-chain Fuji
   receipt for the write path.

## Backlog and ownership

| ID | Work item | Owner | Depends on | Expected result | Status |
| --- | --- | --- | --- | --- | --- |
| AVAX-001 | Audit branch, network registry and isolation | Scrum Master | - | Fuji is `43113`; main is untouched | Done |
| AVAX-002 | Repair local dependency/runtime workflow | Runtime team | AVAX-001 | clean install and localhost boot instructions | Done 2026-07-31: Next 16.2.6 boots, `GET /` returns 200 |
| AVAX-003 | Add deterministic local health/acceptance checks | Runtime team | AVAX-002 | one command checks app and Fuji RPC readiness | Done |
| AVAX-004 | Parse multilingual Fuji activation/balance/funding/send intents | Wallet team | AVAX-001 | chat emits typed, testable intents | Done |
| AVAX-005 | Render approval cards inside Carmelita chat | Wallet team | AVAX-004 | activation/funding and transaction approvals are visible in-chat | Code complete; localhost acceptance pending |
| AVAX-006 | Implement Testnet distributor policy | Wallet team | AVAX-004 | optional `0.005 AVAX`, once per user, rate-limited and idempotent | Policy only; automatic route deferred |
| AVAX-007 | Build `0.001 AVAX` preview and Privy confirmation flow | Wallet team | AVAX-005 | frozen chain/from/to/value/gas/expiry before signing | Code complete; Privy acceptance pending |
| AVAX-008 | Persist receipt and reject/replay duplicates safely | Wallet team | AVAX-007 | same intent returns same receipt and never sends twice | Code complete; live replay pending |
| AVAX-009 | Automated integration and regression suite | Scrum Master | AVAX-003, AVAX-008 | focused tests, lint and build evidence | Done 2026-07-31: 267/269 tests pass, lint clean, production build succeeds |
| AVAX-010 | Two-user localhost acceptance | Founder + Scrum Master | AVAX-009 | real Fuji hash, explorer proof, duplicate replay proof | Partial 2026-07-31: one real Fuji hash verified on-chain via x402. Second user and duplicate-replay proof still pending |

## Definition of Done

### Runtime

- Node version satisfies `>=22.13.0`.
- Dependencies install without relying on a junction outside this worktree.
- `npm run dev` serves the isolated branch on a documented localhost port.
- Focused tests, lint and production build complete successfully.
- No environment secret is printed or committed.

### Wallet activation and read path

- User explicitly presses an in-chat activation button.
- Backend authenticates the Privy bearer token and same-origin request.
- The user owns one Privy EVM wallet with a valid `0x` address.
- Activation moves no funds and requires no transaction signature.
- Diagnostics verify Fuji `43113` and display AVAX balance, gas, nonce and explorer.
- Stellar, EVM and future Solana wallets remain visually and logically separate.

### Funding path

- Public faucet remains a manual fallback because it can require CAPTCHA.
- Automatic funding, if configured, uses a separate Fuji-only distributor.
- Distributor is disabled unless explicit Testnet environment flags and secrets
  are configured.
- Drip is exactly `0.005 AVAX`, once per authenticated user/wallet, with global
  and per-user limits and an idempotency key.
- The distributor never receives access to the user's private key.

### Transaction path

- First write is exactly `0.001 AVAX` between two user-owned Privy test wallets.
- Preview freezes chain ID, sender, recipient, amount, gas estimate, expiry and
  idempotency key.
- Sending always requires a transaction-specific Privy approval in the browser.
- Server cannot silently substitute recipient, amount or network.
- Receipt contains transaction hash, Fuji explorer URL and confirmation state.
- Repeating the same intent returns the stored receipt without broadcasting.
- `sponsor: true` is not used because Privy gas sponsorship does not list Avalanche.

## Acceptance scenarios and expected results

| Scenario | Action | Expected |
| --- | --- | --- |
| A1 | New Privy user asks to activate Fuji | In-chat approval appears; no wallet is created before click |
| A2 | User approves activation | A valid user-owned `0x` address appears; funds moved = false |
| A3 | Query diagnostics | Chain is `43113`; address and balance match RPC |
| A4 | User requests Test AVAX without distributor config | Safe manual faucet action appears; no fake success |
| A5 | User requests Test AVAX with funded distributor | One `0.005 AVAX` drip; receipt persisted |
| A6 | Repeat identical funding request | Same receipt or explicit already-funded response; no second transfer |
| A7 | Prepare `0.001 AVAX` send | Exact preview and red/high-risk approval appear |
| A8 | Cancel Privy approval | No transaction, no success receipt |
| A9 | Approve Privy transaction | Fuji confirms; explorer receipt displayed |
| A10 | Repeat same send intent | Same stored receipt; sender nonce does not increment again |
| A11 | Try Mainnet or wrong chain | Hard failure before signing |
| A12 | Use second email | Separate Privy identity and wallet; no cross-user data exposure |

## Evidence ledger

| Evidence | Required artifact | Current result |
| --- | --- | --- |
| Branch isolation | `git status --branch` | `feat/multichain-wallet-foundation`, ahead of `origin/main` |
| Network contract | registry/test output | Fuji RPC and `43113` present |
| Existing focused tests | test output | 2026-07-31: 269 tests, 267 pass, 0 fail, 2 skipped |
| Runtime | install, dev and health output | 2026-07-31: Next 16.2.6 ready in 23.6s, `GET /` returns 200, doctor 7 PASS / 0 FAIL |
| Static quality | lint output | 2026-07-31: `npm run lint` passes clean, exit 0, no findings |
| Build | production build output | 2026-07-31: `npm run build` succeeds, exit 0, full route table emitted |
| Activation | local screenshot/API response | 2026-07-31: authenticated session reached `/api/agent/wallets/avalanche` with 200 |
| Funding | Fuji hash or explicit manual-fallback proof | manual fallback: wallet `0x7A33b7…9d07` funded externally to 19.99 Fuji USDC. No internal distributor path for USDC exists |
| Transfer | Fuji hash and explorer receipt | x402 settlement `0x3c03d587…70ad`, block `57475367`, verified against the RPC. A plain AVAX transfer is still unexercised and cannot run: this wallet holds 0 AVAX |
| Replay | stored hash plus unchanged nonce/transaction count | on-chain half proven: EIP-3009 `AuthorizationUsed` burned nonce `0x503799fd…`, so that authorization can never execute again. The application-level replay path is still unexercised |
| Second user | two distinct Privy user/wallet records | pending |

## Risks, controls and blockers

| Risk/blocker | Control or resolution |
| --- | --- |
| Worktree `node_modules` is partial/corrupted | clean local install in this isolated worktree; document exact command |
| Public faucet CAPTCHA prevents automation | never bypass it; use manual fallback or funded Testnet distributor |
| Distributor wallet drains or is abused | Fuji-only flag, balance ceiling, per-user/global rate limits, one drip |
| Server-side custody accidentally introduced | user transaction signing remains transaction-specific in Privy browser UX |
| Duplicate request broadcasts twice | persisted idempotency key and receipt checked before any send |
| Wrong-chain transaction | chain ID `43113` asserted during preview, approval and receipt validation |
| UI text encoding corruption | treat mojibake visible in current files as a release blocker for touched UI |
| Insufficient Test AVAX | fund distributor manually or use public faucet during acceptance |
| Privy API/client mismatch | verify against installed `3.35.0` React and `0.26.0` Node APIs locally |

## Team feedback protocol

Each team reports:

1. Task IDs completed.
2. Files changed.
3. Commands executed and exact pass/fail counts.
4. Errors encountered, root cause and applied fix.
5. Remaining blockers and any decision required.
6. Evidence paths or transaction hashes.

Scrum Master updates this document after every material result. Failed checks are
not hidden; they move the relevant task back to in progress with a corrective
action.

## Manual localhost runbook (locked until AVAX-009 passes)

1. Start the isolated app on localhost.
2. Sign in with Privy test user A.
3. Ask: `Activa Avalanche Fuji`.
4. Approve activation and copy the `0x` wallet.
5. Ask: `Recarga mi wallet con AVAX Testnet`.
6. Use distributor or complete the public faucet fallback.
7. Sign out and sign in with Privy test user B; activate Fuji and copy address.
8. Return to user A and ask to send `0.001 AVAX` to user B.
9. Review every frozen field, approve with Privy, and wait for confirmation.
10. Open the Fuji explorer receipt.
11. Repeat the same request and verify that no second transaction is sent.

