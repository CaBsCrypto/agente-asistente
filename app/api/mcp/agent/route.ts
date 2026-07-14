import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { getAgentConversation, sendAgentMessage } from "@/app/agent-chat-store";
import { getAgentMcpContext } from "@/app/mcp/agent-context";
import {
  authenticateMcp,
  requireMcpSubject,
  verifyAgentMcpToken,
} from "@/app/mcp/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const ok = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
});
const fail = (error: unknown) => ({
  isError: true,
  content: [
    {
      type: "text" as const,
      text: JSON.stringify({
        error: error instanceof Error ? error.message : "unknown_error",
      }),
    },
  ],
});

let handler: ReturnType<typeof createMcpHandler> | null = null;

function getHandler() {
  return (handler ??= createMcpHandler(
    (server) => {
      server.registerTool(
        "get_agent_context",
        {
          title: "Get personal agent context",
          description:
            "Read the authenticated user's profile, wallet metadata, connections and authority boundary.",
          annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
          },
        },
        async (extra) => {
          try {
            const userId = requireMcpSubject(
              extra.authInfo,
              "user",
              "userId",
              "agent:read",
            );
            return ok(await getAgentMcpContext(userId));
          } catch (error) {
            return fail(error);
          }
        },
      );

      server.registerTool(
        "get_agent_conversation",
        {
          title: "Get agent conversation",
          description:
            "Read the authenticated user's durable agent conversation.",
          annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
          },
        },
        async (extra) => {
          try {
            const userId = requireMcpSubject(
              extra.authInfo,
              "user",
              "userId",
              "agent:read",
            );
            return ok(await getAgentConversation(userId));
          } catch (error) {
            return fail(error);
          }
        },
      );

      server.registerTool(
        "send_agent_message",
        {
          title: "Send a message to the personal agent",
          description:
            "Use the authenticated user's agent and connected read-only tools. Payment signing is not exposed.",
          inputSchema: { message: z.string().trim().min(1).max(2000) },
          annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: false,
            openWorldHint: true,
          },
        },
        async ({ message }, extra) => {
          try {
            const userId = requireMcpSubject(
              extra.authInfo,
              "user",
              "userId",
              "agent:chat",
            );
            return ok(await sendAgentMessage(userId, message));
          } catch (error) {
            return fail(error);
          }
        },
      );
    },
    { serverInfo: { name: "agent-assistant-personal", version: "0.1.0" } },
    {
      basePath: "/api/mcp",
      maxDuration: 60,
      disableSse: true,
      verboseLogs: process.env.NODE_ENV !== "production",
    },
  ));
}

async function handle(request: Request) {
  return authenticateMcp(request, verifyAgentMcpToken, getHandler());
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
