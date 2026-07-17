+# Acceptance testing
+
+The acceptance runner gives the project one repeatable way to check local quality, deployed contracts, Stellar Testnet readiness and, when explicitly authorized, the complete Privy x402 flow.
+
+## Commands
+
+| Command | External effects | Purpose |
+| --- | --- | --- |
+| `npm run qa:local` | None beyond local build files | Lint, 53 automated tests and production build |
+| `npm run acceptance:doctor` | Read-only HTTP and Horizon requests | Production health, MCP discovery, official x402 challenge and distributor balances |
+| `npm run acceptance:authenticated` | May create/persist the dedicated Privy test user and wallet | Verifies Privy identity, bootstrap and wallet binding without signing or paying |
+| `npm run acceptance:execute` | Testnet transactions and a real `0.01 USDC` x402 payment | Trustline, internal faucet, payment, delivery and duplicate replay |
+| `npm run qa` | Local QA plus production doctor | Final post-deploy gate |
+
+Add `-- --json` to an acceptance command for a machine-readable report.
+
+## Safe default: doctor
+
+~~~powershell
+npm run acceptance:doctor
+~~~
+
+This mode never signs a transaction, requests Friendbot funding, claims faucet USDC or changes database state. It verifies:
+
+1. Testnet-only constants and payment limits.
+2. Production `/api/health` semantics.
+3. The deployed `/agent` route.
+4. MCP discovery and its payment boundary.
+5. The live HTTP 402 challenge from the official Stellar demo.
+6. The pinned distributor account, exact Circle Testnet USDC trustline and minimum XLM/USDC balances.
+
+Any failed check exits with code `1`.
+
+## Authenticated mode
+
+Interactive Privy login cannot be safely automated by pretending that an email OTP is a permanent credential. The runner therefore accepts only a temporary access token for a dedicated test identity.
+
+~~~powershell
+$env:AGENT_ACCEPTANCE_PRIVY_TOKEN = Read-Host "Temporary Privy test token"
+npm run acceptance:authenticated
+Remove-Item Env:AGENT_ACCEPTANCE_PRIVY_TOKEN
+~~~
+
+Never commit the token, place it in `.env.example`, paste it into an issue or reuse a personal production session. A future CI setup should refresh a dedicated test identity through an approved Privy test-auth flow or secret manager.
+
+## Execute mode
+
+Execute mode performs real Testnet mutations. It is intentionally blocked unless both a Privy token and the exact acknowledgement flag are present.
+
+~~~powershell
+$env:AGENT_ACCEPTANCE_PRIVY_TOKEN = Read-Host "Temporary Privy test token"
+$env:ACCEPT_TESTNET_MUTATIONS = "I_UNDERSTAND_TESTNET_ONLY"
+npm run acceptance:execute
+Remove-Item Env:AGENT_ACCEPTANCE_PRIVY_TOKEN
+Remove-Item Env:ACCEPT_TESTNET_MUTATIONS
+~~~
+
+The runner then:
+
+1. Bootstraps the user-owned Privy Stellar wallet.
+2. Activates the account through Friendbot when required.
+3. Creates the official x402 USDC trustline.
+4. Claims `0.50 USDC` from the internal Testnet distributor when required.
+5. Reads and freezes the live HTTP 402 requirements.
+6. Pays exactly `0.01 USDC` through the Privy signer.
+7. Requires a settlement hash and delivered resource.
+8. Executes the same payment ID again and requires the original receipt with `replayed: true`.
+
+The execute target is allowlisted to the production application or localhost. Mainnet is never accepted.
+
+## Duplicate and reconciliation policy
+
+Only a payment in `prepared` state may atomically transition to `signing`. Concurrent requests cannot both claim that transition.
+
+- `confirmed` returns the original receipt.
+- `signing` or `reconciliation_required` never retries automatically.
+- `failed` requires a new review.
+- An ambiguous result after signing is stored as `reconciliation_required` for manual on-chain review.
+
+This favors avoiding a duplicate charge over automatic recovery.
+
+## Recommended release sequence
+
+~~~text
+npm run qa:local
+git push
+wait for Vercel Ready
+npm run acceptance:doctor
+manual Privy acceptance or acceptance:execute
+save explorer receipt and JSON report
+~~~
+
+Passing doctor proves readiness, not payment completion. A payment is proven only by a confirmed explorer transaction, delivered resource and duplicate replay with the same hash.
