# Connection Center

The Connection Center keeps the agent chat open while a user authenticates with an external provider in a temporary browser window.

## Current UNBLCK flow

1. The user writes `Con?ctame con UNBLCK`.
2. The agent returns a structured popup action for `https://www.unblck.cl/login`.
3. The user reviews the provider and requested capabilities inside agent-assistant.
4. The official UNBLCK login opens in a small browser window.
5. The user completes the email magic link on the UNBLCK origin.
6. The user returns and confirms only that the member portal was visible.
7. The agent labels the browser session as claimed but unverified.

The last step does not mean that UNBLCK is connected, that the portal was inspected, or that a reservation exists.

## Security boundary

- UNBLCK credentials, cookies, and magic links remain on `unblck.cl`.
- agent-assistant does not request or store the UNBLCK password or session cookie.
- Cross-origin pages are never embedded in an iframe.
- Popup completion is not accepted as proof of authentication.
- Any future callback message must come from the agent-assistant origin and match the expected provider.
- Reservation creation must remain a separate, reviewable action with explicit confirmation.

## Connection states

| State | Meaning |
| --- | --- |
| Review | The user is reviewing the destination and requested capabilities. |
| Waiting | The official provider window is open. |
| Returned | The window closed or a trusted callback returned; authentication is still unverified. |
| Verified | Reserved for a future API, OAuth callback, partner MCP, or browser bridge that can produce evidence. |
| Executed | A separate provider action was submitted and its result was verified. |

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

## Next milestone: browser bridge

The bridge should inspect only the active provider tab after explicit user authorization. Its minimum evidence contract is:

- provider origin and authenticated page URL;
- timestamp and authenticated-session indicator;
- available slots or resources read from the page;
- proposed action payload;
- explicit user approval before the final click;
- outcome evidence returned by the provider.

Until that bridge or a partner API exists, UNBLCK is **Ready to test**, not **Live**.
