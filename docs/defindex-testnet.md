# DeFindex on Stellar Testnet

agent-assistant integrates directly with the public DeFindex Soroban vaults. It does not require a DeFindex API key or a DeFindex-hosted MCP server.

## Public contracts

| Asset | Vault | Strategy |
| --- | --- | --- |
| XLM | `CCLV4H7WTLJQ7ATLHBBQV2WW3OINF3FOY5XZ7VPHZO7NH3D2ZS4GFSF6` | `CDVLOSPJPQOTB6ZCWO5VSGTOLGMKTXSFWYTUP572GTPNOWX4F76X3HPM` |
| USDC | `CBMVK2JK6NTOT2O4HNQAIQFJY232BHKGLIMXDVQVHIIZKDACXDFZDWHN` | `CALLOM5I7XLQPPOPQMYAHUWW4N7O3JKT42KQ4ASEEVBXDJQNJOALFSUY` |

The exact Testnet USDC issuer is:

`GATALTGTWIOT6BUDBCZM3Q4OQ4BO2COLOAZ7IYSKPLC2PMSOPPGF5V56`

Do not substitute another Testnet USDC issuer. Stellar assets with the same code but different issuers are different assets.

## User flow

1. The authenticated user opens DeFindex from the agent chat.
2. The server reads the user-owned Stellar wallet and public vault state.
3. For USDC, the agent first prepares the exact trustline transaction.
4. The server constructs and simulates the requested transaction.
5. The UI presents the network, asset, amount, destination contract and investment flag.
6. The user explicitly confirms.
7. The user's current Privy JWT authorizes `rawSign` for the transaction hash.
8. agent-assistant verifies the Ed25519 signature against the wallet address.
9. The signed XDR is submitted once.
10. The transaction hash, status and explorer link are stored as a durable receipt.

## Safety boundary

- Stellar Testnet only.
- No private key or seed phrase reaches agent-assistant.
- Login alone does not submit a transaction.
- Every trustline and deposit requires a transaction-specific confirmation.
- Prepared XDR, signed XDR and transaction hash are persisted for replay protection.
- A retry returns the existing receipt when the transaction is already confirmed.
- Mainnet remains disabled.

## Current caveat

The public XLM and USDC vaults were readable on-chain, but both reported zero capital allocated to their configured Blend strategy during the latest verification. Deposits can still mint vault shares, but Testnet yield must not be claimed unless a later on-chain query proves funds are invested.

The wallet must separately receive the exact Blend Testnet USDC before the USDC deposit can succeed. Circle Testnet USDC with a different issuer is incompatible with this vault.

## API

Authenticated browser endpoint:

- `GET /api/agent/defindex` — wallet, trustline, shares and recent receipts.
- `POST /api/agent/defindex` with `action: prepare` — create a transaction-specific approval.
- `POST /api/agent/defindex` with `action: execute`, the approval ID and `explicitConfirmation: true` — authorize, sign and submit.

The endpoint requires the current Privy bearer token and same-origin requests.
