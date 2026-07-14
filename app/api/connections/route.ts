import { NextResponse } from "next/server";
import { listUserConnections } from "@/app/connectors/notion-oauth";
import { verifyPrivyAccessToken } from "@/app/privy-stellar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
}

export async function GET(request: Request) {
  try {
    const claims = await verifyPrivyAccessToken(bearerToken(request));
    const connections = await listUserConnections(claims.user_id);
    return NextResponse.json(
      { connections },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const code =
      error instanceof Error ? error.message.split(":")[0] : "connections_failed";
    return NextResponse.json({ error: code }, { status: 401 });
  }
}