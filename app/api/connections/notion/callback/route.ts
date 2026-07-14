import { NextResponse } from "next/server";
import { completeNotionOAuth } from "@/app/connectors/notion-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function agentRedirect(request: Request, status: string, error?: string) {
  const target = new URL("/agent", request.url);
  target.searchParams.set("connection", "notion");
  target.searchParams.set("status", status);
  if (error) target.searchParams.set("error", error);
  return NextResponse.redirect(target);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const providerError = url.searchParams.get("error");

  if (providerError) {
    return agentRedirect(request, "cancelled", providerError);
  }
  if (!code || !state) {
    return agentRedirect(request, "failed", "oauth_callback_incomplete");
  }

  try {
    await completeNotionOAuth(code, state);
    return agentRedirect(request, "connected");
  } catch (error) {
    const codeName =
      error instanceof Error ? error.message.split(":")[0] : "oauth_callback_failed";
    return agentRedirect(request, "failed", codeName);
  }
}