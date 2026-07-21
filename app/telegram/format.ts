// Pure rendering helpers that turn an agent reply into a Telegram sendMessage payload.
// No network or database access here so this stays unit-testable.

export type AgentReplyAction = {
  label: string;
  message?: string;
  href?: string;
  popup?: { url?: string };
};

export type AgentReplyLike = {
  content: string;
  actions?: AgentReplyAction[];
};

export type TelegramButton =
  | { text: string; url: string }
  | { text: string; callback_data: string };

export type TelegramMessagePayload = {
  text: string;
  parse_mode: "HTML";
  reply_markup?: { inline_keyboard: TelegramButton[][] };
  disable_web_page_preview: true;
};

// Telegram HTML parse mode only needs &, <, > escaped in text nodes.
export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Convert the agent's lightweight markdown (**bold**) into Telegram HTML, escaping the rest.
export function toTelegramHtml(markdownish: string): string {
  const parts = markdownish.split(/\*\*/);
  return parts
    .map((segment, index) => {
      const safe = escapeHtml(segment);
      // Odd segments sit between a pair of ** markers → bold.
      return index % 2 === 1 ? `<b>${safe}</b>` : safe;
    })
    .join("");
}

const CALLBACK_DATA_MAX_BYTES = 64;

export function callbackDataFitsLimit(data: string): boolean {
  return Buffer.byteLength(data, "utf8") <= CALLBACK_DATA_MAX_BYTES;
}

// Telegram rejects messages over 4096 chars. Split on paragraph boundaries so we never
// cut a **bold** pair (our content keeps each bold span on a single line).
const TELEGRAM_TEXT_MAX = 4096;

export function splitForTelegram(text: string, max = TELEGRAM_TEXT_MAX): string[] {
  if (text.length <= max) return [text];
  const chunks: string[] = [];
  let current = "";
  for (const paragraph of text.split("\n\n")) {
    const block = current ? `\n\n${paragraph}` : paragraph;
    if (current && current.length + block.length > max) {
      chunks.push(current);
      current = "";
    }
    if (paragraph.length > max) {
      // Pathologically long single paragraph: hard-split it.
      if (current) { chunks.push(current); current = ""; }
      for (let i = 0; i < paragraph.length; i += max) chunks.push(paragraph.slice(i, i + max));
      continue;
    }
    current = current ? `${current}\n\n${paragraph}` : paragraph;
  }
  if (current) chunks.push(current);
  return chunks;
}

// Build the Telegram payload. `makeCallbackId` persists a message-triggering action and
// returns a SHORT opaque id to place in callback_data (the real message can exceed 64 bytes).
export function renderReply(
  reply: AgentReplyLike,
  makeCallbackId: (message: string) => string,
): TelegramMessagePayload {
  const rows: TelegramButton[][] = [];
  for (const action of reply.actions ?? []) {
    if (typeof action.message === "string" && action.message.length > 0) {
      const id = makeCallbackId(action.message);
      const callback_data = `a:${id}`;
      if (!callbackDataFitsLimit(callback_data)) {
        throw new Error("telegram_callback_id_too_long");
      }
      rows.push([{ text: action.label, callback_data }]);
    } else {
      const url = action.href ?? action.popup?.url;
      if (url) rows.push([{ text: action.label, url }]);
    }
  }
  const payload: TelegramMessagePayload = {
    text: toTelegramHtml(reply.content),
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };
  if (rows.length > 0) payload.reply_markup = { inline_keyboard: rows };
  return payload;
}

// Render a reply as one or more Telegram messages (long text is split). Only the LAST
// message carries the inline keyboard, so the buttons sit under the full reply.
export function renderReplyMessages(
  reply: AgentReplyLike,
  makeCallbackId: (message: string) => string,
): TelegramMessagePayload[] {
  const chunks = splitForTelegram(reply.content || "…");
  return chunks.map((chunk, index) =>
    renderReply(
      { content: chunk, actions: index === chunks.length - 1 ? reply.actions : [] },
      makeCallbackId,
    ),
  );
}
