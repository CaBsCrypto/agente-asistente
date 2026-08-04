import { NextResponse } from "next/server";
import { createGatewayPlan } from "@/app/agent-gateway/service";
import {
  gatewayActor,
  gatewayError,
  gatewayHeaders,
} from "@/app/agent-gateway/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const actorId = await gatewayActor(request, "agent:plan");
    const result = await createGatewayPlan(actorId, await request.json());
    return NextResponse.json(result, {
      status: result.replayed ? 200 : 201,
      headers: gatewayHeaders(),
    });
  } catch (error) {
    return gatewayError(error);
  }
}

