import { NextRequest, NextResponse } from "next/server";
import { backend, publicIntent } from "@/app/commerce-backend";
import { publicErrorCode } from "@/app/mcp/respond";

export const runtime = "nodejs";

export async function GET(r: NextRequest) {
  return NextResponse.json({
    mode: "demo",
    persistence: backend.mode(),
    offers: await backend.searchOffers(r.nextUrl.searchParams.get("query") ?? ""),
  });
}

// The demo console is unauthenticated, so the caller-supplied actorId is the
// only boundary between two people using the demo at the same time. It is
// required on every action for the same reason it is required on the MCP tools.
function requireActor(value: unknown) {
  if (typeof value !== "string" || !value || value.length > 128) {
    throw new Error("actor_required");
  }
  return value;
}

export async function POST(r: NextRequest) {
  try {
    const b = await r.json();
    const actorId = requireActor(b.actorId);
    switch (b.action) {
      case "create_intent": {
        const x = await backend.createIntent({ ...b, actorId });
        return NextResponse.json({
          ...x,
          intent: publicIntent(x.intent),
          persistence: backend.mode(),
        });
      }
      case "evaluate_policy":
        return NextResponse.json({
          intent: publicIntent(await backend.evaluatePolicy(b.intentId, actorId)),
        });
      case "authorize": {
        const x = await backend.authorize(
          b.intentId,
          actorId,
          b.explicitUserConfirmation === true,
        );
        const intent = "intent" in x ? x.intent : x;
        const token = "token" in x ? x.token : x.authorization?.token;
        return NextResponse.json({
          intent: publicIntent(intent),
          authorizationToken: token,
          warning: "DEMO ONLY",
        });
      }
      case "execute":
        return NextResponse.json({
          receipt: await backend.execute(b.intentId, actorId, b.authorizationToken),
        });
      case "get_receipt":
        return NextResponse.json({
          receipt: await backend.getReceipt(b.intentId, actorId),
        });
      default:
        return NextResponse.json({ error: "unknown_action" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: publicErrorCode(e) }, { status: 400 });
  }
}
