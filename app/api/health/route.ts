import { NextResponse } from "next/server";
import { backend } from "@/app/commerce-backend";

export function GET() {
  return NextResponse.json({
    service: "agente-asistente",
    status: "ok",
    environment: "stellar-testnet",
    persistence: backend.mode(),
    custody: {
      userFunds: false,
      testnetDistributor: true,
    },
    payments: {
      commerceSandbox: "simulated",
      x402StellarTestnet: "enabled",
      mainnet: "disabled",
    },
    mcp: "/api/mcp",
    timestamp: new Date().toISOString(),
  });
}
