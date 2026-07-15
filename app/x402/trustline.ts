import {
  Asset,
  BASE_FEE,
  Horizon,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { isValidStellarAddress } from "@/app/privy-stellar";
import { X402_TESTNET_USDC } from "@/app/x402/assets";

export async function prepareX402UsdcTrustline(walletAddress: string) {
  if (!isValidStellarAddress(walletAddress)) throw new Error("invalid_stellar_address");
  const server = new Horizon.Server("https://horizon-testnet.stellar.org");
  const account = await server.loadAccount(walletAddress);
  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.changeTrust({
      asset: new Asset(X402_TESTNET_USDC.code, X402_TESTNET_USDC.issuer),
    }))
    .setTimeout(300)
    .build();
  return {
    xdr: transaction.toXDR(),
    transactionHash: transaction.hash().toString("hex"),
    expiresAt: new Date(Date.now() + 5 * 60_000),
    preview: {
      title: "Enable the official x402 Testnet USDC",
      description: "Create the exact Stellar trustline required by the official x402 demo. This does not move USDC.",
      network: "Stellar Testnet",
      wallet: walletAddress,
      asset: "USDC",
      amount: "0",
      destination: X402_TESTNET_USDC.issuer,
      invest: false,
      slippageBps: null,
    },
  };
}
