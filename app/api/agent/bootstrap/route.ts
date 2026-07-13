import { NextResponse } from "next/server";
import {
  fundStellarTestnetWallet,
  getOrCreateUserStellarWallet,
  getPrivyStellarReadiness,
  getStellarTestnetAccount,
  verifyPrivyAccessToken,
} from "@/app/privy-stellar";

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
    const wallet = await getOrCreateUserStellarWallet(claims.user_id);
    let account = await getStellarTestnetAccount(wallet.address);
    let activation: "active" | "activated" | "pending" = account.exists
      ? "active"
      : "pending";

    if (!account.exists) {
      try {
        await fundStellarTestnetWallet(wallet.address);
        account = await getStellarTestnetAccount(wallet.address);
        activation = account.exists ? "activated" : "pending";
      } catch {
        activation = "pending";
      }
    }

    return NextResponse.json(
      {
        user: { id: claims.user_id },
        wallet,
        account,
        activation,
        readiness: getPrivyStellarReadiness(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const code =
      error instanceof Error ? error.message.split(":")[0] : "bootstrap_failed";
    const status = code === "privy_not_configured" ? 503 : 401;
    return NextResponse.json({ error: code }, { status });
  }
}
