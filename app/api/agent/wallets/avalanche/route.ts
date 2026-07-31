import { NextResponse } from "next/server";
import { listPersistedUserWallets } from "@/app/multichain-account";
import { verifyPrivyAccessToken } from "@/app/privy-stellar";
import { diagnoseEvmWallet, getErc20Balance } from "@/app/wallets/evm-rpc";
import { getWalletNetwork } from "@/app/wallets/networks";
import {
  FUJI_DISTRIBUTION_AMOUNT,
  fujiClaimWindow,
  getFujiDistributorConfig,
} from "@/app/wallets/avalanche-policy";
import { AVALANCHE_X402 } from "@/app/x402-avalanche/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
}

export async function GET(request: Request) {
  try {
    const claims = await verifyPrivyAccessToken(bearerToken(request));
    const wallets = await listPersistedUserWallets(claims.user_id);
    const wallet = wallets.find(
      (candidate) =>
        candidate.chainType === "ethereum" &&
        candidate.network === "avalanche:fuji" &&
        candidate.status === "active",
    );
    if (!wallet) {
      return NextResponse.json(
        { error: "avalanche_not_activated", next: "activate_avalanche_fuji" },
        { status: 409 },
      );
    }
    const network = getWalletNetwork("avalanche:fuji");
    const distributor = getFujiDistributorConfig();
    const [diagnostics, usdc] = await Promise.all([
      diagnoseEvmWallet(network, wallet.address),
      getErc20Balance(
        network,
        AVALANCHE_X402.asset.address,
        wallet.address,
        AVALANCHE_X402.asset.decimals,
      ),
    ]);
    return NextResponse.json({
      ...diagnostics,
      balances: {
        native: { asset: diagnostics.nativeAsset, balance: diagnostics.balance },
        usdc: {
          asset: AVALANCHE_X402.asset.symbol,
          balance: usdc.balance,
          contract: AVALANCHE_X402.asset.address,
        },
      },
      faucetUrl: "https://faucets.chain.link/fuji",
      funding: {
        automaticEnabled: distributor.enabled,
        automaticReason: distributor.enabled ? null : distributor.reason,
        amount: FUJI_DISTRIBUTION_AMOUNT,
        claimWindow: fujiClaimWindow(),
        primaryFaucetUrl: "https://faucets.chain.link/fuji",
        officialFaucetUrl: "https://core.app/tools/testnet-faucet",
        network: "avalanche:fuji",
      },
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const code = error instanceof Error
      ? error.message.split(":")[0]
      : "avalanche_diagnostics_failed";
    const status = code === "database_not_configured" ? 503
      : code.startsWith("evm_rpc") ? 502
        : 401;
    return NextResponse.json({ error: code }, { status });
  }
}
