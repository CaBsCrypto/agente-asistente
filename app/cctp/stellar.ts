import {
  Contract,
  Networks,
  rpc,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import { CCTP_TESTNET } from "@/app/connectors/circle-cctp";
import {
  attachStellarSignature,
  transactionFromXdr,
} from "@/app/connectors/defindex";
import { stellarClientSignatureBytes } from "@/app/x402/client-authorization";

const STELLAR_RPC_URL = "https://soroban-testnet.stellar.org";
const CCTP_STELLAR_FEE = "10000000";

export async function prepareCctpMintAndForward(input: {
  walletAddress: string;
  message: `0x${string}`;
  attestation: `0x${string}`;
}) {
  const server = new rpc.Server(STELLAR_RPC_URL);
  const account = await server.getAccount(input.walletAddress);
  const transaction = new TransactionBuilder(account, {
    fee: CCTP_STELLAR_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(new Contract(CCTP_TESTNET.stellar.cctpForwarder).call(
      "mint_and_forward",
      xdr.ScVal.scvBytes(Buffer.from(input.message.slice(2), "hex")),
      xdr.ScVal.scvBytes(Buffer.from(input.attestation.slice(2), "hex")),
    ))
    .setTimeout(300)
    .build();
  const simulation = await server.simulateTransaction(transaction);
  if (rpc.Api.isSimulationError(simulation)) {
    throw new Error("cctp_mint_simulation_failed");
  }
  const prepared = rpc.assembleTransaction(transaction, simulation).build();
  return {
    xdr: prepared.toXDR(),
    signingHash: `0x${prepared.hash().toString("hex")}` as const,
    signingAddress: input.walletAddress,
    expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
    contract: CCTP_TESTNET.stellar.cctpForwarder,
    method: "mint_and_forward" as const,
  };
}

export function signCctpMintAndForward(input: {
  preparedXdr: string;
  walletAddress: string;
  signature: string;
}) {
  const signed = attachStellarSignature(
    input.preparedXdr,
    input.walletAddress,
    stellarClientSignatureBytes(input.signature),
  );
  return {
    signedXdr: signed.toXDR(),
    expectedHash: signed.hash().toString("hex"),
  };
}

export async function submitCctpMintAndForward(input: {
  signedXdr: string;
  expectedHash: string;
}) {
  const transaction = transactionFromXdr(input.signedXdr);
  const actualHash = transaction.hash().toString("hex");
  if (actualHash !== input.expectedHash) {
    throw new Error("cctp_mint_signed_xdr_hash_mismatch");
  }
  const server = new rpc.Server(STELLAR_RPC_URL);
  const existing = await server.getTransaction(input.expectedHash);
  if (existing.status === rpc.Api.GetTransactionStatus.SUCCESS) {
    return {
      hash: input.expectedHash,
      status: "SUCCESS" as const,
      ledger: existing.ledger,
      replayed: true,
    };
  }
  if (existing.status === rpc.Api.GetTransactionStatus.FAILED) {
    throw new Error("cctp_mint_failed_onchain");
  }
  const send = await server.sendTransaction(transaction);
  if (send.status === "ERROR") throw new Error("cctp_mint_submission_failed");
  const result = await server.pollTransaction(input.expectedHash, {
    sleepStrategy: rpc.LinearSleepStrategy,
    attempts: 30,
  });
  if (result.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    throw new Error("cctp_mint_not_confirmed");
  }
  return {
    hash: input.expectedHash,
    status: "SUCCESS" as const,
    ledger: result.ledger,
    replayed: false,
  };
}
