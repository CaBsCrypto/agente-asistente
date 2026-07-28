import type { WalletNetwork } from "@/app/wallets/networks";

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

function formatEther(value: bigint) {
  const whole = value / 10n ** 18n;
  const fraction = (value % 10n ** 18n).toString().padStart(18, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
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
    funded: balanceWei > 0n,
    explorerUrl: `${network.explorerUrl}/address/${address}`,
    faucetUrl: network.faucetUrl,
  };
}
