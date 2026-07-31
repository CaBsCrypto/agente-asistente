import type { WalletNetwork } from "@/app/wallets/networks";

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

// BigInt literals (1n) are unavailable at the repo's ES2017 tsconfig target.
const ZERO = BigInt(0);
const WEI_PER_ETHER = BigInt("1000000000000000000");

function formatUnits(value: bigint, decimals: number) {
  const divisor = BigInt(10) ** BigInt(decimals);
  const whole = value / divisor;
  const fraction = (value % divisor)
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function formatEther(value: bigint) {
  const whole = value / WEI_PER_ETHER;
  const fraction = (value % WEI_PER_ETHER).toString().padStart(18, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function parseEther(value: string) {
  if (!/^\d+(?:\.\d{1,18})?$/.test(value)) throw new Error("invalid_evm_amount");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * WEI_PER_ETHER + BigInt(fraction.padEnd(18, "0"));
}

function hex(value: bigint) {
  return `0x${value.toString(16)}`;
}

type JsonRpcResponse<T> = {
  jsonrpc: "2.0";
  id: number;
  result?: T;
  error?: { code: number; message: string };
};

async function rpc<T>(
  network: WalletNetwork,
  method: string,
  params: unknown[],
  fetcher: typeof fetch = fetch,
) {
  if (network.family !== "evm" || network.chainId === null) {
    throw new Error("evm_network_required");
  }
  const response = await fetcher(network.rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`evm_rpc_http_${response.status}`);
  const payload = await response.json() as JsonRpcResponse<T>;
  if (payload.error || payload.result === undefined) {
    throw new Error(`evm_rpc_failed:${payload.error?.message ?? method}`);
  }
  return payload.result;
}

export async function diagnoseEvmWallet(
  network: WalletNetwork,
  address: string,
  fetcher: typeof fetch = fetch,
) {
  if (!EVM_ADDRESS.test(address)) throw new Error("invalid_evm_address");
  const [chainIdHex, balanceHex, gasPriceHex, nonceHex] = await Promise.all([
    rpc<string>(network, "eth_chainId", [], fetcher),
    rpc<string>(network, "eth_getBalance", [address, "latest"], fetcher),
    rpc<string>(network, "eth_gasPrice", [], fetcher),
    rpc<string>(network, "eth_getTransactionCount", [address, "latest"], fetcher),
  ]);
  const observedChainId = Number(BigInt(chainIdHex));
  if (observedChainId !== network.chainId) throw new Error("evm_chain_id_mismatch");

  const balanceWei = BigInt(balanceHex);
  return {
    network: network.id,
    chainId: observedChainId,
    address,
    balanceWei: balanceWei.toString(),
    balance: formatEther(balanceWei),
    nativeAsset: network.nativeAsset,
    gasPriceWei: BigInt(gasPriceHex).toString(),
    nonce: Number(BigInt(nonceHex)),
    funded: balanceWei > ZERO,
    explorerUrl: `${network.explorerUrl}/address/${address}`,
    faucetUrl: network.faucetUrl,
  };
}
export async function getErc20Balance(
  network: WalletNetwork,
  tokenAddress: string,
  walletAddress: string,
  decimals: number,
  fetcher: typeof fetch = fetch,
) {
  if (!EVM_ADDRESS.test(tokenAddress) || !EVM_ADDRESS.test(walletAddress)) {
    throw new Error("invalid_evm_address");
  }
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) {
    throw new Error("invalid_erc20_decimals");
  }
  const balanceOfSelector = "70a08231";
  const encodedWallet = walletAddress.slice(2).toLowerCase().padStart(64, "0");
  const result = await rpc<string>(
    network,
    "eth_call",
    [{ to: tokenAddress, data: `0x${balanceOfSelector}${encodedWallet}` }, "latest"],
    fetcher,
  );
  const atomic = BigInt(result);
  return {
    tokenAddress,
    walletAddress,
    atomic: atomic.toString(),
    balance: formatUnits(atomic, decimals),
    decimals,
  };
}
export async function estimateEvmNativeTransfer(
  network: WalletNetwork,
  from: string,
  to: string,
  amount: string,
  fetcher: typeof fetch = fetch,
) {
  if (!EVM_ADDRESS.test(from) || !EVM_ADDRESS.test(to)) throw new Error("invalid_evm_address");
  const valueWei = parseEther(amount);
  if (valueWei <= ZERO) throw new Error("invalid_evm_amount");
  const valueHex = hex(valueWei);
  const [chainIdHex, gasLimitHex, gasPriceHex, nonceHex, balanceHex] = await Promise.all([
    rpc<string>(network, "eth_chainId", [], fetcher),
    rpc<string>(network, "eth_estimateGas", [{ from, to, value: valueHex }], fetcher),
    rpc<string>(network, "eth_gasPrice", [], fetcher),
    rpc<string>(network, "eth_getTransactionCount", [from, "pending"], fetcher),
    rpc<string>(network, "eth_getBalance", [from, "latest"], fetcher),
  ]);
  if (Number(BigInt(chainIdHex)) !== network.chainId) throw new Error("evm_chain_id_mismatch");
  const gasLimit = BigInt(gasLimitHex);
  const gasPrice = BigInt(gasPriceHex);
  const maxGasCost = gasLimit * gasPrice;
  if (BigInt(balanceHex) < valueWei + maxGasCost) throw new Error("insufficient_avax_for_value_and_gas");
  return {
    chainId: network.chainId, from, to, amount,
    valueWei: valueWei.toString(), valueHex,
    gasLimit: gasLimit.toString(), gasLimitHex: hex(gasLimit),
    gasPriceWei: gasPrice.toString(), maxGasCostWei: maxGasCost.toString(),
    nonce: Number(BigInt(nonceHex)),
  };
}

/** keccak256("Transfer(address,address,uint256)") */
const ERC20_TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function topicAddress(address: string) {
  return `0x${address.slice(2).toLowerCase().padStart(64, "0")}`;
}

export type EvmErc20TransferConfirmation =
  | { kind: "pending" }
  | { kind: "reverted"; blockNumber: number | null }
  | { kind: "mismatch"; reason: string; blockNumber: number | null }
  | { kind: "confirmed"; blockNumber: number | null };

/**
 * Confirms that a mined transaction really moved an exact ERC-20 amount between
 * two exact parties.
 *
 * This exists because a gas-sponsored EIP-3009 `transferWithAuthorization` is
 * submitted by a facilitator, not by the payer: the transaction's own `from` is
 * the relayer and its `to` is the token contract, so the transaction fields
 * prove nothing about who paid whom. The only on-chain evidence that binds to a
 * frozen payment intent is the ERC-20 `Transfer` log, so that is what we match.
 */
export async function confirmEvmErc20Transfer(
  network: WalletNetwork,
  transactionHash: string,
  expected: { token: string; from: string; to: string; amountAtomic: string },
  fetcher: typeof fetch = fetch,
): Promise<EvmErc20TransferConfirmation> {
  if (!/^0x[a-fA-F0-9]{64}$/.test(transactionHash)) {
    throw new Error("invalid_evm_transaction_hash");
  }
  if (
    !EVM_ADDRESS.test(expected.token) ||
    !EVM_ADDRESS.test(expected.from) ||
    !EVM_ADDRESS.test(expected.to)
  ) throw new Error("invalid_evm_address");
  if (!/^\d+$/.test(expected.amountAtomic)) throw new Error("invalid_erc20_amount");

  const chainIdHex = await rpc<string>(network, "eth_chainId", [], fetcher);
  if (Number(BigInt(chainIdHex)) !== network.chainId) {
    throw new Error("evm_chain_id_mismatch");
  }

  const receipt = await rpc<{
    status: string;
    blockNumber: string | null;
    logs: { address: string; topics: string[]; data: string }[];
  } | null>(network, "eth_getTransactionReceipt", [transactionHash], fetcher);

  // No receipt yet means undecided, never failed: the transfer may be in flight.
  if (!receipt) return { kind: "pending" };

  const blockNumber = receipt.blockNumber ? Number(BigInt(receipt.blockNumber)) : null;
  if (receipt.status !== "0x1") return { kind: "reverted", blockNumber };
  if (blockNumber === null) return { kind: "pending" };

  const wantFrom = topicAddress(expected.from);
  const wantTo = topicAddress(expected.to);
  const wantValue = BigInt(expected.amountAtomic);
  const logs = Array.isArray(receipt.logs) ? receipt.logs : [];

  const matched = logs.some((log) =>
    log.address?.toLowerCase() === expected.token.toLowerCase() &&
    log.topics?.[0]?.toLowerCase() === ERC20_TRANSFER_TOPIC &&
    log.topics[1]?.toLowerCase() === wantFrom &&
    log.topics[2]?.toLowerCase() === wantTo &&
    BigInt(log.data || "0x0") === wantValue,
  );
  if (!matched) {
    return { kind: "mismatch", reason: "erc20_transfer_log_absent", blockNumber };
  }
  return { kind: "confirmed", blockNumber };
}

export async function getEvmTransactionEvidence(
  network: WalletNetwork,
  transactionHash: string,
  fetcher: typeof fetch = fetch,
) {
  const [chainIdHex, transaction] = await Promise.all([
    rpc<string>(network, "eth_chainId", [], fetcher),
    rpc<{
      hash: string; chainId: string; from: string; to: string | null; value: string;
      nonce: string; gas: string; gasPrice: string; blockNumber: string | null;
    } | null>(network, "eth_getTransactionByHash", [transactionHash], fetcher),
  ]);
  const observedChainId = Number(BigInt(chainIdHex));
  if (observedChainId !== network.chainId) throw new Error("evm_chain_id_mismatch");
  if (!transaction) throw new Error("evm_transaction_not_found");
  const receipt = await rpc<{ status: string; blockNumber: string } | null>(
    network, "eth_getTransactionReceipt", [transactionHash], fetcher,
  );
  return {
    chainId: observedChainId,
    transactionHash: transaction.hash.toLowerCase(),
    transactionChainId: Number(BigInt(transaction.chainId)),
    from: transaction.from,
    to: transaction.to,
    valueWei: BigInt(transaction.value).toString(),
    nonce: Number(BigInt(transaction.nonce)),
    gasLimit: BigInt(transaction.gas).toString(),
    gasPriceWei: BigInt(transaction.gasPrice).toString(),
    blockNumber: receipt?.blockNumber
      ? Number(BigInt(receipt.blockNumber))
      : transaction.blockNumber ? Number(BigInt(transaction.blockNumber)) : null,
    receiptStatus: receipt?.status ?? null,
  };
}
