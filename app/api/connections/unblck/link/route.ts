import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getUnblckConnection,
  linkUnblckUser,
  unlinkUnblckUser,
} from "@/app/connectors/unblck-connection";
import { unblckChannelSchema } from "@/app/connectors/unblck";
import { verifyPrivyAccessToken } from "@/app/privy-stellar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const linkBodySchema = z.object({
  channel: unblckChannelSchema,
  channelUserId: z.string().trim().min(3).max(128),
  code: z.string().trim().min(6).max(32),
});

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

// Translate an internal error code into an HTTP status. Provider rejections
// (bad/expired code, credential problems) are the member's to resolve, so they
// return 4xx; missing server config returns 503; auth failures 401.
function statusFor(code: string) {
  if (code === "invalid_request") return 400;
  if (code === "unblck_400" || code === "unblck_link_required") return 422;
  if (code === "unblck_401" || code === "unblck_403") return 502;
  if (code === "unblck_timeout") return 504;
  if (
    code === "connector_encryption_not_configured" ||
    code === "database_not_configured" ||
    code === "unblck_api_disabled" ||
    code === "unblck_api_key_missing"
  ) {
    return 503;
  }
  if (code.startsWith("unblck_")) return 502;
  return 401;
}

function errorCode(error: unknown) {
  return error instanceof Error ? error.message.split(":")[0] : "unblck_link_failed";
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }
  try {
    const claims = await verifyPrivyAccessToken(bearerToken(request));
    const parsed = linkBodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    const { identity, linkedAt } = await linkUnblckUser(claims.user_id, parsed.data);
    return NextResponse.json(
      {
        ok: true,
        connection: {
          provider: "unblck",
          status: "active",
          channel: identity.channel,
          // Never echo the full messaging identity back to the client.
          channelUserIdLast4: identity.channelUserId.slice(-4),
          linkedAt,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
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
    await unlinkUnblckUser(claims.user_id);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const code = errorCode(error);
    return NextResponse.json({ error: code }, { status: statusFor(code) });
  }
}

export async function GET(request: Request) {
  try {
    const claims = await verifyPrivyAccessToken(bearerToken(request));
    const connection = await getUnblckConnection(claims.user_id);
    return NextResponse.json(
      {
        connected: true,
        connection: {
          provider: "unblck",
          status: "active",
          channel: connection.identity.channel,
          channelUserIdLast4: connection.identity.channelUserId.slice(-4),
          linkedAt: connection.linkedAt,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const code = errorCode(error);
    if (code === "unblck_link_required") {
      return NextResponse.json(
        { connected: false },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json({ error: code }, { status: statusFor(code) });
  }
}
