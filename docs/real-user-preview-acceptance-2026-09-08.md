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

A Preview-only `/preview-acceptance` page runs authenticated query comparisons
against the existing chat, memory and wallet APIs with an attempted foreign owner
selector. It uses Privy in the visible application without exporting access tokens,
and is unavailable outside a verified isolated Preview. No new API is added.
Each real identity must run it with distinct own/foreign test markers. A passed
check proves these reads remain scoped to the authenticated user. The GET routes
can initialize storage or update conversation metadata; they are not strictly
free of database writes. The page also attempts to pause one explicitly identified
foreign test memory and expects 404, followed by a database snapshot comparison.
It does not validate receipt access or arbitrary mutations.

Review found that memory UPDATE/DELETE already scoped changes to ID and owner but
returned success for zero affected rows. They now return 404 for both nonexistent
and foreign records, without disclosing which case occurred.

On commit 20cf12a, account A passed chat/memory/wallet own-scope query comparisons
and administrative rejection (401). Refined mutation checks remain pending.

Pending: live API read comparisons for both identities, final Solana registry
verification after deployment, and exact cleanup of this run's messages/memories.
Accounts and wallet records are retained. Existing synthetic Gateway tests are
separate evidence, not a substitute for real-session acceptance.

Graphify update remains blocked by its missing Python 3.12 interpreter.
Solana Devnet operations are requested as the next multichain capability;
transfers and SPL support require separate implementation and acceptance. The
user chose separate networks; bridges are explicitly deferred.
No Mainnet or financial execution is authorized by this acceptance run.
