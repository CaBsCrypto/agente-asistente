import { ChannelsClient } from "@openzeppelin/relayer-plugin-channels";

export const OPENZEPPELIN_CHANNELS_TESTNET_URL =
  "https://channels.openzeppelin.com/testnet";

export type ChannelsReadiness = {
  provider: "OpenZeppelin Stellar Channels";
  network: "testnet";
  configured: boolean;
  submissionEnabled: boolean;
  custody: false;
  userSignatureRequired: true;
  role: "fee-sponsor-and-submit";
};

export function getChannelsReadiness(): ChannelsReadiness {
  const configured = Boolean(
    process.env.OPENZEPPELIN_CHANNELS_TESTNET_API_KEY?.trim(),
  );

  return {
    provider: "OpenZeppelin Stellar Channels",
    network: "testnet",
    configured,
    submissionEnabled: configured,
    custody: false,
    userSignatureRequired: true,
    role: "fee-sponsor-and-submit",
  };
}

export function createTestnetChannelsClient() {
  const apiKey = process.env.OPENZEPPELIN_CHANNELS_TESTNET_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("openzeppelin_channels_not_configured");
  }

  return new ChannelsClient({
    baseUrl: OPENZEPPELIN_CHANNELS_TESTNET_URL,
    apiKey,
    timeout: 30_000,
  });
}

export async function submitUserSignedTestnetXdr(xdr: string) {
  if (!xdr.trim()) throw new Error("signed_xdr_required");
  return createTestnetChannelsClient().submitTransaction({ xdr });
}
