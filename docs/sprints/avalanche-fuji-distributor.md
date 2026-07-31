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

## In-chat funding experience

The agent now exposes a Testnet funding center as a modal inside Carmelita:

1. The CCTP readiness report turns `fuji_avax_required` into a direct **Resolve Fuji gas in Carmelita** action.
2. The modal reads the authenticated user's persisted Privy Fuji wallet and live AVAX/USDC balances.
3. When the reviewed distributor is enabled, the user can explicitly request the fixed `0.005 AVAX` drip without leaving the chat.
4. While the distributor is disabled, Carmelita keeps the bridge context open and launches Chainlink's Fuji faucet in a named, size-bounded browser popup. The user accepts the faucet's own terms and wallet connection there.
5. **Check balance** re-reads Fuji RPC and shows when the bridge gas blocker is resolved.

The external faucet cannot be safely embedded in an iframe: wallet providers, CSP and anti-clickjacking controls are expected to block or isolate it. The popup fallback never receives the user's Privy key, and Carmelita never accepts external terms on the user's behalf.

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
