# Telegram bot

Expose the whole agent in Telegram. The agent brain is channel-agnostic —
`sendAgentMessage(userId, content)` returns the reply and the web `/agent` is just
one front-end over it — so Telegram is a **second front-end (an adapter)**, not a
rewrite.

## Product shape: chat-first + a thin signing Mini App

Two Telegram surfaces, working together:

- **Bot chat** — a normal Telegram conversation (text in, text + inline buttons out).
  This is the product: UNBLCK (state/book/cancel), CoinMarketCap prices, watchlist,
  wallet balance, Notion, Travala, memory, and account linking. **No wallet signing.**
- **Mini App** — our own web page running inside Telegram's webview. It appears **only
  to sign a wallet action** (x402, DeFindex), because Privy signs in a browser context
  that the chat does not have. The chat shows a button that opens the Mini App; Privy
  signs; the result returns to the chat. Non-custodial is preserved.

```
CHAT (the product)                MINI APP (thin, only for signing)
  estado UNBLCK   -> card+buttons     opened from a chat button
  precio XLM      -> price            Privy signs in the webview
  reserva UNBLCK  -> approve+confirm  returns result to the chat
  pagar 0.01 USDC -> [ Firmar ] ───────────────▶
```

## Delivery status

| Phase | Scope | Status |
| --- | --- | --- |
| PR 1/3 | Webhook adapter, inline-button rendering, identity, DB tables | Merged |
| PR 2/3 | Account linking (web link-code route, `/link`, `/start` deep link) | Merged |
| PR 3/3 | Wallet-signing via Telegram Mini App + Privy | Blocked on token + Privy config |

Everything except wallet signing is code-complete and inert until the bot is wired.

## Go-live checklist (owner)

### 1. Create the bot
1. In Telegram, open **@BotFather** → `/newbot` → follow the prompts.
2. Copy the **bot token** it gives you (looks like `123456:ABC-DEF...`).
3. Note the **bot username** (e.g. `@miagente_bot`).

> Never paste the token into a chat or commit it. Set it as an env var only.

### 2. Set environment variables (Vercel → Project → Settings → Environment Variables)
| Variable | Value | Notes |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | the BotFather token | Secret. Server only. |
| `TELEGRAM_WEBHOOK_SECRET` | any random string you invent | Secret. Telegram echoes it back so we can trust the webhook. |
| `TELEGRAM_BOT_USERNAME` | your bot username, no `@` | Optional; enables `t.me/<bot>?start=CODE` deep links. |

### 3. Run the database migration
The bridge added three tables (migration `0013`). Apply it against production Neon:

```bash
npm run db:migrate
```

### 4. Point Telegram at the webhook
Tell Telegram to deliver updates to our route, sending the secret header on every call:

```bash
curl -sS "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://agente-asistente.vercel.app/api/telegram/webhook",
    "secret_token": "<TELEGRAM_WEBHOOK_SECRET>",
    "allowed_updates": ["message", "callback_query"]
  }'
```

Verify:

```bash
curl -sS "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

### 5. Smoke test in Telegram
- `/start` → greeting.
- `precio XLM` → a price reply.
- `estado UNBLCK` → prompts to link (standalone Telegram user has no UNBLCK link yet).
- Link your web account: in the web app call `POST /api/connections/telegram/link`,
  then send the bot `/link <CODE>` (or open the deep link) → now Telegram shares your
  wallet, memory and connections.
- `Reserva UNBLCK para <fecha>` → an approval message with a **Confirmar reserva**
  button → tap → real booking. (UNBLCK needs no wallet signing.)

## Account linking

A Telegram chat is standalone by default (its own `tg:<id>` agent user). To share the
same wallet/memory/connections as a web account, the user links once:

1. Web (logged in): `POST /api/connections/telegram/link` → returns a one-time `code`
   (15-min TTL) and, when `TELEGRAM_BOT_USERNAME` is set, a `t.me/<bot>?start=<code>`
   deep link.
2. Telegram: `/link <code>` — or tap the deep link, which sends `/start <code>`.
3. `GET /api/connections/telegram/link` reports link status; `DELETE` unlinks.

The 64-byte `callback_data` limit is why button messages (e.g. a long `UNBLCK_CONFIRM`
token) are stored in `telegram_pending_actions` and referenced by a short id.

## Phase 3 — the signing Mini App (design)

When a chat action needs a signature, the bot sends a `web_app` inline button that
opens a Telegram Mini App (a page we serve). Requirements to build and test it:

- **Bot token** (to register/serve the Mini App and send `web_app` buttons).
- **Privy configured for Telegram** — enable Telegram login / Mini App context in the
  Privy dashboard so the SDK can authenticate inside the webview.
- The Mini App page reuses the existing signing flow (Privy Stellar hook) and the same
  server verification and durable receipts as the web app. It only signs; it prepares
  nothing new.

This phase is browser-signing inside Telegram and must be validated live, so it is not
built blind.

## Security notes

- The webhook rejects any request without a matching `X-Telegram-Bot-Api-Secret-Token`,
  so it is inert until `TELEGRAM_WEBHOOK_SECRET` is set.
- No agent logic changed; Telegram calls the same `sendAgentMessage` path with the same
  policy, approval gates and replay protection as the web app.
- Wallet signing never happens on the server — only in a browser/webview via Privy.
