import { NextResponse } from "next/server";
import { listPersistedUserWallets } from "@/app/multichain-account";
import { verifyPrivyAccessToken } from "@/app/privy-stellar";
import { diagnoseEvmWallet } from "@/app/wallets/evm-rpc";
import { getWalletNetwork } from "@/app/wallets/networks";

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
    const wallets = await listPersistedUserWallets(claims.user_id);
    const wallet = wallets.find(
      (candidate) =>
        candidate.chainType === "ethereum" &&
        candidate.network === "avalanche:fuji" &&
        candidate.status === "active",
    );
    if (!wallet) {
      return NextResponse.json(
        { error: "avalanche_not_activated", next: "activate_avalanche_fuji" },
        { status: 409 },
      );
    }
    const diagnostics = await diagnoseEvmWallet(
      getWalletNetwork("avalanche:fuji"),
      wallet.address,
    );
    return NextResponse.json(diagnostics, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const code = error instanceof Error
      ? error.message.split(":")[0]
      : "avalanche_diagnostics_failed";
    const status = code === "database_not_configured" ? 503
      : code.startsWith("evm_rpc") ? 502
        : 401;
    return NextResponse.json({ error: code }, { status });
  }
}
