# Founder admin operations

The private workspace lives at `/admin`. It is server-protected and must never
be linked from the public navigation.

## What the dashboard covers

- Real waitlist demand, excluding records with `source = codex-smoke`.
- Recent signup velocity for YC reporting.
- Pipeline stages: waiting, contacted, interviewed, pilot, accepted and declined.
- Founder priority, owner, tags and internal notes.
- CSV export for analysis and accelerator applications.
- An activity record for every lead update.

## Access model

Production uses a password hash and a signed, HTTP-only 12-hour session cookie.
The password itself is never stored. Required variables:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_SESSION_SECRET`

Sites/ChatGPT deployments may additionally use `ADMIN_EMAILS` as a
comma-separated allowlist for authenticated workspace users.

## Operating rhythm

1. Review new `waiting` records daily.
2. Mark the strongest problems as high priority.
3. Move a lead to `contacted` when outreach begins.
4. Record interview evidence in internal notes.
5. Move validated design partners to `pilot`.
6. Export CSV before each YC application update.

## Security rules

- Do not expose admin APIs in public navigation or client-side secrets.
- Never commit local environment files.
- Rotate the founder password if it is shared or lost.
- Use notes for business context, not payment credentials or sensitive identity
  documents.


## MCP service providers

- Open `/admin/providers` to create a provider identity and its first scoped MCP key.
- Copy the raw key immediately; the application stores only its SHA-256 hash.
- Deliver pilot keys through a secure channel, never email or chat history.
- Provider token rotation and revocation controls are the next operational milestone.
