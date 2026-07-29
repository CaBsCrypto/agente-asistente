import { authenticateMcp, verifyProviderMcpToken } from "@/app/mcp/auth";
import { getProviderMcpHandler } from "@/app/mcp/provider-server";

export const runtime = "nodejs";
export const maxDuration = 60;

async function handle(request: Request) {
  return authenticateMcp(request, verifyProviderMcpToken, getProviderMcpHandler());
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
