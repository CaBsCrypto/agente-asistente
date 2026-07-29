// The MCP server for the personal-agent surface, kept out of the route file so
// tests can drive it directly. Nothing POSTed to any MCP route until now, which
// is exactly why both sibling routes shipped returning 404 on every valid
// authenticated request while the suite stayed green.
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { getAgentConversation, sendAgentMessage } from "@/app/agent-chat-store";
import { getAgentMcpContext } from "@/app/mcp/agent-context";
import { requireMcpSubject } from "@/app/mcp/auth";
import { fail, ok } from "@/app/mcp/respond";

export const AGENT_MCP_ENDPOINT = "/api/mcp/agent";

let handler: ReturnType<typeof createMcpHandler> | null = null;

export function getAgentMcpHandler() {
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
      // mcp-handler derives `${basePath}/mcp` when basePath is set, which
      // resolved to /api/mcp/mcp — a path no file serves, so the dispatcher
      // never matched and every authenticated request fell through to 404.
      // An explicit streamableHttpEndpoint is honoured verbatim.
      streamableHttpEndpoint: AGENT_MCP_ENDPOINT,
      maxDuration: 60,
      disableSse: true,
      verboseLogs: process.env.NODE_ENV !== "production",
    },
  ));
}
