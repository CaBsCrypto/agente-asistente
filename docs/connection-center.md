# Connection Center and Browser Bridge

> **Update ? July 20, 2026:** UNBLCK now exposes an official Agent Hub API.
> The preferred route is Connect code plus Telegram/WhatsApp identity, followed
> by LangGraph-governed reads and approved mutations. See
> [UNBLCK Agent API integration](unblck-agent-api.md). The Browser Bridge below
> remains a read-only fallback and is no longer the primary integration path.


The Connection Center keeps the agent chat open while a user authenticates with an external provider. OAuth, a public API, or MCP remain preferred; the Browser Bridge is the fallback for providers such as UNBLCK that currently expose only a signed-in web experience.

## Current UNBLCK flow

1. The user asks the agent to connect to UNBLCK in English, Spanish, or Portuguese.
2. The agent returns a structured popup action for `https://www.unblck.cl/login`.
3. The user reviews the provider and requested capabilities inside agent-assistant.
4. The official UNBLCK login opens in a small browser window.
5. The user completes the email magic link on the UNBLCK origin.
6. The Browser Bridge finds an authenticated `https://www.unblck.cl/member/*` tab in the same Chrome profile.
7. After **Verify browser session**, it returns limited read-only evidence: credits, calendar month, enabled dates, policy, URL, and timestamp.
8. The agent labels the local browser session as verified.

This proves only what was visible in the authenticated tab at that moment. It does not create a reservation.

Install it from `browser-extension`: open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select that folder. Keep the agent and UNBLCK open in the same Chrome profile.

## Security boundary

- UNBLCK credentials, cookies, and magic links remain on `unblck.cl`.
- agent-assistant does not request or store the UNBLCK password or session cookie.
- Cross-origin pages are never embedded in an iframe.
- Popup completion is not accepted as proof of authentication.
- The extension is restricted to the production agent origin, local development, and `www.unblck.cl`.
- It requests `tabs`, but not cookies, passwords, storage, or browsing history.
- Browser evidence is local and ephemeral; it is not a cryptographic provider attestation or a durable connection.
- The bridge implements no reservation click, payment, or other mutation.
- Reservation creation must remain a separate, reviewable action with explicit confirmation.

## Connection states

| State | Meaning |
| --- | --- |
| Review | The user is reviewing the destination and requested capabilities. |
| Waiting | The official provider window is open. |
| Returned | The window closed or a trusted callback returned; authentication is still unverified. |
| Verified | The Browser Bridge returned current read-only evidence from an authenticated member page. |
| Executed | Reserved for a separate confirmed mutation with outcome evidence. Not implemented for UNBLCK. |

## Provider adapter contract

A chat action can request the Connection Center with:

```ts
{
  label: "Connect UNBLCK",
  popup: {
    provider: "unblck",
    url: "https://www.unblck.cl/login",
    completionMessage: "I signed in to UNBLCK",
    permissions: [
      "Open the official member login",
      "Keep the provider session in the browser",
      "Prepare a reservation only after review"
    ]
  }
}
```

The same contract can support other providers that require a browser session. Prefer OAuth, a public API, or MCP whenever the provider offers one.

## Next milestone: confirmed reservation

The bridge now inspects only an authenticated provider tab after explicit user authorization. Before enabling a mutation, the adapter must discover at least one enabled slot and capture:

- resource and enabled-slot evidence;
- date, time, price, credits, and cancellation policy;
- proposed action payload;
- explicit approval immediately before the final click;
- duplicate protection for retries;
- outcome evidence returned by the provider.

Until those controls pass a real acceptance test, UNBLCK is **Browser verification ready**, not **Booking live**.
