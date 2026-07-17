# Acceptance testing

The acceptance runner gives the project one repeatable way to check local quality, deployed contracts, Stellar Testnet readiness and, when explicitly authorized, the complete Privy x402 flow.

## Commands

| Command | External effects | Purpose |
| --- | --- | --- |
| `npm run qa:local` | None beyond local build files | Lint, automated tests and production build |
| `npm run acceptance:doctor` | Read-only HTTP and Horizon requests | Production health, MCP discovery, official x402 challenge and distributor balances |
| `npm run acceptance:travala` | Read-only remote MCP request | Reproducible future hotel search and normalized inventory |
| `npm run acceptance:authenticated` | May create/persist the dedicated Privy test user and wallet | Verifies Privy identity, bootstrap and wallet binding without signing or paying |
| `npm run acceptance:second-user:start` | Friendbot Testnet funding | Fresh identity, distinct wallet and XLM activation |
| `npm run acceptance:second-user:fund-usdc` | Sends 0.50 Testnet USDC | Continues after the human trustline signature |
| `npm run acceptance:second-user:verify` | Read-only API and Horizon checks | Verifies one 0.01 payment, final balance, resource and receipt |
| `npm run x402:replay:confirmed` | Read-only replay of an existing Testnet payment | Same payment ID, same receipt and zero second debit |
| `npm run x402:replay:execute` | One real `0.01 USDC` Testnet payment | First execution plus exact-body replay with balance assertions |
| `npm run qa` | Local QA plus production doctor | Final post-deploy gate |

Add `-- --json` to an acceptance command for a machine-readable report.

## Safe default: doctor

~~~powershell
npm run acceptance:doctor
~~~

This mode never signs a transaction, requests Friendbot funding, claims faucet USDC or changes database state. It verifies:

1. Testnet-only constants and payment limits.
2. Production `/api/health` semantics.
3. The deployed `/agent` route.
4. MCP discovery and its payment boundary.
5. The live HTTP 402 challenge from the official Stellar demo.
6. The pinned distributor account, exact Circle Testnet USDC trustline and minimum XLM/USDC balances.

Any failed check exits with code `1`.

## Authenticated mode

Interactive Privy login cannot be safely automated by pretending that an email OTP is a permanent credential. The runner therefore accepts only a temporary access token for a dedicated test identity.

~~~powershell
$env:AGENT_ACCEPTANCE_PRIVY_TOKEN = Read-Host "Temporary Privy test token"
npm run acceptance:authenticated
Remove-Item Env:AGENT_ACCEPTANCE_PRIVY_TOKEN
~~~

Never commit the token, place it in `.env.example`, paste it into an issue or reuse a personal production session. A future CI setup should refresh a dedicated test identity through an approved Privy test-auth flow or secret manager.

## Confirmed-payment replay audit

The safest live check starts from the most recent confirmed x402 payment. It sends
the same `paymentId` back through the authenticated endpoint, compares the wallet
balance before and after, requires `replayed: true`, and verifies the original
transaction hash against Horizon Testnet.

~~~powershell
$env:AGENT_ACCEPTANCE_PRIVY_TOKEN = Read-Host "Temporary Privy access token"
npm run x402:replay:confirmed
Remove-Item Env:AGENT_ACCEPTANCE_PRIVY_TOKEN
~~~

Set `AGENT_ACCEPTANCE_X402_PAYMENT_ID` and
`AGENT_ACCEPTANCE_X402_TRANSACTION_HASH` to audit a specific older receipt. This
mode does not sign or settle a transaction. It will fail if the replay changes
the balance, hash, payment ID, network or confirmed state.

## First execution plus exact replay

The strict mutation proof starts with a prepared payment and its one-time Privy
signature. The same serialized request body is submitted twice. The runner
requires:

1. The first response is not a replay.
2. The first debit is exactly `0.0100000 USDC`.
3. The protected resource is delivered.
4. The second response has `replayed: true`.
5. The second response carries the original transaction hash.
6. The balance does not change after the replay.
7. Horizon Testnet reports the original transaction as successful.

