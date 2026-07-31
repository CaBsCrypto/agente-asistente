import { z } from "zod";

export const walletFamilySchema = z.enum(["stellar", "evm", "solana"]);
export type WalletFamily = z.infer<typeof walletFamilySchema>;

export const privyChainTypeSchema = z.enum(["stellar", "ethereum", "solana"]);
export type PrivyChainType = z.infer<typeof privyChainTypeSchema>;

export const walletNetworkIdSchema = z.enum([
  "stellar:testnet",
  "base:sepolia",
  "solana:devnet",
  "avalanche:fuji",
  "bnb:testnet",
]);
export type WalletNetworkId = z.infer<typeof walletNetworkIdSchema>;

export type UserWallet = {
  id: string;
  address: string;
  family: WalletFamily;
  chainType: PrivyChainType;
  created: boolean;
  owner: "user";
};

export const PRIVY_CHAIN_TYPE_BY_FAMILY: Record<WalletFamily, PrivyChainType> = {
  stellar: "stellar",
  evm: "ethereum",
  solana: "solana",
};

export function familyForPrivyChainType(chainType: PrivyChainType): WalletFamily {
  if (chainType === "ethereum") return "evm";
  return chainType;
}
