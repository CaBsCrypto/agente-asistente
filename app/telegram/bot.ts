// Thin Telegram Bot API client. Only the calls the webhook needs.
import type { TelegramMessagePayload } from "@/app/telegram/format";

function botToken(): string {
  const token = (process.env.TELEGRAM_BOT_TOKEN ?? "").trim();
  if (!token) throw new Error("telegram_bot_token_missing");
  return token;
}

async function callTelegram(
  method: string,
  body: Record<string, unknown>,
  fetcher: typeof fetch = fetch,
): Promise<unknown> {
  const response = await fetcher(
    `https://api.telegram.org/bot${botToken()}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const data = (await response.json()) as { ok: boolean; description?: string };
  if (!data.ok) {
    throw new Error(`telegram_api_error:${method}:${data.description ?? response.status}`);
  }
  return data;
}

export function sendMessage(
  chatId: string | number,
  payload: TelegramMessagePayload,
  fetcher?: typeof fetch,
): Promise<unknown> {
  return callTelegram("sendMessage", { chat_id: chatId, ...payload }, fetcher);
}

// Show a "typing…" indicator while the agent works. Best-effort; never throws.
export function sendTyping(chatId: string | number, fetcher?: typeof fetch): Promise<void> {
  return callTelegram("sendChatAction", { chat_id: chatId, action: "typing" }, fetcher)
    .then(() => undefined)
    .catch(() => undefined);
}

// Acknowledge a button tap so Telegram stops the loading spinner.
export function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
  fetcher?: typeof fetch,
): Promise<unknown> {
  return callTelegram(
    "answerCallbackQuery",
    { callback_query_id: callbackQueryId, ...(text ? { text } : {}) },
    fetcher,
  );
}
