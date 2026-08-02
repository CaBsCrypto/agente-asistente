# Carmelita Avalanche ecosystem roadmap

## Product thesis

Carmelita is the permission and execution layer for Avalanche agents. It discovers services, applies user policies, obtains Privy authorization, executes on Testnet and produces verifiable receipts.

## Product sections

| Section | Current proof | Next acceptance gate |
| --- | --- | --- |
| Knowledge | Builder Hub MCP live; AVAX Skills advisory built | Conversational AVAX Skills test and production build |
| Wallet | Privy Fuji wallet status live | One real AVAX transfer with exact receipt |
| Payments | x402 exact payment live on Fuji | Second user plus expiration, mutation and replay proofs |
| Trading | Pangolin Circle-USDC swap built | Real 0.1 AVAX swap, before/after balances and replay guard |
| DeFi | Aave market/position reads built | Revalidate contracts; keep writes experimental |
| Cross-chain | CCTP resumable flow built | Real 1 USDC Fuji-to-Stellar transfer with dual approvals |
| Data and evidence | RPC verification and public indexers | Official Data API key, normalized events and webhook replay |
| NFT | Collection, holders, provenance and venue reads built | Live read acceptance; no write while Fuji venues remain inactive |
| Developer platform | x402 v2 merchant SDK and provider MCP built | Third-party test merchant receives one payment and one replay receipt |

## Delivery order

### S0 - Truth and merge

- Protect the untracked Aave scratch files in `main`.
- Validate AVAX Skills through Carmelita chat.
- Run tests, lint, type check, production build and Graphify.
- Merge only when no capability is labeled `live` without evidence.

### S1 - Financial acceptance

- Complete x402 with a second Privy user.
- Prove an identical retry produces the original receipt and zero second debit.
- Reject expired, mutated and mismatched authorizations.
- Complete one exact Fuji AVAX transfer.

### S2 - Pangolin swap

- Keep the pinned Pangolin V2 Fuji router and Circle USDC address.
- Freeze route, calldata, amount, deadline, slippage and minimum output.
- Apply user policy before opening Privy.
- Verify exact balance deltas and persist the Fuji receipt.

LFJ remains a liveness read because its Fuji test USDC is not Circle USDC. It cannot replace the Pangolin path used by x402, CCTP and potential Aave experiments.

### S3 - Evidence plane

- Add Avalanche Data API behind a server-only key.
- Normalize events by chain ID, transaction hash and log index.
- Persist checkpoints and make webhook replay idempotent.
- Reconcile browser, RPC and Data API evidence without silently resolving disagreement.

### S4 - CCTP

- Burn one Circle USDC on Fuji.
- Validate Circle attestation.
- Mint and forward on Stellar Testnet.
- Resume after interruption without a second burn.

### S5 - Experimental DeFi

- Move Aave scratch work into an isolated branch.
- Reverify live Fuji deployments from primary sources.
- Close market and position reads first.
- Add supply only together with withdraw, exact allowance, policy and before/after evidence.

### S6 - Developer ecosystem

- Expose self-service merchant onboarding through the provider MCP.
- Pin merchant settlement configuration server-side.
- Publish a test resource, charge through x402 v2 and return an idempotent delivery receipt.

### S7 - Account abstraction

- Use a separate experimental wallet and branch.
- Evaluate ERC-4337, session keys and Circle/0xGasless paymasters.
- Never replace existing Privy ownership or approval boundaries without an independent acceptance proof.

## Universal write gate

Every financial capability must follow:

`prepare -> freeze -> policy -> explain risk -> explicit Privy approval -> submit -> verify -> receipt -> idempotent replay`

Mainnet remains disabled until the corresponding Testnet capability has reproducible evidence, negative tests, monitoring and a rollback strategy.