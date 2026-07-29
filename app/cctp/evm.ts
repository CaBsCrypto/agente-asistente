import {
  createPublicClient,
  encodeFunctionData,
  http,
  type Hex,
} from "viem";
import { avalancheFuji } from "viem/chains";
import { CCTP_TESTNET } from "@/app/connectors/circle-cctp";

export const CCTP_STANDARD_FINALITY = 2_000;
export const CCTP_MAX_FEE_ATOMIC = BigInt(500);
export const CCTP_EVM_PREVIEW_MS = 5 * 60_000;

export const CCTP_APPROVE_ABI = [{
  type: "function",
  name: "approve",
  stateMutability: "nonpayable",
  inputs: [
    { name: "spender", type: "address" },
    { name: "amount", type: "uint256" },
  ],
  outputs: [{ name: "", type: "bool" }],
}] as const;

const allowanceAbi = [{
  type: "function",
  name: "allowance",
  stateMutability: "view",
  inputs: [
    { name: "owner", type: "address" },
    { name: "spender", type: "address" },
  ],
  outputs: [{ name: "", type: "uint256" }],
}] as const;

export const CCTP_BURN_ABI = [{
  type: "function",
  name: "depositForBurnWithHook",
  stateMutability: "nonpayable",
  inputs: [
    { name: "amount", type: "uint256" },
    { name: "destinationDomain", type: "uint32" },
    { name: "mintRecipient", type: "bytes32" },
    { name: "burnToken", type: "address" },
    { name: "destinationCaller", type: "bytes32" },
    { name: "maxFee", type: "uint256" },
    { name: "minFinalityThreshold", type: "uint32" },
    { name: "hookData", type: "bytes" },
  ],
  outputs: [],
}] as const;

export type CctpEvmActionKind = "approve" | "burn";

export type CctpEvmPreview = {
  kind: CctpEvmActionKind;
  chainId: 43113;
  from: `0x${string}`;
  to: `0x${string}`;
  data: Hex;
  value: "0x0";
  gas: Hex;
  gasPrice: Hex;
  nonce: Hex;
  amountAtomic: string;
  expiresAt: string;
};

function client() {
  return createPublicClient({
    chain: avalancheFuji,
    transport: http(CCTP_TESTNET.avalanche.network === "avalanche:fuji"
      ? "https://api.avax-test.network/ext/bc/C/rpc"
      : undefined),
  });
}

export function encodeCctpApprove(amountAtomic: string) {
  return encodeFunctionData({
    abi: CCTP_APPROVE_ABI,
    functionName: "approve",
    args: [
      CCTP_TESTNET.avalanche.tokenMessengerV2,
      BigInt(amountAtomic),
    ],
  });
}

export function encodeCctpBurn(input: {
  amountAtomic: string;
  mintRecipient: `0x${string}`;
  destinationCaller: `0x${string}`;
  hookData: `0x${string}`;
}) {
  if (input.mintRecipient !== input.destinationCaller) {
    throw new Error("cctp_forwarder_scope_mismatch");
  }
  return encodeFunctionData({
    abi: CCTP_BURN_ABI,
    functionName: "depositForBurnWithHook",
    args: [
      BigInt(input.amountAtomic),
      CCTP_TESTNET.stellar.domain,
      input.mintRecipient,
      CCTP_TESTNET.avalanche.usdc,
      input.destinationCaller,
      CCTP_MAX_FEE_ATOMIC,
      CCTP_STANDARD_FINALITY,
      input.hookData,
    ],
  });
}

export async function getCctpAllowance(walletAddress: `0x${string}`) {
  return client().readContract({
    address: CCTP_TESTNET.avalanche.usdc,
    abi: allowanceAbi,
    functionName: "allowance",
    args: [walletAddress, CCTP_TESTNET.avalanche.tokenMessengerV2],
  });
}

export async function prepareCctpEvmPreview(input: {
  kind: CctpEvmActionKind;
  walletAddress: `0x${string}`;
  amountAtomic: string;
  mintRecipient: `0x${string}`;
  destinationCaller: `0x${string}`;
  hookData: `0x${string}`;
}) {
  const data = input.kind === "approve"
    ? encodeCctpApprove(input.amountAtomic)
    : encodeCctpBurn(input);
  const to = input.kind === "approve"
    ? CCTP_TESTNET.avalanche.usdc
    : CCTP_TESTNET.avalanche.tokenMessengerV2;
  const rpc = client();
  const [gas, gasPrice, nonce, balance] = await Promise.all([
    rpc.estimateGas({
      account: input.walletAddress,
      to,
      data,
      value: BigInt(0),
    }),
    rpc.getGasPrice(),
    rpc.getTransactionCount({
      address: input.walletAddress,
      blockTag: "pending",
    }),
    rpc.getBalance({ address: input.walletAddress }),
  ]);
  if (balance < gas * gasPrice) throw new Error("cctp_fuji_avax_insufficient");
  return {
    kind: input.kind,
    chainId: 43113,
    from: input.walletAddress,
    to,
    data,
    value: "0x0",
    gas: `0x${gas.toString(16)}`,
    gasPrice: `0x${gasPrice.toString(16)}`,
    nonce: `0x${nonce.toString(16)}`,
    amountAtomic: input.amountAtomic,
    expiresAt: new Date(Date.now() + CCTP_EVM_PREVIEW_MS).toISOString(),
  } satisfies CctpEvmPreview;
}

export async function verifyCctpEvmTransaction(
  preview: CctpEvmPreview,
  transactionHash: `0x${string}`,
) {
  const rpc = client();
  const [transaction, receipt] = await Promise.all([
    rpc.getTransaction({ hash: transactionHash }),
    rpc.waitForTransactionReceipt({ hash: transactionHash, timeout: 60_000 }),
  ]);
  if (
    transaction.chainId !== preview.chainId ||
    transaction.from.toLowerCase() !== preview.from.toLowerCase() ||
    transaction.to?.toLowerCase() !== preview.to.toLowerCase() ||
    transaction.input.toLowerCase() !== preview.data.toLowerCase() ||
    transaction.value !== BigInt(0) ||
    transaction.nonce !== Number(BigInt(preview.nonce))
  ) {
    throw new Error("cctp_evm_receipt_scope_mismatch");
  }
  if (receipt.status !== "success") throw new Error(`cctp_${preview.kind}_reverted`);
  return {
    transactionHash: transactionHash.toLowerCase(),
    blockNumber: Number(receipt.blockNumber),
    status: "confirmed" as const,
    explorerUrl: `https://subnets-test.avax.network/c-chain/tx/${transactionHash}`,
  };
}
