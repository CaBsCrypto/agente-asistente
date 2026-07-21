import { NextResponse } from "next/server";
import { sendAgentMessage } from "@/app/agent-chat-store";
import { answerCallbackQuery, sendMessage } from "@/app/telegram/bot";
import { renderReply, type AgentReplyLike } from "@/app/telegram/format";
import {
  redeemLinkCode,
  resolveTelegramUser,
  storePendingAction,
  takePendingAction,
} from "@/app/telegram/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TgUser = { id: number; username?: string };
type TgChat = { id: number };
type TgUpdate = {
  message?: { text?: string; chat: TgChat; from?: TgUser };
  callback_query?: {
    id: string;
    data?: string;
    message?: { chat: TgChat };
    from: TgUser;
  };
};

function secretOk(request: Request): boolean {
  const expected = (process.env.TELEGRAM_WEBHOOK_SECRET ?? "").trim();
  const got = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  return expected.length > 0 && got === expected;
}

// sendAgentMessage returns the stored records; the user-facing reply lives on the assistant message.
function toReply(result: Awaited<ReturnType<typeof sendAgentMessage>>): AgentReplyLike {
  return {
    content: result.assistantMessage.content,
    actions: result.assistantMessage.actions,
  };
}

async function reply(chatId: number, telegramUserId: string, userId: string, r: AgentReplyLike) {
  const idByMessage = new Map<string, string>();
  for (const action of r.actions ?? []) {
    if (action.message && !idByMessage.has(action.message)) {
      idByMessage.set(
        action.message,
        await storePendingAction({ telegramUserId, userId, message: action.message }),
      );
    }
  }
  const payload = renderReply(r, (message) => idByMessage.get(message) ?? "");
  await sendMessage(chatId, payload);
}

async function linkWithCode(chatId: number, from: TgUser, code: string) {
  const telegramUserId = String(from.id);
  try {
    const { userId } = await redeemLinkCode({ telegramUserId, chatId, username: from.username, code });
    await reply(chatId, telegramUserId, userId, {
      content: "Listo — tu Telegram quedó **vinculado** a tu cuenta. Ahora compartimos wallet, memoria y conexiones.",
    });
  } catch {
    await reply(chatId, telegramUserId, `tg:${telegramUserId}`, {
      content: "Ese código es inválido o expiró. Genera uno nuevo en la app web e inténtalo de nuevo.",
    });
  }
}

async function handleText(chatId: number, from: TgUser, text: string) {
  const telegramUserId = String(from.id);
  const trimmed = text.trim();

  // /start optionally carries a deep-link payload (t.me/<bot>?start=CODE) → treat it as a link code.
  if (trimmed === "/start" || trimmed.toLowerCase().startsWith("/start ")) {
    const payload = trimmed.includes(" ") ? trimmed.slice(trimmed.indexOf(" ") + 1).trim() : "";
    if (payload) {
      await linkWithCode(chatId, from, payload);
      return;
    }
    const { linked } = await resolveTelegramUser({ telegramUserId, chatId, username: from.username });
    await reply(chatId, telegramUserId, `tg:${telegramUserId}`, {
      content: linked
        ? "Tu cuenta está vinculada. Escríbeme, por ejemplo: **estado UNBLCK**, **precio XLM** o **Reserva UNBLCK para 2026-07-24**."
        : "¡Hola! Soy tu agente. Ya puedes pedirme **precio XLM**, **estado UNBLCK** o reservar. Para compartir la wallet y memoria de tu cuenta web, genera un código en la app y envíame: **/link TUCODIGO**.",
    });
    return;
  }

  if (trimmed.toLowerCase().startsWith("/link ")) {
    await linkWithCode(chatId, from, trimmed.slice("/link ".length).trim());
    return;
  }

  const { userId } = await resolveTelegramUser({ telegramUserId, chatId, username: from.username });
  const result = await sendAgentMessage(userId, trimmed);
  await reply(chatId, telegramUserId, userId, toReply(result));
}

async function handleCallback(update: NonNullable<TgUpdate["callback_query"]>) {
  const chatId = update.message?.chat.id;
  const telegramUserId = String(update.from.id);
  const data = update.data ?? "";
  await answerCallbackQuery(update.id).catch(() => {});
  if (!chatId || !data.startsWith("a:")) return;
  const message = await takePendingAction({ telegramUserId, id: data.slice(2) });
  if (!message) {
    await reply(chatId, telegramUserId, `tg:${telegramUserId}`, {
      content: "Esa acción ya no está disponible. Vuelve a pedirla y te muestro el botón otra vez.",
    });
    return;
  }
  const { userId } = await resolveTelegramUser({ telegramUserId, chatId });
  const result = await sendAgentMessage(userId, message);
  await reply(chatId, telegramUserId, userId, toReply(result));
}

export async function POST(request: Request) {
  // Always answer 200 so Telegram does not retry; failures are logged, not surfaced.
  if (!secretOk(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  let update: TgUpdate;
  try {
    update = (await request.json()) as TgUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }
  try {
    if (update.callback_query) {
      await handleCallback(update.callback_query);
    } else if (update.message?.text && update.message.from) {
      await handleText(update.message.chat.id, update.message.from, update.message.text);
    }
  } catch (error) {
    console.error("[telegram] update failed:", error instanceof Error ? error.message : error);
  }
  return NextResponse.json({ ok: true });
}
