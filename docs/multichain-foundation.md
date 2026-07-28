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
| Base Sepolia | EVM | Experimental | ETH |
| Solana Devnet | Solana | Experimental | SOL |
| Avalanche Fuji | EVM | Planned / blocked | AVAX |
| BNB Testnet | EVM | Planned / blocked | tBNB |

## Activation contract

`POST /api/agent/wallets`

```json
{
  "network": "base:sepolia",
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

## Next acceptance milestone: Base Sepolia

1. Activate Base Sepolia from the authenticated chat.
2. Show the EVM address and verify the same address is returned on retry.
3. Read the Base Sepolia native balance.
4. Guide the user to a faucet without claiming funds were received.
5. Prepare a bounded transfer preview containing chain ID, recipient, amount,
   estimated gas and expiry.
6. Require transaction-specific Privy approval.
7. Broadcast once and store the receipt.
8. Replay the confirmation and prove that no second transaction was submitted.
9. Repeat with a second Privy user and prove wallet isolation.

Only after these checks pass can Base Sepolia move from `experimental` to
`active`.
