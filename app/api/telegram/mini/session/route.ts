import { NextResponse } from "next/server";
import { validateTelegramInitData } from "@/app/telegram/init-data";
import { isTelegramLinked } from "@/app/telegram/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The Mini App posts window.Telegram.WebApp.initData here. We verify its HMAC with the
// bot token (server-side) and report who the verified Telegram user is + whether their
// chat is linked to a web account. No signing happens here yet — that is the Privy step.
export async function POST(request: Request) {
  const token = (process.env.TELEGRAM_BOT_TOKEN ?? "").trim();
  if (!token) {
    return NextResponse.json({ ok: false, error: "telegram_not_configured" }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as { initData?: unknown };
  const result = validateTelegramInitData(String(body.initData ?? ""), token);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.reason }, { status: 401 });
  }

  const telegramUserId = result.user ? String(result.user.id) : "";
  const linked = telegramUserId
    ? await isTelegramLinked(telegramUserId).catch(() => false)
    : false;

  return NextResponse.json(
    {
      ok: true,
      user: result.user ? { id: result.user.id, username: result.user.username } : null,
      linked,
      // Wallet signing is not wired yet; the Mini App shows a "coming soon" state.
      signing: { available: false },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
