# Soroswap Testnet integration

agent-assistant integrates the official Soroswap API as a server-only connector.
The API key is never sent to the browser. Mainnet is not accepted by the route.

## Live dependency status

On July 18, 2026, the authenticated client reached the Soroswap API successfully,
but `GET /health` returned an empty Testnet protocol list and `POST /quote`
returned `No path found` for the official XLM/USDC pair. The integration remains
ready for acceptance testing as soon as Soroswap restores Testnet routing.

## Supported proof

The first bounded proof supports only:

- Stellar Testnet;
- XLM and the Soroswap Testnet USDC contract;
- exact-input swaps;
- amounts greater than zero and no more than 100 units;
- slippage from 1 to 500 basis points;
- Soroswap and Aqua Testnet liquidity;
- a transaction-specific Privy signature.

## Flow

~~~mermaid
sequenceDiagram
  participant U as User
  participant A as Agent chat
  participant S as Soroswap API
  participant P as Privy
  participant N as Neon
  participant T as Stellar Testnet

  U->>A: Quote or swap XLM/USDC
  A->>S: POST /quote?network=testnet
  S-->>A: Verified route and minimum output
  A->>S: POST /quote/build?network=testnet
  S-->>A: Unsigned XDR
  A->>N: Store frozen preview and hash
  A-->>U: Show exact review
  U->>P: Confirm transaction hash
  P-->>A: Stellar Ed25519 signature
  A->>A: Verify signature and attach it to XDR
  A->>S: POST /send?network=testnet
  S->>T: Submit signed XDR
  S-->>A: Transaction hash
  A->>N: Store durable receipt
  A-->>U: Stellar Expert link
~~~

## Configuration

~~~text
SOROSWAP_API_KEY=<your-server-only-key>
~~~

Use the exact name above in Vercel Preview and Production. Never add a
`NEXT_PUBLIC_` prefix.

## Chat prompts

~~~text
Cotiza 1 XLM a USDC en Soroswap Testnet
Intercambia 1 XLM por USDC en Soroswap Testnet
Quote 1 XLM to USDC on Soroswap Testnet
Swap 1 XLM to USDC on Soroswap Testnet
~~~

A quote is read-only. A swap creates an unsigned XDR and opens a review panel.
The user must press the transaction-specific Privy confirmation button before
the signed XDR can be submitted.

## Safety boundaries

- The server obtains the quote and build result; the browser cannot substitute
  a different raw route.
- The XDR source must equal the authenticated user's persisted Stellar wallet.
- The transaction hash is frozen before requesting Privy authorization.
- The submitted hash must equal the prepared hash.
- An idempotency key prevents one chat request from creating multiple actions.
- Secrets, signed XDR and raw API responses are not returned in public history.
