import { getAgentMcpHandler } from "@/app/mcp/agent-server";
import { authenticateMcp, verifyAgentMcpToken } from "@/app/mcp/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

async function handle(request: Request) {
  return authenticateMcp(request, verifyAgentMcpToken, getAgentMcpHandler());
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
