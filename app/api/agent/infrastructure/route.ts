import { NextResponse } from "next/server";
import { getChannelsReadiness } from "@/app/infrastructure/openzeppelin-channels";
import { discoverMppRouterServices } from "@/app/infrastructure/mpp-router";
import { stellar8004Draft } from "@/app/infrastructure/stellar-8004";
import { getAgentPlannerReadiness } from "@/app/agent-planner";
import { getSoroswapHealth } from "@/app/connectors/soroswap";
import { getLangGraphReadiness } from "@/app/orchestration/readiness";

export async function GET() {
  const [catalog, soroswapHealth] = await Promise.all([
    discoverMppRouterServices(),
    getSoroswapHealth().catch(() => null),
  ]);

  return NextResponse.json({
    soroswap: {
      configured: Boolean(process.env.SOROSWAP_API_KEY?.trim()),
      network: "testnet",
      assets: ["XLM", "USDC"],
      quote: "live-read-only",
      execution: "privy-explicit-approval",
      apiReachable: soroswapHealth?.reachable ?? false,
      routeAvailable: soroswapHealth?.available ?? false,
      protocols: soroswapHealth?.protocols ?? [],
    },
    langchain: getAgentPlannerReadiness(),
    openzeppelin: getChannelsReadiness(),
    langgraph: getLangGraphReadiness(),
    mppRouter: {
      network: "mainnet",
      catalogAccess: "free",
      endpointBilling: "mixed-free-and-paid-live-prices",
      executionEnabled: false,
      catalogSource: catalog.source,
      services: catalog.services,
    },
    stellar8004: stellar8004Draft,
  });
}
