import { discoverAvalancheX402 } from "../app/x402-avalanche/discovery";

const discovery = await discoverAvalancheX402();

if (!discovery.ready || !discovery.evidence) {
  console.error(JSON.stringify({
    status: "blocked",
    facilitator: discovery.facilitatorUrl,
    blockers: discovery.blockers,
  }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    status: "ready",
    facilitator: discovery.facilitatorUrl,
    provider: discovery.evidence.provider,
    network: discovery.evidence.network,
    chainId: discovery.evidence.chainId,
    token: discovery.evidence.tokenAddress,
    decimals: discovery.evidence.tokenDecimals,
    settlement: discovery.evidence.settlement,
    approveRequired: discovery.evidence.approveRequired,
    gasSponsored: discovery.evidence.gasSponsored,
    eip712Domain: discovery.evidence.eip712Domain,
  }, null, 2));
}
