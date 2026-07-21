# YC seven-day closeout plan

The goal is not to finish the full company vision. The goal is to submit a coherent company with reproducible product evidence, a founder who understands the problem and credible early partner demand.

> **Status note (July 21):** This is a historical plan. The [YC evidence ledger](yc-evidence-ledger.md) is the current source of truth — the DeFi execution proof (Day 4), the x402 payment and the UNBLCK booking are now **Live**. Remaining: two-user acceptance, partner commitments and the recording.

## Non-negotiable scope

- Stellar Testnet only.
- Privy as the user identity and wallet boundary.
- No new chain, escrow, proprietary contract or wallet provider.
- No claim is upgraded to Live without dated evidence.
- No production deployment or external mutation without founder authorization.
- Prefer one reliable end-to-end proof over five partial integrations.

## Evidence package required

| Proof | Definition of done | Owner |
| --- | --- | --- |
| Product access | Privy login creates or recovers the correct per-user Stellar wallet | Founder + Codex |
| User isolation | Two Privy emails have different wallets and cannot retrieve each other's memory | Founder + Codex |
| Personalized action | A saved preference is retrieved only for a relevant request and its provenance is visible | Codex |
| Payment safety | A confirmed x402 receipt is replayed with the same hash and zero second debit | Founder approval + Codex verification |
| DeFi execution | Done — a Privy-signed 1 XLM DeFindex Testnet deposit was verified on-chain (tx `71a45ae1…`) | Completed 2026-07-21 |
| External utility | One reproducible Travala search returns live normalized inventory | Codex |
| Commercial pull | Three written design-partner commitments with action, owner, timing and success condition | Founder |
| Demo | A truthful 60-90 second recording with no secrets and clear Live/Sandbox labels | Founder + Codex |
| Application | No bracketed founder facts, unsupported claims or contradictory status language | Founder + Codex |

## Day 1 - Freeze and baseline

Codex:

- Keep Graphify MCP and local hooks green.
- Run local QA, production doctor and Travala read-only acceptance.
- Create a single evidence ledger with pass, fail, proof link and owner.
- Identify only blockers that can affect the recording.

Founder:

- Select the exact demo email.
- Confirm the primary wallet address to use in evidence.
- Fill founder biography, equity, commitment and relocation fields.

Exit condition: one agreed demo account and a dated technical baseline.

## Day 2 - Second user and memory isolation

Founder:

- Sign in with a fresh second Privy email.
- Complete only the requested human login and signature boundaries.

Codex:

- Run the second-user acceptance sequence.
- Verify distinct wallet mapping.
- Test cross-user memory isolation.
- Record results without exposing tokens or email content.

Exit condition: two identities, two wallets and zero cross-user leakage.

## Day 3 - External utility and personalized behavior

Codex:

- Run Travala acceptance twice.
- Validate one relevant-memory retrieval and one unrelated-memory exclusion.
- Validate Notion read-only search only if existing OAuth consent works reliably.

Founder:

- Choose the one external action shown in the demo: Travala by default; Notion only if stable.

Exit condition: one external read-only action works twice consecutively.

## Day 4 - DeFindex execution proof

Founder:

- Review and approve exactly one 1 XLM Testnet transaction in Privy.

Codex:

- Prepare the exact DeFindex XDR.
- Verify policy preflight before signature.
- Verify the transaction hash and vault state in Stellar Expert.
- Retry safely and confirm no unintended second submission.

Exit condition: explorer link, exact amount, wallet and resulting position recorded.

## Day 5 - x402 replay and recording rehearsal

Founder:

- Approve a new payment only if the existing confirmed replay evidence is insufficient.

Codex:

- Run the confirmed-payment replay audit first.
- Prove the same payment id, transaction hash and zero second debit.
- Prepare separate recording clips: login/wallet, personalized action, external utility, payment safety.

Exit condition: every visible demo claim has a proof and status label.

## Day 6 - Commercial evidence and application draft

Founder:

- Obtain three concise written partner commitments.
- Confirm whether each partner may be named.
- Complete market insight, founder story and why-now answers.

Codex:

- Normalize LOIs into action, responsible person, timing and success condition.
- Audit the application for vagueness, inflation and contradictions.
- Produce the final 60-90 second narration.

Exit condition: complete application draft plus three partner signals or an honest count.

## Day 7 - Record, verify and submit

- Run the final QA and read-only production doctor.
- Record the demo using the pre-validated account.
- Verify no secret, token, private email or admin credential appears.
- Check every URL and explorer hash.
- Submit before the deadline buffer; do not use the final hours for a new feature.

## Stop conditions

Stop coding and record when these are true:

1. Login and wallet rendering work.
2. Personalized memory provenance is visible.
3. One external read-only action works.
4. One on-chain proof has an explorer link.
5. Duplicate protection has a same-hash, zero-second-debit result.
6. Application factual fields are complete.

Anything else moves to the post-application roadmap.
