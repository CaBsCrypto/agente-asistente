import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { agentActivities, agentWallets } from "@/db/schema";
import {
  estimateEvmNativeTransfer,
  getEvmTransactionEvidence,
} from "@/app/wallets/evm-rpc";
import { getWalletNetwork } from "@/app/wallets/networks";
import {
  FUJI_CHAIN_ID,
  FUJI_TRANSFER_DEMO_AMOUNT,
} from "@/app/wallets/avalanche-policy";

const ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const HASH = /^0x[a-fA-F0-9]{64}$/;

function activityId(userId: string, requestId: string) {
  return "fuji_send_" + createHash("sha256")
    .update(`${userId}:${requestId}`)
    .digest("hex")
    .slice(0, 48);
}

export async function getActiveFujiWallet(userId: string) {
  const [wallet] = await getDb().select({
    id: agentWallets.id,
    address: agentWallets.address,
  }).from(agentWallets).where(and(
    eq(agentWallets.userId, userId),
    eq(agentWallets.chainType, "ethereum"),
    eq(agentWallets.network, "avalanche:fuji"),
    eq(agentWallets.status, "active"),
  )).limit(1);
  if (!wallet) throw new Error("avalanche_not_activated");
  return wallet;
}

export async function prepareFujiDemoTransfer(input: {
  userId: string;
  requestId: string;
  destination: string;
  amount: string;
}) {
  if (!ADDRESS.test(input.destination)) throw new Error("invalid_evm_address");
  const destination = input.destination.toLowerCase();
  if (input.amount !== FUJI_TRANSFER_DEMO_AMOUNT) {
    throw new Error("fuji_demo_amount_must_be_0.001");
  }
  const wallet = await getActiveFujiWallet(input.userId);
  if (wallet.address.toLowerCase() === destination) {
    throw new Error("fuji_destination_must_be_second_wallet");
  }
  const id = activityId(input.userId, input.requestId);
  const current = await getDb().select({
    metadata: agentActivities.metadata,
  }).from(agentActivities).where(and(
    eq(agentActivities.id, id),
    eq(agentActivities.userId, input.userId),
  )).limit(1);
  if (current[0]) {
    const metadata = current[0].metadata;
    if (
      metadata.destination !== destination ||
      metadata.amount !== input.amount
    ) throw new Error("idempotency_key_reused");
    return metadata;
  }

  const estimate = await estimateEvmNativeTransfer(
    getWalletNetwork("avalanche:fuji"),
    wallet.address,
    input.destination,
    input.amount,
  );
  const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
  const metadata = {
    previewId: id,
    status: "prepared",
    network: "avalanche:fuji",
    chainId: FUJI_CHAIN_ID,
    from: wallet.address,
    destination,
    amount: input.amount,
    valueWei: estimate.valueWei,
    valueHex: estimate.valueHex,
    gasLimit: estimate.gasLimit,
    gasLimitHex: estimate.gasLimitHex,
    gasPriceWei: estimate.gasPriceWei,
    maxGasCostWei: estimate.maxGasCostWei,
    nonce: estimate.nonce,
    expiresAt,
    transactionHash: null,
    explorerUrl: null,
  };
  await getDb().insert(agentActivities).values({
    id,
    userId: input.userId,
    eventType: "avalanche.transfer.prepared",
    summary: "Prepared 0.001 AVAX Fuji transfer",
    metadata,
  }).onConflictDoNothing();
  return metadata;
}

export async function recordFujiDemoTransfer(input: {
  userId: string;
  previewId: string;
  transactionHash: string;
}) {
  if (!HASH.test(input.transactionHash)) throw new Error("invalid_transaction_hash");
  const [row] = await getDb().select({
    metadata: agentActivities.metadata,
  }).from(agentActivities).where(and(
    eq(agentActivities.id, input.previewId),
    eq(agentActivities.userId, input.userId),
  )).limit(1);
  if (!row) throw new Error("fuji_preview_not_found");
  const preview = row.metadata;
const existingHash = typeof preview.transactionHash === "string"
    ? preview.transactionHash
    : null;
  if (existingHash && existingHash !== input.transactionHash) {
    throw new Error("fuji_preview_already_consumed");
  }
  if (preview.status === "confirmed" && existingHash === input.transactionHash) {
    return { ...preview, replayProtected: true };
  }
  const isSubmittedRetry = preview.status === "submitted" &&
    existingHash === input.transactionHash;
  if (!isSubmittedRetry && (
    typeof preview.expiresAt !== "string" ||
    new Date(preview.expiresAt).getTime() <= Date.now()
  )) throw new Error("fuji_preview_expired");

  const evidence = await getEvmTransactionEvidence(
    getWalletNetwork("avalanche:fuji"),
    input.transactionHash,
  );
  if (
    evidence.from.toLowerCase() !== String(preview.from).toLowerCase() ||
    evidence.to?.toLowerCase() !== String(preview.destination).toLowerCase() ||
    evidence.valueWei !== preview.valueWei
  ) throw new Error("fuji_transaction_mismatch");

  const metadata = {
    ...preview,
    status: evidence.receiptStatus === "0x1" ? "confirmed" : "submitted",
    transactionHash: input.transactionHash,
    explorerUrl: `${getWalletNetwork("avalanche:fuji").explorerUrl}/tx/${input.transactionHash}`,
    blockNumber: evidence.blockNumber,
    replayProtected: isSubmittedRetry,
  };
  await getDb().update(agentActivities).set({
    eventType: metadata.status === "confirmed"
      ? "avalanche.transfer.confirmed"
      : "avalanche.transfer.submitted",
    summary: `${metadata.status} 0.001 AVAX Fuji transfer`,
    metadata,
  }).where(and(
    eq(agentActivities.id, input.previewId),
    eq(agentActivities.userId, input.userId),
  ));
  return metadata;
}

