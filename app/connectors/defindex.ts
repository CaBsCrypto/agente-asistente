import {
  Address,
  Asset,
  BASE_FEE,
  Contract,
  Horizon,
  Keypair,
  Networks,
  Operation,
  Transaction,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import { isValidStellarAddress } from "@/app/privy-stellar";

export const DEFINDEX_TESTNET = {
  network: "stellar:testnet",
  networkPassphrase: Networks.TESTNET,
  rpcUrl: "https://soroban-testnet.stellar.org",
  horizonUrl: "https://horizon-testnet.stellar.org",
  explorerUrl: "https://stellar.expert/explorer/testnet",
  xlm: {
    code: "XLM",
    decimals: 7,
    vault: "CCLV4H7WTLJQ7ATLHBBQV2WW3OINF3FOY5XZ7VPHZO7NH3D2ZS4GFSF6",
    assetContract: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
    strategy: "CDVLOSPJPQOTB6ZCWO5VSGTOLGMKTXSFWYTUP572GTPNOWX4F76X3HPM",
  },
  usdc: {
    code: "USDC",
    decimals: 7,
    issuer: "GATALTGTWIOT6BUDBCZM3Q4OQ4BO2COLOAZ7IYSKPLC2PMSOPPGF5V56",
    vault: "CBMVK2JK6NTOT2O4HNQAIQFJY232BHKGLIMXDVQVHIIZKDACXDFZDWHN",
    assetContract: "CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU",
    strategy: "CALLOM5I7XLQPPOPQMYAHUWW4N7O3JKT42KQ4ASEEVBXDJQNJOALFSUY",
  },
} as const;

export type DefindexAsset = "XLM" | "USDC";
export type DefindexAction = "usdc_trustline" | "deposit";

export type PreparedDefindexTransaction = {
  action: DefindexAction;
  asset: DefindexAsset;
  amount: string;
  amountAtomic: string;
  walletAddress: string;
  vaultAddress: string | null;
  xdr: string;
  transactionHash: string;
  expiresAt: string;
  preview: {
    title: string;
    description: string;
    network: "Stellar Testnet";
    wallet: string;
    asset: DefindexAsset;
    amount: string;
    destination: string;
    invest: boolean;
    slippageBps: number | null;
  };
};

const STROOP_SCALE = BigInt(10_000_000);
const MAX_DEPOSIT_ATOMIC = BigInt(10_000) * STROOP_SCALE;
const DEFAULT_SLIPPAGE_BPS = BigInt(100);

function assetConfig(asset: DefindexAsset) {
  return asset === "XLM" ? DEFINDEX_TESTNET.xlm : DEFINDEX_TESTNET.usdc;
}

export function parseStellarAmount(value: string) {
  const normalized = value.trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,7})?$/.test(normalized)) {
    throw new Error("invalid_stellar_amount");
  }
  const [whole, fraction = ""] = normalized.split(".");
  const atomic = BigInt(whole) * STROOP_SCALE + BigInt(fraction.padEnd(7, "0"));
  if (atomic <= BigInt(0) || atomic > MAX_DEPOSIT_ATOMIC) {
    throw new Error("stellar_amount_out_of_range");
  }
  return atomic;
}

export function formatStellarAmount(atomic: bigint) {
  const whole = atomic / STROOP_SCALE;
  const fraction = (atomic % STROOP_SCALE).toString().padStart(7, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function amountVector(amount: bigint) {
  return xdr.ScVal.scvVec([nativeToScVal(amount, { type: "i128" })]);
}

function assertWallet(address: string) {
  if (!isValidStellarAddress(address)) throw new Error("invalid_stellar_address");
}

function expiry(minutes = 5) {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

export async function prepareUsdcTrustline(walletAddress: string) {
  assertWallet(walletAddress);
  const server = new Horizon.Server(DEFINDEX_TESTNET.horizonUrl);
  const account = await server.loadAccount(walletAddress);
  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: DEFINDEX_TESTNET.networkPassphrase,
  })
    .addOperation(
      Operation.changeTrust({
        asset: new Asset(DEFINDEX_TESTNET.usdc.code, DEFINDEX_TESTNET.usdc.issuer),
      }),
    )
    .setTimeout(300)
    .build();

  return {
    action: "usdc_trustline",
    asset: "USDC",
    amount: "0",
    amountAtomic: "0",
    walletAddress,
    vaultAddress: null,
    xdr: transaction.toXDR(),
    transactionHash: transaction.hash().toString("hex"),
    expiresAt: expiry(),
    preview: {
      title: "Enable USDC on this wallet",
      description: "Create the exact Stellar trustline required by the public DeFindex USDC Testnet vault.",
      network: "Stellar Testnet",
      wallet: walletAddress,
      asset: "USDC",
      amount: "0",
      destination: DEFINDEX_TESTNET.usdc.issuer,
      invest: false,
      slippageBps: null,
    },
  } satisfies PreparedDefindexTransaction;
}

export async function prepareDefindexDeposit(input: {
  walletAddress: string;
  asset: DefindexAsset;
  amount: string;
}) {
  assertWallet(input.walletAddress);
  const amountAtomic = parseStellarAmount(input.amount);
  const minimumAtomic =
    (amountAtomic * (BigInt(10_000) - DEFAULT_SLIPPAGE_BPS)) / BigInt(10_000);
  const config = assetConfig(input.asset);
  const server = new rpc.Server(DEFINDEX_TESTNET.rpcUrl);
  const account = await server.getAccount(input.walletAddress);
  const contract = new Contract(config.vault);
  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: DEFINDEX_TESTNET.networkPassphrase,
  })
    .addOperation(
      contract.call(
        "deposit",
        amountVector(amountAtomic),
        amountVector(minimumAtomic),
        new Address(input.walletAddress).toScVal(),
        nativeToScVal(true),
      ),
    )
    .setTimeout(300)
    .build();
  const prepared = await server.prepareTransaction(transaction);
  const normalizedAmount = formatStellarAmount(amountAtomic);

  return {
    action: "deposit",
    asset: input.asset,
    amount: normalizedAmount,
    amountAtomic: amountAtomic.toString(),
    walletAddress: input.walletAddress,
    vaultAddress: config.vault,
    xdr: prepared.toXDR(),
    transactionHash: prepared.hash().toString("hex"),
    expiresAt: expiry(),
    preview: {
      title: `Deposit ${normalizedAmount} ${input.asset} into DeFindex`,
      description: "Mint vault shares through the public DeFindex contract and request automatic investment when the vault has an allocation.",
      network: "Stellar Testnet",
      wallet: input.walletAddress,
      asset: input.asset,
      amount: normalizedAmount,
      destination: config.vault,
      invest: true,
      slippageBps: Number(DEFAULT_SLIPPAGE_BPS),
    },
  } satisfies PreparedDefindexTransaction;
}

