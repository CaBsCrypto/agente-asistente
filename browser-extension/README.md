# agent-assistant Browser Bridge

This unpacked Chrome extension connects the agent page to explicitly allowed UNBLCK member tabs. It reads only visible booking state and never exports cookies, passwords, magic links, local storage, or browsing history.

## Install for the MVP

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose this `browser-extension` directory.
5. Open agent-assistant and an authenticated `https://www.unblck.cl/member/*` tab in the same Chrome profile.
6. In the agent chat, request UNBLCK and press **Verify browser session**.

## Current capability

- Detect an authenticated UNBLCK member tab.
- Read the visible hub credit count, month, booking policy, and enabled dates.
- Return timestamped evidence to the Connection Center.
- Never click a date or create a reservation.

Reservation execution remains intentionally disabled until an enabled date is observed and the final provider confirmation flow is documented.
