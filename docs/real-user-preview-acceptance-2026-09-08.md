# Real-user Preview acceptance — 2026-09-08

Status: implemented and partially accepted; not a complete acceptance claim.

Two designated test identities completed Privy login, bootstrap, reload and a
second login. Each recovered its own marked chat message, memory and the same
three wallet addresses. The second identity did not display the first identity's
markers. Both were rejected by the administrator session exchange. Both designated
administrators successfully accessed the private panel through Privy.

The isolated database contains two users and six wallets. Read-only counts at
05:21 UTC showed zero x402 payments, Stellar actions, faucet claims and commerce
intents. Both Stellar wallets were reused and already held Testnet balances;
this run did not test creation of a brand-new empty Stellar wallet or fund them.
Personal identifiers and exact temporary-record details remain in ignored local
acceptance evidence rather than this public document.

Live inspection found the wallet registry incorrectly marked Solana addresses
invalid while ignoring Solana for completeness. The correction includes Solana
in required networks, address validity, missing-network counts and the selector,
and constructs the address explorer URL correctly. This is wallet provisioning
acceptance only; it does not establish Solana transfers, SPL tokens or bridges.

A Preview-only `/preview-acceptance` page runs authenticated read comparisons
against the existing chat, memory and wallet APIs with an attempted foreign owner
selector. It uses Privy in the visible application without exporting access tokens,
and is unavailable outside a verified isolated Preview. No new API is added.
Each real identity must run it with distinct own/foreign test markers. A passed
check proves these reads remain scoped to the authenticated user, not arbitrary
mutation or receipt access. Those limits must remain explicit in final evidence.

Pending: live API read comparisons for both identities, final Solana registry
verification after deployment, and exact cleanup of this run's messages/memories.
Accounts and wallet records are retained. Existing synthetic Gateway tests are
separate evidence, not a substitute for real-session acceptance.

Graphify update remains blocked by its missing Python 3.12 interpreter.
Solana Devnet operations are requested as the next multichain capability;
transfers, SPL support and any bridge require separate implementation and acceptance.
No Mainnet or financial execution is authorized by this acceptance run.
