export const stellar8004Draft = {
  status: "draft-not-registered",
  network: "unselected",
  identity: {
    name: "agent-assistant",
    description:
      "A policy-controlled personal agent that discovers services, prepares actions and uses a user-owned Stellar wallet.",
    website: "https://agente-asistente.vercel.app",
  },
  endpoints: {
    mcpDiscovery: "https://agente-asistente.vercel.app/.well-known/mcp.json",
    mcp: "https://agente-asistente.vercel.app/api/mcp",
  },
  capabilities: [
    "personal-context",
    "service-discovery",
    "policy-evaluation",
    "stellar-testnet-payments",
    "x402",
  ],
  payments: {
    x402: "testnet-validated",
    mpp: "discovery-only",
  },
} as const;
