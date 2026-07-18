import { NextResponse } from "next/server";
import { getChannelsReadiness } from "@/app/infrastructure/openzeppelin-channels";
import { discoverMppRouterServices } from "@/app/infrastructure/mpp-router";
import { stellar8004Draft } from "@/app/infrastructure/stellar-8004";

export async function GET() {
  const catalog = await discoverMppRouterServices();

  return NextResponse.json({
    openzeppelin: getChannelsReadiness(),
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
