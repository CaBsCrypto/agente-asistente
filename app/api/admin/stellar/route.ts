import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminIdentity } from "@/app/admin/auth";
import {
  createPrivyStellarWallet,
  fundStellarTestnetWallet,
  getPrivyStellarReadiness,
  getStellarTestnetAccount,
  signAndVerifyStellarChallenge,
} from "@/app/privy-stellar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create_wallet"),
    label: z.string().trim().max(80).optional(),
  }),
  z.object({
    action: z.literal("fund_wallet"),
    address: z.string().trim().min(56).max(56),
  }),
  z.object({
    action: z.literal("refresh_account"),
    address: z.string().trim().min(56).max(56),
  }),
  z.object({
    action: z.literal("sign_challenge"),
    walletId: z.string().trim().min(1).max(180),
    address: z.string().trim().min(56).max(56),
  }),
]);

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  return !origin || !host || new URL(origin).host === host;
}

function safeError(error: unknown) {
  const message = error instanceof Error ? error.message : "unknown_error";
  if (message === "privy_not_configured") return message;
  if (message.startsWith("friendbot_failed:")) return message;
  if (message.startsWith("privy_request_failed:")) return message;
  return message.split(":")[0];
}

export async function GET() {
  const identity = await getAdminIdentity();
  if (!identity) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    { readiness: getPrivyStellarReadiness() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const identity = await getAdminIdentity();
  if (!identity) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }

  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    if (parsed.data.action === "create_wallet") {
      return NextResponse.json({
        wallet: await createPrivyStellarWallet(parsed.data.label),
      });
    }
    if (parsed.data.action === "fund_wallet") {
      return NextResponse.json({
        funding: await fundStellarTestnetWallet(parsed.data.address),
        account: await getStellarTestnetAccount(parsed.data.address),
      });
    }
    if (parsed.data.action === "refresh_account") {
      return NextResponse.json({
        account: await getStellarTestnetAccount(parsed.data.address),
      });
    }

    return NextResponse.json({
      proof: await signAndVerifyStellarChallenge(
        parsed.data.walletId,
        parsed.data.address,
      ),
    });
  } catch (error) {
    const code = safeError(error);
    const status = code === "privy_not_configured" ? 503 : 502;
    return NextResponse.json({ error: code }, { status });
  }
}
