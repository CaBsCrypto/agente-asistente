# Privy + Stellar Testnet lab

The founder lab at `/admin/stellar` validates the wallet primitive before it
is connected to the public commerce flow.

## What is real

- A Stellar wallet is created through the Privy Wallet API with `chain_type: stellar`.
- Friendbot creates and funds that address on Stellar Testnet.
- Horizon returns the real testnet account and balances.
- Privy signs a unique SHA-256 challenge.
- `@stellar/stellar-sdk` verifies the Ed25519 signature against the wallet address.

## What is not real yet

- No mainnet funds are used.
- No merchant receives a payment.
- No transaction XDR is built or submitted.
- The founder test wallet is application-controlled. End-user delegated
  authorization and the final non-custodial ownership model come next.

## Configure Privy

1. Create or open an app in the Privy Dashboard.
2. Copy the App ID and create an App Secret.
3. Add both values as server environment variables:

```dotenv
PRIVY_APP_ID=your-app-id
PRIVY_APP_SECRET=your-app-secret
```

4. Never prefix the secret with `NEXT_PUBLIC_`, expose it to a Client
   Component, log it, or commit it.
5. Restart the local server or redeploy after setting the variables.

## Run the proof

1. Sign in to `/admin`.
2. Open `/admin/stellar`.
3. Create a wallet.
4. Fund it with Friendbot.
5. Confirm that Horizon shows a native XLM test balance.
6. Sign the challenge and confirm the `VERIFIED` result.

## Next test

Build a Stellar Testnet payment transaction XDR, freeze its amount and
destination in a commerce intent, request explicit approval, sign the
transaction hash through Privy, submit it to Horizon once, and persist the
transaction hash as the receipt. A retry with the same idempotency key must
return the stored receipt rather than submit a second transaction.
