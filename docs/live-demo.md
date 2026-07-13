# Live action demo

The `/demo` route turns the commerce backend into a visible product proof.

## Demonstrated sequence

1. Select an agent-ready offer.
2. Create one durable intent with an idempotency key.
3. Evaluate the demo spend policy.
4. Record explicit user confirmation and issue a short-lived capability.
5. Execute once and create one receipt.
6. Repeat the same execution request and receive the original receipt with
   `replayed: true`.

## Real versus simulated

Real today:

- Postgres persistence when `DATABASE_URL` is configured.
- Unique idempotency key for commerce intents.
- One receipt per intent at the database layer.
- Hashed authorization capabilities and durable audit events.
- Separate settlement and fulfillment states.

Simulated today:

- Wallet authorization.
- Network settlement and transaction reference.
- Partner fulfillment confirmation.

## Definition of done for the next milestone

The DeFindex scenario should produce a user-signed Stellar testnet transaction
and link to its explorer record. Repeating the request must still return the
original receipt and transaction hash without submitting a second transaction.
