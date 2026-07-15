import { NextResponse } from "next/server";
import { persistAgentAccount } from "@/app/agent-account";
import {
  PRIVY_WALLET_ARCHITECTURE,
  getOrCreateUserStellarWallet,
  getPrivyStellarReadiness,
  getPrivyUserIdentity,
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
    const account = await getStellarTestnetAccount(wallet.address);
    const activation: "active" | "pending" = account.exists
      ? "active"
      : "pending";

    const identity = await getPrivyUserIdentity(claims.user_id).catch(() => ({
      id: claims.user_id,
      email: null,
    }));
    const agentAccount = await persistAgentAccount({
      userId: claims.user_id,
      email: identity.email,
      wallet,
      activation,
    });

    return NextResponse.json(
      {
        user: { id: claims.user_id, email: identity.email },
        wallet,
        account,
        activation,
        ...agentAccount,
        readiness: getPrivyStellarReadiness(),
        walletArchitecture: PRIVY_WALLET_ARCHITECTURE,
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