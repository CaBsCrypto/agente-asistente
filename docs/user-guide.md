# New user guide

The public, trilingual version of this manual is available at:

https://agente-asistente.vercel.app/guide

## Purpose

This guide helps a new user:

1. Sign in through Privy.
2. Find the Stellar wallet attached to the current account.
3. Request fake Testnet XLM from the chat.
4. Understand why XLM does not need a trustline.
5. Prepare the exact USDC trustline required by DeFindex.
6. Prepare and approve a 1 XLM DeFindex Testnet deposit.
7. Verify the result with an explorer receipt.

## Complete chat sequence

Send one message at a time:

~~~text
Dame mi wallet
Recarga mi wallet con XLM de Testnet
Activa XLM
Activa USDC
¿Cuál es el siguiente paso de configuración Testnet?
Deposita 1 XLM en DeFindex Testnet
~~~

The same flow works in English and Portuguese.

## Expected results

| Message | Expected result | Signature |
| --- | --- | --- |
| Dame mi wallet | Address and current on-chain checklist | No |
| Recarga mi wallet con XLM de Testnet | Friendbot funding only if the account is absent | No wallet signature |
| Activa XLM | Explanation that XLM is native and account status | No |
| Activa USDC | Exact ChangeTrust transaction review | Privy confirmation |
| Siguiente paso | Recomputed Horizon status and valid next action | No |
| Deposita 1 XLM | Exact DeFindex Testnet transaction review and, after approval, an on-chain receipt | Privy confirmation |

## Safety rules

- The network must say Stellar Testnet.
- Testnet XLM has no real value.
- Mainnet is disabled.
- Never share a seed phrase or private key.
- Review wallet, asset, amount and destination before Privy confirmation.
- Natural language prepares a sensitive action but does not sign it.
- Use the transaction receipt as the settlement proof.

## Common questions

### Friendbot did not add more XLM

The account already exists. The agent avoids requesting Friendbot twice and reports the current balance.

### Activate XLM did not open a transaction

XLM is Stellar's native asset. It has no separate trustline operation.

### The USDC trustline is active but the balance is zero

A trustline only permits the wallet to hold an exact asset. The wallet still needs that issuer's compatible Testnet USDC.

### The USDC deposit is unavailable

The public DeFindex vault uses one exact USDC issuer. Carmelita does not currently control a funded distributor and will not substitute another asset with the same code.

### Testnet was reset

Sign in, ask for the wallet and request Testnet XLM again. The agent reads the current network state rather than relying on an old onboarding step.

### The transaction review expired

Ask the agent to prepare it again. Do not approve an expired or unexpected transaction.

## YC acceptance recording

Use a fresh email account to demonstrate the full path:

1. Wallet created at login.
2. Wallet reported from chat.
3. Friendbot requested from chat.
4. On-chain balance shown.
5. 1 XLM DeFindex action prepared.
6. Exact Privy review shown.
7. Transaction confirmed.
8. Explorer receipt opened.
9. Same request retried without a second submission.
