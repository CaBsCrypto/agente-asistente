import { NextResponse } from "next/server";

export function GET(request: Request) {
  const origin = new URL(request.url).origin;
  return NextResponse.json({
    name: "agent-assistant MCP gateway",
    description:
      "Bidirectional MCP gateway for personal agents, service providers and commerce orchestration.",
    transport: "streamable-http",
    surfaces: {
      sandbox: {
        endpoint: origin + "/api/mcp",
        authentication: "public sandbox",
        purpose:
          "Offer discovery, intent preparation, policy and duplicate-resistant demo receipts.",
      },
      personalAgent: {
        endpoint: origin + "/api/mcp/agent",
        authentication: "Privy access token bearer bridge",
        scopes: ["agent:read", "agent:chat"],
        purpose:
          "Use the authenticated user's agent, context and connected read-only tools.",
      },
      serviceProvider: {
        endpoint: origin + "/api/mcp/provider",
        authentication: "scoped provider bearer token",
        scopes: ["provider:read", "provider:offers:write"],
        purpose:
          "Create, update, publish, pause and archive provider-owned service offers.",
      },
    },
    outboundConnectors: {
      description:
        "The personal agent also consumes external MCP servers and APIs after user consent.",
      current: ["Notion MCP", "Travala MCP", "CoinMarketCap API"],
    },
    security: {
      custody: false,
      payments: {
        commerceSandbox: "simulated",
        x402StellarTestnet: "explicit-user-approval",
        mainnet: "disabled",
      },
      providerTokens: "SHA-256 hashes at rest; raw token returned once",
      oauth: "MCP OAuth 2.1 discovery remains a production milestone",
    },
  });
}
