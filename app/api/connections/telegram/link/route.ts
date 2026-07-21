import { NextResponse } from "next/server";
import {
  generateTelegramLinkCode,
  getTelegramLink,
  unlinkTelegramUser,
} from "@/app/telegram/identity";
import { verifyPrivyAccessToken } from "@/app/privy-stellar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  return !origin || !host || new URL(origin).host === host;
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
}

function botDeepLink(code: string): string | undefined {
  const username = (process.env.TELEGRAM_BOT_USERNAME ?? "").trim().replace(/^@/, "");
  return username ? `https://t.me/${username}?start=${code}` : undefined;
}

function errorCode(error: unknown) {
  return error instanceof Error ? error.message.split(":")[0] : "telegram_link_failed";
}

function statusFor(code: string) {
  if (code === "database_not_configured") return 503;
  return 401;
}

// Mint a one-time code the user pastes into the bot (/link CODE) or opens via the deep link.
export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }
  try {
    const claims = await verifyPrivyAccessToken(bearerToken(request));
    const { code, expiresAt } = await generateTelegramLinkCode(claims.user_id);
    return NextResponse.json(
      {
        ok: true,
        code,
        expiresAt: expiresAt.toISOString(),
        instructions: `Send this to the bot: /link ${code}`,
        deepLink: botDeepLink(code),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const code = errorCode(error);
    return NextResponse.json({ error: code }, { status: statusFor(code) });
  }
}

export async function GET(request: Request) {
  try {
    const claims = await verifyPrivyAccessToken(bearerToken(request));
    const link = await getTelegramLink(claims.user_id);
    return NextResponse.json(link, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const code = errorCode(error);
    return NextResponse.json({ error: code }, { status: statusFor(code) });
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }
  try {
    const claims = await verifyPrivyAccessToken(bearerToken(request));
    await unlinkTelegramUser(claims.user_id);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const code = errorCode(error);
    return NextResponse.json({ error: code }, { status: statusFor(code) });
  }
}
