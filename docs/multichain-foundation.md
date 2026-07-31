# Multichain wallet foundation

Status: isolated development branch. Testnet only. Not deployed.

## Goal

Carmelita keeps one Privy identity while activating one wallet per cryptographic
family:

- Stellar wallet (`stellar`)
- EVM wallet (`ethereum`) shared by Base, Avalanche and BNB Chain
- Solana wallet (`solana`)

Networks are activated on demand. Creating a wallet never moves funds and never
authorizes a transaction.

## Testnet rollout

| Network | Family | Status | Native asset |
| --- | --- | --- | --- |
| Stellar Testnet | Stellar | Active baseline | XLM |
| Base Sepolia | EVM | Planned / blocked | ETH |
| Solana Devnet | Solana | Experimental | SOL |
| Avalanche Fuji | EVM | Experimental — first EVM proof | AVAX |
| BNB Testnet | EVM | Planned / blocked | tBNB |

## Activation contract

`POST /api/agent/wallets`

```json
{
  "network": "avalanche:fuji",
  "explicitUserConfirmation": true
}
```

The route:

1. verifies the Privy bearer token;
2. rejects cross-origin writes;
3. checks that the network is available and testnet-only;
4. creates or recovers the deterministic user-owned family wallet;
5. stores the wallet against the authenticated user;
6. returns the address and network metadata with `fundsMoved: false`.

Provisioning is idempotent through the deterministic Privy `external_id` and
idempotency key. A repeated activation returns the same wallet.

## Safety invariants

- Mainnet networks do not exist in the activation schema.
- Planned networks return `network_not_available`.
- Creating a wallet cannot sign or broadcast a transaction.
- Stellar-specific flows select `chain_type = stellar`; an EVM or Solana wallet
  cannot accidentally enter DeFindex, Soroswap or x402 Stellar execution.
- EVM uses one wallet address across Base, Avalanche and BNB; do not create one
  Privy wallet per EVM network.

## Next acceptance milestone: Avalanche Fuji

1. Activate Avalanche Fuji from the authenticated chat.
2. Show the EVM address and verify the same address is returned on retry.
3. Verify RPC chain ID `43113`, then read AVAX balance, gas price and nonce.
4. Guide the user to the official Test AVAX faucet without claiming funds were received.
5. Prepare a bounded transfer preview containing chain ID, recipient, amount,
   estimated gas and expiry.
6. Require transaction-specific Privy approval.
7. Broadcast once and store the receipt.
8. Replay the confirmation and prove that no second transaction was submitted.
9. Repeat with a second Privy user and prove wallet isolation.

Only after these checks pass can Avalanche Fuji move from `experimental` to
`active`.

## Current read-only diagnostic

After activation, authenticated clients can call `GET /api/agent/wallets/avalanche`.
It returns the observed Fuji chain ID, wallet address, AVAX balance, gas price, nonce, explorer URL and faucet URL. It never signs or moves funds. A wrong RPC chain is rejected with `evm_chain_id_mismatch`.

The official Circle Testnet USDC contract recorded for the later Avalanche x402 milestone is `0x5425890298aed601595a70AB815c96711a31Bc65`. The first proof uses native AVAX so wallet creation, funding, signing and receipt verification can be validated before adding ERC-20 or x402 concerns.
