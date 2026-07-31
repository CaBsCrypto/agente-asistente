# Wallet Center

Status: isolated multichain branch, Testnet only, not deployed.

## Mental model

Carmelita displays wallets by cryptographic family, not by every network:

| Family | Address format | Initial network | Reuse |
| --- | --- | --- | --- |
| Stellar | `G...` | Stellar Testnet | Stellar networks and Stellar protocols |
| EVM | `0x...` | Avalanche Fuji | The same address can later be used on Base and BNB |
| Solana | Base58 | Solana Devnet | Solana-compatible networks |

Reusing an EVM address does not bridge balances. AVAX on Fuji, ETH on Base and
tBNB on BNB remain independent assets and histories.

## Avalanche Fuji activation

1. The authenticated user presses **Activate Fuji**.
2. The client sends `POST /api/agent/wallets` with:

```json
{
  "network": "avalanche:fuji",
  "explicitUserConfirmation": true
}
```

3. The backend creates or recovers the user-owned Privy `ethereum` wallet.
4. The browser refreshes the Privy user so later signing can discover the wallet.
5. `GET /api/agent/wallets/avalanche` verifies chain `43113` and reads balance,
   gas price and nonce.
6. If the balance is zero, the UI exposes the official Test AVAX faucet.
7. After funding, **Refresh** recomputes the state directly from Fuji.

Activation creates an identity surface only. It does not request a signature,
obtain faucet funds or broadcast a transaction.

## Next transaction proof

The first write will transfer `0.001 AVAX` between two user-owned Privy test
wallets. The user must review the network, recipient, amount and estimated gas
before Privy requests a transaction-specific confirmation. The backend must
persist the resulting hash and return the same receipt for an idempotent replay.
