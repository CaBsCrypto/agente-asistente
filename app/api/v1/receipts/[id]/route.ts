import { NextResponse } from "next/server";
import { readGatewayReceipt } from "@/app/agent-gateway/service";
import {
  gatewayActor,
  gatewayError,
  gatewayHeaders,
} from "@/app/agent-gateway/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actorId = await gatewayActor(request, "agent:read");
    const { id } = await context.params;
    const result = await readGatewayReceipt(actorId, id);
    return NextResponse.json(result, {
      status: result.available ? 200 : 202,
      headers: gatewayHeaders(),
    });
  } catch (error) {
    return gatewayError(error);
  }
}
