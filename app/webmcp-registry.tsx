"use client";

import { useEffect } from "react";
import {
  getBrowserModelContext,
  type WebMcpToolDefinition,
  type WebMcpToolResponse,
} from "@/app/webmcp-client";

function textResponse(value: unknown): WebMcpToolResponse {
  return { content: [{ type: "text", text: JSON.stringify(value) }] };
}

const commerceTools: WebMcpToolDefinition[] = [
  {
    name: "search_agent_offers",
    description: "Search services and products available to agents. This action is read-only.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "Search query" } },
    },
    execute: async (input) => textResponse(
      await fetch(`/api/commerce?query=${encodeURIComponent(String(input.query ?? ""))}`)
        .then((response) => response.json()),
    ),
  },
  {
    name: "prepare_commerce_intent",
    description: "Prepare a demo intent without moving funds. The user must review and authorize separately.",
    inputSchema: {
      type: "object",
      properties: { offerId: { type: "string" }, actorId: { type: "string" } },
      required: ["offerId", "actorId"],
    },
    execute: async (input) => textResponse(
      await fetch("/api/commerce", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "create_intent",
          offerId: input.offerId,
          actorId: input.actorId,
          idempotencyKey: crypto.randomUUID(),
        }),
      }).then((response) => response.json()),
    ),
  },
];

export default function WebMcpRegistry() {
  useEffect(() => {
    const context = getBrowserModelContext();
    if (!context?.registerTool) return;

    void Promise.all(commerceTools.map((tool) => context.registerTool?.(tool)));
    return () => {
      if (!context.unregisterTool) return;
      for (const tool of commerceTools) void context.unregisterTool(tool.name);
    };
  }, []);

  return null;
}
