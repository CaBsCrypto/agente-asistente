import {
  walletNetworkIdSchema,
  type WalletFamily,
  type WalletNetworkId,
} from "@/app/wallets/types";

export type WalletNetwork = {
  id: WalletNetworkId;
  family: WalletFamily;
  name: string;
  nativeAsset: string;
  testnet: true;
  rpcUrl: string;
  explorerUrl: string;
  chainId: number | null;
  rollout: "active" | "experimental" | "planned";
};

export const WALLET_NETWORKS: Record<WalletNetworkId, WalletNetwork> = {
  "stellar:testnet": {
    id: "stellar:testnet", family: "stellar", name: "Stellar Testnet",
    nativeAsset: "XLM", testnet: true,
    rpcUrl: "https://horizon-testnet.stellar.org",
    explorerUrl: "https://stellar.expert/explorer/testnet",
    chainId: null, rollout: "active",
  },
  "base:sepolia": {
    id: "base:sepolia", family: "evm", name: "Base Sepolia",
    nativeAsset: "ETH", testnet: true, rpcUrl: "https://sepolia.base.org",
    explorerUrl: "https://sepolia.basescan.org", chainId: 84532,
    rollout: "experimental",
  },
  "solana:devnet": {
    id: "solana:devnet", family: "solana", name: "Solana Devnet",
    nativeAsset: "SOL", testnet: true, rpcUrl: "https://api.devnet.solana.com",
    explorerUrl: "https://explorer.solana.com/?cluster=devnet", chainId: null,
    rollout: "experimental",
  },
  "avalanche:fuji": {
    id: "avalanche:fuji", family: "evm", name: "Avalanche Fuji",
    nativeAsset: "AVAX", testnet: true,
    rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
    explorerUrl: "https://testnet.snowtrace.io", chainId: 43113,
    rollout: "planned",
  },
  "bnb:testnet": {
    id: "bnb:testnet", family: "evm", name: "BNB Smart Chain Testnet",
    nativeAsset: "tBNB", testnet: true,
    rpcUrl: "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
    explorerUrl: "https://testnet.bscscan.com", chainId: 97,
    rollout: "planned",
  },
};

export function getWalletNetwork(input: string) {
  return WALLET_NETWORKS[walletNetworkIdSchema.parse(input)];
}

export function networksForFamily(family: WalletFamily) {
  return Object.values(WALLET_NETWORKS).filter((network) => network.family === family);
}

export function assertNetworkMatchesFamily(networkId: WalletNetworkId, family: WalletFamily) {
  const network = WALLET_NETWORKS[networkId];
  if (network.family !== family) throw new Error("wallet_network_family_mismatch");
  return network;
}
