import assert from "node:assert/strict";
import test from "node:test";
import {
  BROWSER_BRIDGE_EXTENSION_SOURCE,
  BROWSER_BRIDGE_VERSION,
  browserBridgeRequest,
  parseBrowserBridgeEvent,
} from "../app/browser-bridge";

test("accepts a bounded read-only UNBLCK bridge response", () => {
  const event = parseBrowserBridgeEvent({
    source: BROWSER_BRIDGE_EXTENSION_SOURCE,
    version: BROWSER_BRIDGE_VERSION,
    type: "BRIDGE_RESPONSE",
    requestId: "req-1",
    ok: true,
    data: {
      provider: "unblck",
      authenticated: true,
      pageUrl: "https://www.unblck.cl/member/hub",
      observedAt: "2026-07-18T00:00:00.000Z",
      hub: {
        creditsRemaining: 3,
        creditsTotal: 3,
        month: "julio de 2026",
        bookingPolicy: "Lun-vie",
        enabledDates: [],
        disabledDateCount: 31,
      },
    },
  });

  assert.equal(event?.type, "BRIDGE_RESPONSE");
  assert.equal(event?.ok, true);
  if (event?.type !== "BRIDGE_RESPONSE" || !event.data) assert.fail("missing evidence");
  assert.equal(event.data.hub.creditsRemaining, 3);
  assert.deepEqual(event.data.hub.enabledDates, []);
});

test("rejects spoofed or malformed bridge events", () => {
  assert.equal(parseBrowserBridgeEvent({
    source: "untrusted-page",
    version: BROWSER_BRIDGE_VERSION,
    type: "BRIDGE_HELLO",
    extensionVersion: "0.1.0",
  }), null);
  assert.equal(parseBrowserBridgeEvent({
    source: BROWSER_BRIDGE_EXTENSION_SOURCE,
    version: BROWSER_BRIDGE_VERSION,
    type: "BRIDGE_RESPONSE",
    requestId: "req-2",
    ok: true,
    data: { provider: "unblck", authenticated: true },
  }), null);
});

test("creates only the read-status bridge command", () => {
  assert.deepEqual(browserBridgeRequest("req-3"), {
    source: "agent-assistant",
    version: 1,
    type: "UNBLCK_READ_STATUS",
    requestId: "req-3",
  });
});