~~~powershell
$env:AGENT_ACCEPTANCE_PRIVY_TOKEN = Read-Host "Temporary Privy access token"
$env:AGENT_ACCEPTANCE_X402_PAYMENT_ID = "<prepared payment UUID>"
$env:AGENT_ACCEPTANCE_X402_SIGNATURE = Read-Host "One-time 0x Privy signature"
$env:ACCEPT_TESTNET_MUTATIONS = "I_UNDERSTAND_TESTNET_ONLY"
npm run x402:replay:execute
Remove-Item Env:AGENT_ACCEPTANCE_PRIVY_TOKEN
Remove-Item Env:AGENT_ACCEPTANCE_X402_PAYMENT_ID
Remove-Item Env:AGENT_ACCEPTANCE_X402_SIGNATURE
Remove-Item Env:ACCEPT_TESTNET_MUTATIONS
~~~

The prepared payment and signature should come from a dedicated acceptance
fixture or browser test client. A normal user never copies a signature. The
runner never prints the token or signature. Its target is allowlisted to the
production application, `localhost` or `127.0.0.1`, and it refuses to run unless
`/api/health` reports `stellar-testnet` with Mainnet disabled.

## Duplicate and reconciliation policy

Only a payment in `prepared` state may atomically transition to `signing`. Concurrent requests cannot both claim that transition.

- `confirmed` returns the original receipt.
- `signing` or `reconciliation_required` never retries automatically.
- `failed` requires a new review.
- An ambiguous result after signing is stored as `reconciliation_required` for manual on-chain review.

This favors avoiding a duplicate charge over automatic recovery.

## Recommended release sequence

~~~text
npm run qa:local
git push
wait for Vercel Ready
npm run acceptance:doctor
npm run x402:replay:confirmed
manual Privy payment or x402:replay:execute
save explorer receipt and JSON report
~~~

Passing doctor proves readiness, not payment completion. A payment is proven only by a confirmed explorer transaction, delivered resource and duplicate replay with the same hash.

## Live Travala acceptance

```powershell
npm run acceptance:travala
```

This read-only check generates a two-night stay beginning 45 days from execution and searches `Santiago, Chile` through the public Travala Travel MCP. It requires a real MCP session and at least one normalized hotel result. Override only the location with `TRAVALA_ACCEPTANCE_LOCATION` when necessary.

Success proves live search, not booking, payment or reserved inventory. Stable failures distinguish invalid dates, upstream unavailability, rate limiting and timeout; the connector never invents results.

## Fresh second-user acceptance

Use an unused email. Email/Google login, OTP and both Privy signatures remain intentional human boundaries. The runner automates the rest and rejects a wallet that was previously activated, funded or used for x402.

After login, set a temporary access token for the dedicated test identity and the existing primary wallet address:

```powershell
$env:AGENT_ACCEPTANCE_PRIVY_TOKEN = Read-Host "Temporary second-user Privy token"
$env:AGENT_ACCEPTANCE_PRIMARY_WALLET = "G...PRIMARY"
$env:ACCEPT_TESTNET_MUTATIONS = "I_UNDERSTAND_TESTNET_ONLY"
npm run acceptance:second-user:start
```

The start stage proves the wallet differs from the primary account, records an empty baseline, requests Friendbot through the chat and verifies the transition to an active account with Testnet XLM.

Return to the same browser session, prepare x402 and approve the USDC trustline with Privy. Then run:

```powershell
npm run acceptance:second-user:fund-usdc
```

That stage verifies the trustline and sends exactly `0.50 USDC` from the internal Testnet distributor. In the browser, review and approve exactly one `0.01 USDC` x402 purchase. Finally run:

```powershell
npm run acceptance:second-user:verify
```

Verification requires the same wallet, the Friendbot transition, active trustline, faucet receipt, exactly one new payment, a `0.49 USDC` final balance, delivered resource and a successful Horizon Testnet transaction. State is stored in ignored `outputs/second-user-acceptance.json`.

Remove secrets from the shell when finished:

```powershell
Remove-Item Env:AGENT_ACCEPTANCE_PRIVY_TOKEN
Remove-Item Env:AGENT_ACCEPTANCE_PRIMARY_WALLET
Remove-Item Env:ACCEPT_TESTNET_MUTATIONS
```

Never place the token in source control, screenshots, recordings or issue trackers.
