# DeFindex on Stellar Testnet

agent-assistant integrates directly with public DeFindex Soroban vaults. It does not require a DeFindex API key or a DeFindex-hosted MCP server.

## Public contracts

| Asset | Vault | Strategy |
| --- | --- | --- |
| XLM | CCLV4H7WTLJQ7ATLHBBQV2WW3OINF3FOY5XZ7VPHZO7NH3D2ZS4GFSF6 | CDVLOSPJPQOTB6ZCWO5VSGTOLGMKTXSFWYTUP572GTPNOWX4F76X3HPM |
| USDC | CBMVK2JK6NTOT2O4HNQAIQFJY232BHKGLIMXDVQVHIIZKDACXDFZDWHN | CALLOM5I7XLQPPOPQMYAHUWW4N7O3JKT42KQ4ASEEVBXDJQNJOALFSUY |

The exact Testnet USDC issuer is:

GATALTGTWIOT6BUDBCZM3Q4OQ4BO2COLOAZ7IYSKPLC2PMSOPPGF5V56

Do not substitute another Testnet USDC issuer. Stellar assets with the same code but different issuers are different assets.

## Chat-first prerequisite flow

The user does not operate a DeFi console to initialize the wallet. The authenticated agent chat reads the live account state and accepts this sequence:

~~~text
Dame mi wallet
Recarga mi wallet con XLM de Testnet
Activa XLM
Activa USDC
¿Cuál es el siguiente paso de configuración Testnet?
~~~

- **Dame mi wallet** returns the address and the current on-chain checklist.
- **Recarga mi wallet con XLM de Testnet** invokes Friendbot only for an absent account.
- **Activa XLM** reports that XLM is native and requires no trustline.
- **Activa USDC** prepares the exact ChangeTrust transaction and opens its Privy review.
- **Recarga mi wallet con USDC** checks the exact issuer balance. It does not pretend that another Testnet USDC is compatible.
- **Cuál es el siguiente paso** recomputes the state from Horizon instead of trusting a stored wizard step.

## Conversational transaction preparation

After the account has Testnet XLM:

~~~text
Deposita 1 XLM en DeFindex Testnet
Deposit 1 XLM into DeFindex on Testnet
Deposite 1 XLM na DeFindex Testnet
~~~

The agent extracts the operation, asset and amount, then builds and simulates the exact transaction review. Natural language never signs or submits the transaction. The user must review the transaction-specific card and press **Confirm and sign with Privy**.

The same rule applies to the trustline:

~~~text
Activa USDC
Activate USDC
Ative USDC
~~~

## User flow

1. The authenticated user asks the agent for a wallet or Testnet setup.
2. The server resolves the user-owned Privy Stellar wallet.
3. Horizon supplies the current account, XLM and exact-issuer USDC state.
4. Friendbot creates and funds the Testnet account only when requested and absent.
5. For USDC, the agent prepares the exact trustline transaction.
6. For a deposit, the server constructs and simulates the requested Soroban transaction.
7. The UI presents the network, asset, amount, destination contract and investment flag.
8. The user explicitly confirms.
9. The browser calls Privy's `useSignRawHash` for that exact transaction hash.
10. The browser sends only the resulting 64-byte Ed25519 signature to the same-origin backend.
11. agent-assistant verifies the signature against the wallet address, attaches it to the frozen XDR and submits once.
12. The transaction hash, status and explorer link are stored as a durable receipt.
13. A retry returns the existing receipt instead of submitting again.

## Safety boundary

- Stellar Testnet only.
- No private key or seed phrase reaches agent-assistant.
- The backend never calls Privy `rawSign` and never receives a private key; signing remains in the authenticated browser.
- Login alone does not request funds or submit a transaction.
- Friendbot funding is requested by chat and guarded by live account existence.
- Every trustline and deposit requires a transaction-specific confirmation.
- Prepared XDR, signed XDR and transaction hash are persisted for replay protection.
- Mainnet remains disabled.

## Current proof status

The XLM path is a **Live Testnet proof**: a user completed a Privy-signed 1 XLM deposit into the public DeFindex vault, confirmed on-chain (transaction hash `71a45ae162a4b49419b8fcaa06d317eb08c2d588cd7c93c8e783c2dc8319b50a`), with wallet lookup, exact review, submission and a replay-safe receipt working end to end.

The USDC trustline path is also implemented. An end-to-end USDC deposit still requires a funded distributor for the exact issuer used by the public vault. agent-assistant does not currently control one, so the product must not claim automatic USDC funding or substitute Circle Testnet USDC with a different issuer.

The public XLM and USDC vaults were readable on-chain, but both reported zero capital allocated to their configured Blend strategy during the latest verification. Deposits can mint vault shares, but Testnet yield must not be claimed unless a later on-chain query proves funds are invested.

## API

Authenticated browser endpoints:

- GET /api/agent/defindex — wallet, balances, trustline, positions and recent receipts.
- POST /api/agent/defindex with action prepare — create a transaction-specific approval.
- POST /api/agent/defindex with action execute and explicitConfirmation true — authorize, sign and submit.
  The execute body includes the `0x` 64-byte client signature; the backend verifies and attaches it rather than signing.
- POST /api/agent/chat — detect chat-native onboarding and DeFindex transaction intents.

Every endpoint requires the current Privy bearer token and same-origin requests.
