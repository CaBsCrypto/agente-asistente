import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPrivyAccessToken } from "@/app/privy-stellar";
import { evaluateUserAction } from "@/app/agent-memory-store";
import {
  preparePangolinSwap,
  recordPangolinSwap,
} from "@/app/wallets/pangolin-swap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("prepare"),
    requestId: z.string().min(8).max(128),
    amountInAtomic: z.string().regex(/^[0-9]+$/),
    explicitUserConfirmation: z.literal(true),
  }),
  z.object({
    action: z.literal("record"),
    previewId: z.string().startsWith("fuji_swap_"),
    transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  }),
]);

function bearerToken(request: Request) {
  const value = request.headers.get("authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }
  try {
    const claims = await verifyPrivyAccessToken(bearerToken(request));
    const input = requestSchema.parse(await request.json());
    if (input.action === "prepare") {
      const decision = await evaluateUserAction(claims.user_id, {
        actionType: "avalanche.pangolin_swap",
        network: "avalanche:fuji",
        asset: "AVAX",
        amount: Number(BigInt(input.amountInAtomic)) / 1e18,
        financial: true,
        irreversible: true,
      });
      if (!decision.allowed) {
        return NextResponse.json(
          { error: "fuji_swap_policy_blocked", decision },
          { status: 403, headers: { "Cache-Control": "no-store" } },
        );
      }
      const prepared = await preparePangolinSwap({
        userId: claims.user_id,
        requestId: input.requestId,
        amountInAtomic: input.amountInAtomic,
      });
      return NextResponse.json(prepared, {
        headers: { "Cache-Control": "no-store" },
      });
    }
    const result = await recordPangolinSwap({
      userId: claims.user_id,
      previewId: input.previewId,
      transactionHash: input.transactionHash,
    });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const code = error instanceof z.ZodError
      ? "invalid_fuji_swap_request"
      : error instanceof Error
        ? error.message.split(":")[0]
        : "fuji_swap_failed";
    const status = code === "invalid_origin" ? 403
      : code.includes("not_found") ? 404
        : code.includes("expired") || code.includes("consumed") || code.includes("reused")
          ? 409
          : code.startsWith("evm_rpc") ? 502
            : code === "database_not_configured" ? 503
              : code.startsWith("invalid_") || code.includes("must_be") || code.includes("mismatch")
                ? 400
                : 401;
    return NextResponse.json({ error: code }, { status });
  }
}
