# YC closeout roadmap

Last updated: July 14, 2026

The objective is not to finish the entire vision. It is to submit a coherent company with one reliable product proof and a credible path to real commerce.

> **Status note (July 21):** This is a historical plan. For the current verified state, the [YC evidence ledger](yc-evidence-ledger.md) is the source of truth — the three headline technical proofs (UNBLCK booking, x402 payment, DeFindex XLM deposit) are now **Live**. What remains is real-user acceptance breadth, partner commitments and the recording.

## Build freeze boundary

Until the application and recording are complete:

- Do not add another blockchain.
- Do not build production escrow.
- Do not deploy a proprietary smart contract.
- Do not add a second wallet provider.
- Do not claim mainnet, merchant fulfillment, or a signed/paying partner customer. UNBLCK is a live technical integration (real bookings), not a signed commercial deal.
- Fix only reliability, clarity, security or recording blockers.

## Phase 1 — Safe preparation without wallet actions

Completed or available now:

- Trilingual EN/ES/PT landing and developer portal.
- Privy login and automatic Stellar wallet.
- Live external read-only connections.
- Public and provider-facing MCP foundations.
- Durable sandbox commerce lifecycle.
- YC recording mode with preflight, timing and verified narration.
- Application answer bank and current product-status matrix.

Founder actions:

1. Fill the bracketed founder and traction fields in `yc-application.md`.
2. Choose the exact demo account and ensure no sensitive chat history is visible.
3. Collect logos, written pilot interest and permission to name partners.
4. Schedule ten short merchant interviews; ask about one action they would expose and what they would pay.

## Phase 2 — Recording rehearsal

Record separate clips instead of one fragile continuous take:

1. Privy login and Stellar wallet.
2. Market data quote (CoinGecko) or Travala search.
3. Duplicate-resistant sandbox execution.
4. Founder explanation and vision.

Use `/demo` before every take. Continue only when preflight says **Ready to record**. Show Notion only after it succeeds twice for the demo account.

Definition of done:

- Final product video is 60–90 seconds.
- Every visible claim is labeled Live, Sandbox or Ready to validate.
- No seed phrase, token, private email content or admin credential appears.
- The safety proof ends with the same receipt after a retry.

## Phase 3 — Strongest payment update, when the founder is ready

1. Sign in with the exact demo account.
2. Confirm the expected Stellar Testnet wallet address.
3. Review a 1 XLM DeFindex intent.
4. Confirm the transaction-specific Privy signature.
5. Verify the transaction in Stellar Expert.
6. Retry and verify that the stored hash is returned without resubmission.
7. Add the explorer link and result to the application update.

This phase requires the founder at the computer. It is intentionally not part of today's safe preparation.

## Phase 4 — Commercial evidence

Target three written design-partner commitments:

- DeFindex: agent-controlled Testnet vault action.
- UNBLCK: reservation or access-request workflow.
- ArcusX: task creation and lifecycle workflow.

A useful commitment states the action to test, the person responsible, expected timing and success condition. A friendly conversation alone is not an LOI.

## Phase 5 — Proprietary contract after the first external proof

First candidate: `AgentPaymentRouter` on Soroban Testnet.

Scope:

- Exact recipient, asset, amount, expiry and intent hash.
- User authorization.
- Direct non-custodial transfer.
- One-time execution and replay protection.
- On-chain event as settlement evidence.

Defer spend-policy delegation and merchant escrow until the direct router is tested and reviewed.

## Stop conditions

Stop adding features and record when all are true:

- Production login works.
- Wallet and explorer link render.
- One external read-only action works.
- `/demo` preflight is green.
- Duplicate execution returns the original receipt.
- Application answers contain no empty factual fields except metrics awaiting a final count.

## Current highest-leverage order

1. Fill founder/application facts.
2. Rehearse and record the existing product.
3. Obtain three written pilot commitments.
4. ~~Complete one DeFindex Testnet transaction.~~ Done — Privy-signed 1 XLM deposit confirmed on-chain (tx `71a45ae1…`).
5. Only then start the proprietary Soroban contract.