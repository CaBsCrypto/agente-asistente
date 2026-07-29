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
