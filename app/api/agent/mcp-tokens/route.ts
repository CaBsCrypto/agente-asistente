import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPrivyAccessToken } from "@/app/privy-stellar";
import { issuePersonalMcpToken, listPersonalMcpTokens, PERSONAL_MCP_SCOPES } from "@/app/services/personal-mcp-token-store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const createSchema = z.object({ name: z.string().trim().min(1).max(80).optional(), scopes: z.array(z.enum(PERSONAL_MCP_SCOPES)).min(1).optional(), expiresInDays: z.number().int().min(1).max(365).default(30) });
function sameOrigin(request: Request) { const origin = request.headers.get("origin"); const host = request.headers.get("host"); if (!origin || !host) return true; try { return new URL(origin).host === host; } catch { return false; } }
function bearerToken(request: Request) { const [scheme, token] = (request.headers.get("authorization") ?? "").split(" "); return scheme?.toLowerCase() === "bearer" ? token?.trim() ?? "" : ""; }
async function authenticatedUserId(request: Request) { if (!sameOrigin(request)) throw new Error("invalid_origin"); return (await verifyPrivyAccessToken(bearerToken(request))).user_id; }
function errorResponse(error: unknown) {
  const code = error instanceof z.ZodError ? "invalid_personal_mcp_token_request" : error instanceof Error ? error.message.split(":")[0] : "personal_mcp_token_request_failed";
  const status = code === "invalid_personal_mcp_token_request" || code === "personal_mcp_expiration_invalid" || code === "personal_mcp_scope_invalid" ? 400 : code === "personal_mcp_token_limit_reached" ? 409 : code === "invalid_origin" ? 403 : code === "database_not_configured" ? 503 : 401;
  return NextResponse.json({ error: code }, { status, headers: { "Cache-Control": "no-store" } });
}
export async function GET(request: Request) {
  try { const credentials = await listPersonalMcpTokens(await authenticatedUserId(request)); return NextResponse.json({ credentials }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    const userId = await authenticatedUserId(request); const input = createSchema.parse(await request.json());
    const expiresAt = new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000);
    const result = await issuePersonalMcpToken({ userId, name: input.name, scopes: input.scopes, expiresAt });
    return NextResponse.json(result, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
