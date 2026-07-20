import assert from "node:assert/strict";
import test from "node:test";
import {
  cancelUnblckHubCheckin,
  createUnblckHubCheckin,
  getUnblckHubState,
  linkUnblckChannel,
} from "../app/connectors/unblck";
import { createUnblckWorkflowConnector } from "../app/orchestration/connectors/unblck";
import { parseUnblckChatIntent, unblckConfirmationMessage } from "../app/unblck-chat";

function configured<T>(operation: () => Promise<T>) {
  const previous = {
    enabled: process.env.UNBLCK_API_ENABLED,
    key: process.env.UNBLCK_AGENT_API_KEY,
    base: process.env.UNBLCK_API_BASE_URL,
  };
  process.env.UNBLCK_API_ENABLED = "true";
  process.env.UNBLCK_AGENT_API_KEY = "test-secret";
  process.env.UNBLCK_API_BASE_URL = "https://www.unblck.cl/api/agent/v1";
  return operation().finally(() => {
    if (previous.enabled === undefined) delete process.env.UNBLCK_API_ENABLED;
    else process.env.UNBLCK_API_ENABLED = previous.enabled;
    if (previous.key === undefined) delete process.env.UNBLCK_AGENT_API_KEY;
    else process.env.UNBLCK_AGENT_API_KEY = previous.key;
    if (previous.base === undefined) delete process.env.UNBLCK_API_BASE_URL;
    else process.env.UNBLCK_API_BASE_URL = previous.base;
  });
}

test("links an UNBLCK channel using only the documented contract", async () => {
  await configured(async () => {
    let captured: { url?: string; init?: RequestInit } = {};
    const fetcher: typeof fetch = async (url, init) => {
      captured = { url: String(url), init };
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };
    await linkUnblckChannel({
      channel: "telegram",
      channelUserId: "123456789",
      code: "abc123xy",
    }, fetcher);
    assert.equal(captured.url, "https://www.unblck.cl/api/agent/v1/channel-links");
    assert.equal(new Headers(captured.init?.headers).get("Authorization"), "Bearer test-secret");
    assert.deepEqual(JSON.parse(String(captured.init?.body)), {
      channel: "telegram",
      channel_user_id: "123456789",
      code: "ABC123XY",
    });
  });
});

test("reads hub state with the linked channel headers", async () => {
  await configured(async () => {
    const fetcher: typeof fetch = async (_url, init) => {
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("X-Channel"), "whatsapp");
      assert.equal(headers.get("X-Channel-User-Id"), "+56912345678");
      return new Response(JSON.stringify({
        bookings: ["2026-07-21"],
        passes: [{ id: "pass-1", date: "2026-07-21" }],
        credits: { total: 3, used: 1, remaining: 2 },
        tier: "ambassador",
        open_days: [1, 2, 3, 4, 5],
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    };
    const state = await getUnblckHubState({
      channel: "whatsapp",
      channelUserId: "+56912345678",
    }, fetcher);
    assert.equal(state.credits.remaining, 2);
    assert.deepEqual(state.bookings, ["2026-07-21"]);
  });
});

test("uses the documented booking and cancellation routes", async () => {
  await configured(async () => {
    const calls: Array<{ url: string; method?: string }> = [];
    const fetcher: typeof fetch = async (url, init) => {
      calls.push({ url: String(url), method: init?.method });
      const booking = init?.method === "POST";
      return new Response(JSON.stringify(
        booking ? { ok: true, booking_id: "booking-1" } : { ok: true },
      ), { status: 200, headers: { "Content-Type": "application/json" } });
    };
    const identity = { channel: "telegram" as const, channelUserId: "123456789" };
    await createUnblckHubCheckin(identity, "2026-07-21", fetcher);
    await cancelUnblckHubCheckin(identity, "2026-07-21", fetcher);
    assert.deepEqual(calls, [
      { url: "https://www.unblck.cl/api/agent/v1/hub-checkins", method: "POST" },
      { url: "https://www.unblck.cl/api/agent/v1/hub-checkins/2026-07-21", method: "DELETE" },
    ]);
  });
});

test("parses link, state, mutation and bound confirmation commands", () => {
  assert.deepEqual(
    parseUnblckChatIntent("Conecta UNBLCK código ABC123XY telegram 123456789"),
    { operation: "link", channel: "telegram", channelUserId: "123456789", code: "ABC123XY" },
  );
  assert.deepEqual(parseUnblckChatIntent("Muéstrame mis créditos UNBLCK"), { operation: "state" });
  assert.deepEqual(parseUnblckChatIntent("Reserva UNBLCK para 2026-07-21"), {
    operation: "book",
    bookingDate: "2026-07-21",
  });
  assert.deepEqual(parseUnblckChatIntent("Cancela UNBLCK 2026-07-21"), {
    operation: "cancel",
    bookingDate: "2026-07-21",
  });
  const workflowId = "wf_unblck_" + "a".repeat(32);
  const digest = "b".repeat(64);
  const command = unblckConfirmationMessage(workflowId, digest);
  assert.deepEqual(parseUnblckChatIntent(command), {
    operation: "confirm",
    workflowId,
    actionDigest: digest,
  });
});

test("UNBLCK workflow prepares immutable writes and verifies provider evidence", async () => {
  const connector = createUnblckWorkflowConnector();
  const context = {
    workflowId: "wf-test",
    userId: "user-1",
    conversationId: "conversation-1",
    request: "book",
    parameters: { bookingDate: "2026-07-21" },
  };
  const prepared = await connector.prepare(context, "hub.book");
  assert.equal(prepared.operation, "write");
  assert.equal(prepared.immutable.bookingDate, "2026-07-21");
  const evidence = await connector.verify(context, {
    kind: "booking",
    ok: true,
    booking_id: "booking-1",
    bookingDate: "2026-07-21",
  });
  assert.equal(evidence[0].verified, true);
});
