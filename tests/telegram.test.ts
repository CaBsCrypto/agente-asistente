import assert from "node:assert/strict";
import test from "node:test";
import {
  callbackDataFitsLimit,
  escapeHtml,
  renderReply,
  toTelegramHtml,
} from "../app/telegram/format";

test("escapes HTML-sensitive characters for Telegram", () => {
  assert.equal(escapeHtml("a < b & c > d"), "a &lt; b &amp; c &gt; d");
});

test("converts **bold** markers into Telegram <b> while escaping the rest", () => {
  assert.equal(
    toTelegramHtml("UNBLCK confirmó la reserva para el **2026-07-23** <ok>"),
    "UNBLCK confirmó la reserva para el <b>2026-07-23</b> &lt;ok&gt;",
  );
});

test("maps message actions to short callback ids and links to url buttons", () => {
  const payload = renderReply(
    {
      content: "Revisa la reserva para el **2026-07-23**.",
      actions: [
        { label: "Confirmar reserva", message: "UNBLCK_CONFIRM " + "w".repeat(40) + " " + "d".repeat(64) + " es" },
        { label: "Abrir hub", popup: { url: "https://www.unblck.cl/member/hub" } },
      ],
    },
    () => "abc123",
  );
  assert.equal(payload.parse_mode, "HTML");
  const rows = payload.reply_markup?.inline_keyboard ?? [];
  assert.deepEqual(rows[0], [{ text: "Confirmar reserva", callback_data: "a:abc123" }]);
  assert.deepEqual(rows[1], [{ text: "Abrir hub", url: "https://www.unblck.cl/member/hub" }]);
});

test("callback_data stays within Telegram's 64-byte limit even for long confirm tokens", () => {
  // The real UNBLCK_CONFIRM token is >100 chars; the short id keeps callback_data tiny.
  const shortId = "0123456789abcdef";
  assert.ok(callbackDataFitsLimit(`a:${shortId}`));
  const rawToken = "UNBLCK_CONFIRM " + "w".repeat(40) + " " + "d".repeat(64) + " es";
  assert.ok(!callbackDataFitsLimit(rawToken), "raw token must exceed the limit (why we need pending actions)");
});

test("a reply with no actions produces no keyboard", () => {
  const payload = renderReply({ content: "Precio XLM: **0.12 USD**" }, () => "x");
  assert.equal(payload.reply_markup, undefined);
  assert.equal(payload.text, "Precio XLM: <b>0.12 USD</b>");
});