export function transactionFromXdr(xdrValue: string) {
  return new Transaction(xdrValue, DEFINDEX_TESTNET.networkPassphrase);
}

export function attachStellarSignature(
  xdrValue: string,
  address: string,
  signature: Uint8Array,
) {
  assertWallet(address);
  const transaction = transactionFromXdr(xdrValue);
  const digest = transaction.hash();
  if (!Keypair.fromPublicKey(address).verify(digest, Buffer.from(signature))) {
    throw new Error("invalid_privy_transaction_signature");
  }
  transaction.addSignature(address, Buffer.from(signature).toString("base64"));
  return transaction;
}

export async function submitPreparedDefindexTransaction(input: {
  action: DefindexAction;
  signedXdr: string;
}) {
  const transaction = transactionFromXdr(input.signedXdr);
  const expectedHash = transaction.hash().toString("hex");

  if (input.action === "usdc_trustline") {
    const server = new Horizon.Server(DEFINDEX_TESTNET.horizonUrl);
    const result = await server.submitTransaction(transaction);
    return {
      hash: result.hash || expectedHash,
      status: "SUCCESS" as const,
      ledger: result.ledger,
    };
  }

  const server = new rpc.Server(DEFINDEX_TESTNET.rpcUrl);
  const send = await server.sendTransaction(transaction);
  if (send.status === "ERROR") throw new Error("stellar_submission_failed");
  const result = await server.pollTransaction(send.hash, {
    sleepStrategy: rpc.LinearSleepStrategy,
    attempts: 30,
  });
  if (result.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    throw new Error("stellar_transaction_not_confirmed");
  }
  return {
    hash: send.hash || expectedHash,
    status: "SUCCESS" as const,
    ledger: result.ledger,
  };
}

async function simulateReadOnly(walletAddress: string, contractId: string, method: string, args: xdr.ScVal[] = []) {
  assertWallet(walletAddress);
  const server = new rpc.Server(DEFINDEX_TESTNET.rpcUrl);
  const account = await server.getAccount(walletAddress);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: DEFINDEX_TESTNET.networkPassphrase,
  })
    .addOperation(new Contract(contractId).call(method, ...args))
    .setTimeout(30)
    .build();
  const simulation = await server.simulateTransaction(tx);
  if (!rpc.Api.isSimulationSuccess(simulation) || !simulation.result?.retval) {
    throw new Error("defindex_read_failed");
  }
  return scValToNative(simulation.result.retval);
}

export async function getDefindexVaultSnapshot(walletAddress: string, asset: DefindexAsset) {
  const config = assetConfig(asset);
  const [funds, fees] = await Promise.all([
    simulateReadOnly(walletAddress, config.vault, "fetch_total_managed_funds"),
    simulateReadOnly(walletAddress, config.vault, "get_fees"),
  ]);
  return {
    asset,
    vault: config.vault,
    strategy: config.strategy,
    funds,
    fees,
  };
}




export async function getDefindexPosition(walletAddress: string, asset: DefindexAsset) {
  const config = assetConfig(asset);
  const shares = await simulateReadOnly(
    walletAddress,
    config.vault,
    "balance",
    [new Address(walletAddress).toScVal()],
  );
  const atomic = BigInt(String(shares));
  return {
    asset,
    vault: config.vault,
    sharesAtomic: atomic.toString(),
    shares: formatStellarAmount(atomic),
  };
}

export async function getSubmittedTransaction(hash: string) {
  if (!/^[a-f0-9]{64}$/i.test(hash)) return null;
  const server = new rpc.Server(DEFINDEX_TESTNET.rpcUrl);
  const result = await server.getTransaction(hash);
  if (result.status === rpc.Api.GetTransactionStatus.NOT_FOUND) return null;
  return {
    hash,
    status: result.status,
    ledger: "ledger" in result ? result.ledger : null,
    successful: result.status === rpc.Api.GetTransactionStatus.SUCCESS,
  };
}
