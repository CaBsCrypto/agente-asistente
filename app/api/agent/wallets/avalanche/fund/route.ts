import { NextResponse } from "next/server";
import { z } from "zod";
import { listPersistedUserWallets } from "@/app/multichain-account";
import { verifyPrivyAccessToken } from "@/app/privy-stellar";
import { requestFujiDrip } from "@/app/wallets/avalanche-distributor";
import { getFujiDistributorConfig } from "@/app/wallets/avalanche-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  explicitUserConfirmation: z.literal(true),
}).strict();

function bearerToken(request: Request) {
  const value = request.headers.get("authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return true;
  try { return new URL(origin).host === host; } catch { return false; }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }
  try {
    const claims = await verifyPrivyAccessToken(bearerToken(request));
    const input = requestSchema.parse(await request.json());
    const config = getFujiDistributorConfig();
    if (!config.enabled) {
      return NextResponse.json(
        { error: config.reason, enabled: false },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    const wallets = await listPersistedUserWallets(claims.user_id);
    const wallet = wallets.find((candidate) =>
      candidate.chainType === "ethereum"
      && candidate.network === "avalanche:fuji"
      && candidate.status === "active");
    if (!wallet) {
      return NextResponse.json(
        { error: "avalanche_not_activated", next: "activate_avalanche_fuji" },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }

    const receipt = await requestFujiDrip({
      config,
      userId: claims.user_id,
      recipient: wallet.address,
      explicitUserConfirmation: input.explicitUserConfirmation,
    });
    return NextResponse.json(
      { ...receipt, amount: "0.005", asset: "AVAX", network: "avalanche:fuji" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const code = error instanceof z.ZodError
      ? "invalid_fuji_distributor_request"
      : error instanceof Error ? error.message.split(":")[0] : "fuji_distributor_failed";
    const status = code === "invalid_origin" ? 403
      : code.includes("transaction_pending") ? 425
        : code.includes("already_used") || code.includes("daily_limit") ? 409
          : code.includes("timeout") || code.includes("unreachable") || code.includes("rejected")
            || code.includes("transaction_failed") || code.includes("mismatch") ? 502
            : code === "database_not_configured" ? 503
              : code.startsWith("invalid_") || code.includes("confirmation") ? 400
                : 401;
    return NextResponse.json({ error: code }, {
      status,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
