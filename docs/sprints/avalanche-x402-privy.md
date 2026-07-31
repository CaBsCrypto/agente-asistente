# Avalanche Fuji x402 v2 + Privy evidence

Status: preparation complete; settlement intentionally absent.

This workstream prepares a non-custodial `exact` x402 v2 authorization for Avalanche Fuji. It does not expose a route, move funds, or call facilitator mutation endpoints.

## Verified gate

Verified on July 28, 2026:

- Fuji RPC returned `eth_chainId = 0xa869` (`43113`).
- `GET https://facilitator.ultravioletadao.xyz/health` was healthy.
- Live `/supported` included v2 `exact`, `eip155:43113`, USDC `0x5425890298aed601595a70AB815c96711a31Bc65`, 6 decimals.
- Read-only token calls returned `name() = USD Coin`, `version() = 2`, `decimals() = 6`.
- Avalanche documents EIP-3009 `TransferWithAuthorization` for this Fuji flow.
- Privy documents interactive EIP-1193 `eth_signTypedData_v4`.

Primary sources:

- https://build.avax.network/academy/blockchain/x402-payment-infrastructure/05-hands-on-implementation/02-first-payment
- https://build.avax.network/academy/blockchain/x402-payment-infrastructure/04-x402-on-avalanche/03-facilitators
- https://docs.cdp.coinbase.com/x402/migration-guide
- https://docs.privy.io/wallets/using-wallets/ethereum/ethereum-provider
- https://docs.privy.io/api-reference/wallets/ethereum/eth-signtypeddata-v4

## Prepared security boundary

`app/x402-avalanche/` validates live facilitator discovery, freezes resource URL/method/body hash plus payer/recipient/asset/value/validity/nonce into one payment ID, builds exact EIP-712 typed data, checks Fuji again through Privy, and binds one signature per payment ID. No private key, key export, transaction broadcast, `/verify`, or `/settle` exists here.

## Remaining mutation gate

Before user-facing settlement:

1. Add `@x402/evm@2.18.0`, matching existing packages, and regression-test Stellar x402.
2. Select a live protected Fuji resource and validate its actual `PAYMENT-REQUIRED` challenge.
3. Durably persist prepared payment and first signature with atomic uniqueness.
4. Build v2 `PAYMENT-SIGNATURE` using the official SDK.
5. Retry only the same payment ID/signature.
6. Independently verify chain, token, sender, recipient, value and transaction hash before delivery.

Until then this remains preparation-only.
