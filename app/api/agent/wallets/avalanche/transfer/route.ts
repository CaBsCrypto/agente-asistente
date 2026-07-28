import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPrivyAccessToken } from "@/app/privy-stellar";
import {
  prepareFujiDemoTransfer,
  recordFujiDemoTransfer,
} from "@/app/wallets/avalanche-transfer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("prepare"),
    requestId: z.string().min(8).max(128),
    destination: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    amount: z.literal("0.001"),
    explicitUserConfirmation: z.literal(true),
  }),
  z.object({
    action: z.literal("record"),
    previewId: z.string().startsWith("fuji_send_"),
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
    const result = input.action === "prepare"
      ? await prepareFujiDemoTransfer({
          userId: claims.user_id,
          requestId: input.requestId,
          destination: input.destination,
          amount: input.amount,
        })
      : await recordFujiDemoTransfer({
          userId: claims.user_id,
          previewId: input.previewId,
          transactionHash: input.transactionHash,
        });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const code = error instanceof z.ZodError
      ? "invalid_fuji_transfer_request"
      : error instanceof Error
        ? error.message.split(":")[0]
        : "fuji_transfer_failed";
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

