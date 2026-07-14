import { NextResponse } from "next/server";
import { startNotionOAuth } from "@/app/connectors/notion-oauth";
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

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }

  try {
    const claims = await verifyPrivyAccessToken(bearerToken(request));
    const origin = new URL(request.url).origin;
    const result = await startNotionOAuth(claims.user_id, origin);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const code =
      error instanceof Error ? error.message.split(":")[0] : "oauth_start_failed";
    const status =
      code === "connector_encryption_not_configured" ||
      code === "database_not_configured"
        ? 503
        : code.startsWith("notion_")
          ? 502
          : 401;
    return NextResponse.json({ error: code }, { status });
  }
}