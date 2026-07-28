export const AVALANCHE_X402 = {
  protocolVersion: 2,
  scheme: "exact",
  network: "eip155:43113",
  chainId: 43113,
  facilitatorUrl: "https://facilitator.ultravioletadao.xyz",
  asset: {
    symbol: "USDC",
    address: "0x5425890298aed601595a70AB815c96711a31Bc65",
    decimals: 6,
    eip712Name: "USD Coin",
    eip712Version: "2",
  },
  maxAmountAtomic: 1_000_000n,
  maxAuthorizationSeconds: 300,
} as const;

export const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;
export const EVM_SIGNATURE = /^0x[a-fA-F0-9]{130}$/;
export const BYTES32 = /^0x[a-fA-F0-9]{64}$/;
