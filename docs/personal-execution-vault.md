# Personal Execution Vault

The Personal Execution Vault is the user-owned context and policy layer for agent-assistant. It keeps knowledge, execution rules and decision evidence separate so that a preference can influence a recommendation without becoming financial authority.

## Product model

| Layer | Purpose | Enforcement |
| --- | --- | --- |
| Knowledge | Preferences, project context and travel context | Advisory |
| Policy | Network, spend, approval and risk rules | Hard or advisory |
| Authority | Proposed delegated permissions | Draft until manually activated |
| Decision evidence | Preflight outcome, reasons and applied rules | Immutable activity record |

A note never signs a transaction. A financial or irreversible action still requires a transaction-specific Privy confirmation.

## User workflow

1. Sign in with Privy.
2. Open **My Agent** in the authenticated workspace.
3. Add context from the panel or chat.
4. Review the structured record under Knowledge or Rules.
5. Pause, activate or delete the record.
6. Ask the agent to prepare an action.
7. Open **Why this action?** to inspect the applied rules.
8. Approve the exact transaction only if the preview is correct.

Supported conversational examples:

- "Remember that I only operate on Testnet"
- "Recuerda que mi maximo es 5 XLM por operacion"
- "Lembre que prefiro hoteis tranquilos e com mesa"
- "Ask me before every payment"
- "What do you know about me?"

## Current policy enforcement

The DeFindex preparation endpoint enforces the same server-side preflight used by the chat. The current evaluator supports:

- Mainnet disabled as an application safety boundary.
- Allowed-network policies.
- Per-action XLM or USDC limits.
- Explicit-approval policies.
- Advisory risk profiles.
- Draft delegated authority that cannot execute until activated.

When a rule blocks an action, no XDR is prepared for signing, Privy is not invoked and no funds move.

## Persistent data

All records are owned by the authenticated Privy user id.

- **agent_knowledge_items**: preferences and context.
- **agent_policies**: structured rules and authority proposals.
- **agent_decision_events**: allowed or blocked preflight evidence.

The API is available at **/api/agent/memory** and requires a valid Privy access token plus same-origin requests.

- **GET**: list the current user's vault.
- **POST**: create a record from natural language or structured input.
- **PATCH**: activate, pause or return a record to draft.
- **DELETE**: permanently delete one user-owned record.

## Safety properties

- User isolation is enforced in every database query.
- Mainnet remains disabled independently of saved memory.
- Dangerous phrases that propose payment without confirmation are stored as draft authority.
- Financial execution continues to require explicit Privy confirmation.
- Decisions store reason codes and applied rules.
- Paused and draft policies are excluded from enforcement.

## Current boundary

This sprint implements structured memory and policy-based execution. It does not yet implement semantic embeddings, file ingestion, Obsidian synchronization, automatic conflict resolution or model fine-tuning.

The next validation step is a five-user pilot in which each user:

1. Saves at least three preferences or rules.
2. Returns in a new session and retrieves them.
3. Prepares an action inside a limit.
4. Attempts an action outside the limit.
5. Verifies that the first requires approval and the second is blocked before signing.

