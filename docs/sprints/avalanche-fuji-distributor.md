# Avalanche Fuji testnet distributor runbook

Status: **designed and disabled**. No external distributor service exists today. Carmelita does not store a distributor private key, sign a distributor transaction, deploy this endpoint, or move funds.

## Safety contract

Every claim is fixed to:

- Avalanche Fuji C-Chain (`43113`).
- Exactly `0.005 AVAX` (`5,000,000,000,000,000 wei`).
- The authenticated user's active Privy EVM wallet persisted for `avalanche:fuji`.
- Once per authenticated Privy user, with a stable idempotency key.
- An atomic daily cap in the external service, configured from `1..500` claims/day.
- HTTPS only, no URL credentials/query/hash and no localhost/private target.
- A timeout from `1,000..10,000 ms`.

The raw Privy user ID is never sent. Carmelita derives a stable HMAC-SHA256 `claimKey`. The external service is the source of truth for atomic once/user and daily-cap enforcement.

Carmelita does not trust service JSON alone. It queries Fuji RPC and accepts success only when RPC chain and transaction chain are `43113`, hash matches, `to` is the user's wallet, native value is exactly `5,000,000,000,000,000 wei`, and receipt status is `0x1`. Pending/not-found returns a retryable error using the same idempotency key. Failed or mismatched transactions are rejected.

## Server-only variables

Keep the feature disabled until an independently reviewed service exists:

```dotenv
FUJI_DISTRIBUTOR_ENABLED=false
FUJI_DISTRIBUTOR_URL=https://distributor.example.com/v1/fuji/drip
FUJI_DISTRIBUTOR_SECRET=<random-server-secret-minimum-32-characters>
FUJI_DISTRIBUTOR_DAILY_LIMIT=100
FUJI_DISTRIBUTOR_TIMEOUT_MS=5000
```

Never use `NEXT_PUBLIC_`. The secret authenticates the service request and derives a user pseudonym; it is not a wallet key. The service signer belongs in a separate HSM/managed signer/relayer and holds testnet AVAX only.

## External service contract

Authenticated `POST` with `Authorization: Bearer <secret>` and `Idempotency-Key`:

```json
{
  "protocol": "carmelita-fuji-drip-v1",
  "chainId": 43113,
  "amount": "0.005",
  "recipient": "0x...",
  "claimKey": "64-char-hmac",
  "idempotencyKey": "fuji-drip-v1-...",
  "claimWindow": "once_per_authenticated_user",
  "dailyLimit": 100
}
```

The service must atomically reserve the unique `claimKey` and daily capacity before broadcasting. A duplicate idempotency key returns the original hash and never broadcasts again.

Required successful response:

```json
{
  "status": "submitted",
  "transactionHash": "0x...64 hex...",
  "chainId": 43113,
  "amount": "0.005",
  "recipient": "0x...",
  "claimKey": "same claim key",
  "idempotencyKey": "same idempotency key",
  "replayed": false,
  "dailyClaims": 1
}
```

Expected errors: `409` already claimed, `429` daily cap, all other non-2xx fail closed. Never return keys or secrets.

## Post-reboot local sequence

From `D:\00 CODEX - OPENIA\agente-asistente-multichain`:

```powershell
git branch --show-current
node --version
npm ci --no-audit --no-fund
npm run runtime:doctor
npm run test -- --test-name-pattern="distributor"
npm run dev -- --port 3001
npm run runtime:doctor -- --url=http://localhost:3001
```

Before a service exists, expect the doctor to say `Fuji distributor: PASS — disabled (safe default)` and the authenticated funding route to return `503 fuji_distributor_disabled`. No transaction or faucet request occurs.

## Future activation checklist

1. Build and security-review an external service with atomic persistence.
2. Use a managed testnet-only signer; fund it manually with Fuji AVAX.
3. Verify duplicate and daily-cap behavior independently.
4. Configure Preview/local variables while `ENABLED=false`.
5. Test one user and a second user; verify every hash through Fuji RPC.
6. Test duplicate, timeout, error, pending, failed tx, mismatched receipt and cap exhaustion.
7. Enable only in Preview after explicit approval. Mainnet remains prohibited.
8. Monitor claims and automatically disable on anomalies.

## Definition of done

- [x] Fail-closed config, HTTPS/private-network defense, timeout and cap bounds.
- [x] Privy auth, same-origin protection and persisted wallet ownership.
- [x] Fixed network/amount, explicit confirmation and HMAC idempotency.
- [x] Strict response schema plus independent on-chain verification.
- [x] Doctor safe-default/readiness checks.
- [x] Pure tests for config, privacy, replay and receipt/on-chain mismatch.
- [ ] External distributor exists and is reviewed.
- [ ] Testnet signer is funded.
- [ ] Authenticated localhost acceptance is complete.
- [ ] Feature is enabled. It must remain disabled until the prior items pass.
