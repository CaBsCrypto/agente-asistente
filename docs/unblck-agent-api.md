# UNBLCK Agent Hub API integration

Status: **Live** — the agent books and cancels real hub day-passes against the Agent Hub API, confirmed on UNBLCK's own member portal (QR access pass), with LangGraph approval and replay protection. Replies localized EN/ES.

Official contract: [Agent Hub Check-in API](https://github.com/blessedux/unblck_landing/blob/main/docs/agent-hub-checkin-api.md).

## Supported flow

1. The member generates a one-time Connect code at
   `https://www.unblck.cl/member/hub/connect`.
2. The member provides the code plus a real Telegram or WhatsApp identity.
3. Carmelita exchanges the code through `POST /channel-links`.
4. The channel identity is encrypted at rest and bound to the Privy user.
5. Credits, open days, passes and bookings are read through
   `GET /hub-checkins`.
6. Booking or cancellation creates an immutable LangGraph action.
7. The graph pauses at `awaiting_approval`.
8. A confirmation button sends the exact workflow id and SHA-256 action digest.
9. Only the authenticated user who prepared the action can resume it.
10. A completed workflow is immutable; repeating confirmation returns the same
    result and never executes the connector twice.

## Chat commands for acceptance

```text
Conecta UNBLCK código ABC123XY telegram 123456789
Muéstrame mis créditos, días disponibles y reservas en UNBLCK
Reserva UNBLCK para 2026-07-21
Cancela UNBLCK 2026-07-21
```

Dates are intentionally restricted to `YYYY-MM-DD` in the first acceptance
version. UNBLCK interprets dates in `America/Santiago`.

## Security boundary

- The partner API key is server-only and never enters chat metadata.
- Connect codes are sent once to UNBLCK and are not persisted.
- The linked channel identity is encrypted with `CONNECTOR_ENCRYPTION_KEY`.
- State reads do not require confirmation.
- Booking and cancellation always require a digest-bound approval.
- The client does not automatically retry a timed-out mutation because the
  provider outcome could be ambiguous.
- UNBLCK remains the source of truth for credits, availability and bookings.

## Current channel limitation

The official v1 contract accepts only `telegram` and `whatsapp`. Agent
Assistant must not invent a channel id from a Privy id. The web product can run
the pilot when the member provides a real linked channel identity; a native
web-only link requires UNBLCK to add a `web` or `agent-assistant` channel.

## Environment

```env
UNBLCK_API_ENABLED=true
UNBLCK_API_BASE_URL=https://www.unblck.cl/api/agent/v1
UNBLCK_AGENT_API_KEY=<server-only>
CONNECTOR_ENCRYPTION_KEY=<32-byte-base64-key>
```

## Acceptance criteria

- Link one unused Connect code.
- Read credits, tier, open days and current bookings.
- Prepare a future booking and prove no upstream mutation occurs before
  approval.
- Confirm once and retain the provider booking id as evidence.
- Repeat the confirmation and prove no second connector execution occurs.
- Cancel the same booking through a separately approved workflow.
- Refresh state and verify the cancellation at the provider.
