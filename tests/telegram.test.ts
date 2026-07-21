import assert from "node:assert/strict";
import test from "node:test";
import {
  callbackDataFitsLimit,
  escapeHtml,
  renderReply,
  renderReplyMessages,
  splitForTelegram,
  toTelegramHtml,
} from "../app/telegram/format";
import { newLinkCode } from "../app/telegram/identity";

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

test("short text is not split", () => {
  assert.deepEqual(splitForTelegram("hello"), ["hello"]);
});

test("long text splits on paragraph boundaries and stays under the limit", () => {
  const paragraph = "x".repeat(3000);
  const chunks = splitForTelegram(`${paragraph}\n\n${paragraph}`, 4096);
  assert.equal(chunks.length, 2);
  for (const chunk of chunks) assert.ok(chunk.length <= 4096);
  assert.equal(chunks[0], paragraph);
});

test("a single over-long paragraph is hard-split", () => {
  const chunks = splitForTelegram("y".repeat(9000), 4096);
  assert.equal(chunks.length, 3);
  for (const chunk of chunks) assert.ok(chunk.length <= 4096);
});

test("renderReplyMessages puts the keyboard only on the last message", () => {
  const long = "p".repeat(3000);
  const messages = renderReplyMessages(
    { content: `${long}\n\n${long}`, actions: [{ label: "Ver hub", href: "https://x.test" }] },
    () => "id",
  );
  assert.equal(messages.length, 2);
  assert.equal(messages[0].reply_markup, undefined);
  assert.deepEqual(messages[1].reply_markup?.inline_keyboard, [[{ text: "Ver hub", url: "https://x.test" }]]);
});

test("link codes are 8 chars from an unambiguous alphabet", () => {
  const code = newLinkCode(Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7]));
  assert.equal(code, "ABCDEFGH");
  assert.equal(code.length, 8);
  // No ambiguous glyphs anywhere in the alphabet.
  for (let i = 0; i < 256; i++) {
    assert.doesNotMatch(newLinkCode(Uint8Array.from([i])), /[01OI]/);
  }
});
