import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { encodeFunctionData, formatUnits } from "viem";
import { getDb } from "@/db";
import { agentEvmCalls } from "@/db/schema";
import {
  getPangolinAvaxToUsdcQuote,
  PANGOLIN_FUJI_ROUTER,
  PANGOLIN_FUJI_USDC,
  PANGOLIN_FUJI_WAVAX,
} from "@/app/connectors/pangolin-fuji";
import {
  prepareEvmContractCall,
  verifyEvmContractCall,
  type EvmContractPreview,
} from "@/app/wallets/evm-rpc";
import { getActiveFujiWallet } from "@/app/wallets/avalanche-transfer";
import { FUJI_CHAIN_ID } from "@/app/wallets/avalanche-policy";
import { getWalletNetwork } from "@/app/wallets/networks";

const AMOUNT = /^[0-9]+$/;
const HASH = /^0x[a-fA-F0-9]{64}$/;
const USDC_DECIMALS = 6;
const SWAP_DEADLINE_S = 300;
const SWAP_EXPIRES_MS = 5 * 60_000;
const SLIPPAGE_NUMERATOR = BigInt(9);
const SLIPPAGE_DENOMINATOR = BigInt(10);

const swapExactAvaxForTokensAbi = [{
  type: "function",
  name: "swapExactAVAXForTokens",
  stateMutability: "payable",
  inputs: [
    { name: "amountOutMin", type: "uint256" },
    { name: "path", type: "address[]" },
    { name: "to", type: "address" },
    { name: "deadline", type: "uint256" },
  ],
  outputs: [{ name: "amounts", type: "uint256" }],
}] as const;

export type PangolinSwapPreview = {
  previewId: string;
  status: "prepared" | "submitted" | "confirmed" | "failed";
  network: "avalanche:fuji";
  chainId: 43113;
  from: string;
  to: string;
  data: string;
  valueWei: string;
  valueHex: string;
  gasLimit: string;
  gasLimitHex: string;
  gasPriceWei: string;
  maxGasCostWei: string;
  nonce: number;
  amountInAtomic: string;
  amountIn: string;
  minOutAtomic: string;
  minOut: string;
  quoteBlockNumber: number;
  expiresAt: string;
  transactionHash: string | null;
  explorerUrl: string | null;
};

export async function preparePangolinSwap(input: {
  userId: string;
  requestId: string;
  amountInAtomic: string;
}): Promise<PangolinSwapPreview> {
  if (!AMOUNT.test(input.amountInAtomic) || BigInt(input.amountInAtomic) <= BigInt(0)) {
    throw new Error("invalid_avax_amount");
  }
  const wallet = await getActiveFujiWallet(input.userId);
  const id = "fuji_swap_" + createHash("sha256")
    .update(`${input.userId}:${input.requestId}`)
    .digest("hex")
    .slice(0, 48);
  const db = getDb();

  const existing = await db.select({ preview: agentEvmCalls.preview })
    .from(agentEvmCalls)
    .where(and(
      eq(agentEvmCalls.id, id),
      eq(agentEvmCalls.userId, input.userId),
    ))
    .limit(1);
  if (existing[0]) {
    const persisted = existing[0].preview as unknown as PangolinSwapPreview;
    if (persisted.amountInAtomic !== input.amountInAtomic) throw new Error("idempotency_key_reused");
    return persisted;
  }

  const quote = await getPangolinAvaxToUsdcQuote(input.amountInAtomic);
  const amountOutAtomic = BigInt(quote.amountOutAtomic);
  const minOutAtomic = (amountOutAtomic * SLIPPAGE_NUMERATOR) / SLIPPAGE_DENOMINATOR;
  const deadline = Math.floor(Date.now() / 1000) + SWAP_DEADLINE_S;
  const data = encodeFunctionData({
    abi: swapExactAvaxForTokensAbi,
    functionName: "swapExactAVAXForTokens",
    args: [
      minOutAtomic,
      [PANGOLIN_FUJI_WAVAX, PANGOLIN_FUJI_USDC],
      wallet.address as `0x${string}`,
      BigInt(deadline),
    ],
  });
  const estimate = await prepareEvmContractCall(
    getWalletNetwork("avalanche:fuji"),
    wallet.address,
    PANGOLIN_FUJI_ROUTER,
    data,
    input.amountInAtomic,
  );
  const expiresAt = new Date(Date.now() + SWAP_EXPIRES_MS).toISOString();
  const preview = {
    previewId: id,
    status: "prepared",
    network: "avalanche:fuji",
    chainId: FUJI_CHAIN_ID,
    from: estimate.from,
    to: estimate.to,
    data: estimate.data,
    valueWei: estimate.valueWei,
    valueHex: estimate.valueHex,
    gasLimit: estimate.gasLimit,
    gasLimitHex: estimate.gasLimitHex,
    gasPriceWei: estimate.gasPriceWei,
    maxGasCostWei: estimate.maxGasCostWei,
    nonce: estimate.nonce,
    amountInAtomic: quote.amountInAtomic,
    amountIn: quote.amountIn,
    minOutAtomic: minOutAtomic.toString(),
    minOut: formatUnits(minOutAtomic, USDC_DECIMALS),
    quoteBlockNumber: quote.blockNumber,
    expiresAt,
    transactionHash: null,
    explorerUrl: null,
    amountOutAtomic: quote.amountOutAtomic,
    amountOut: quote.amountOut,
    priceUsdcPerAvax: quote.priceUsdcPerAvax,
    deadline,
  };

  const inserted = await db.insert(agentEvmCalls).values({
    id,
    userId: input.userId,
    walletAddress: wallet.address,
    network: "avalanche:fuji",
    actionId: input.requestId,
    stepIndex: 0,
    idempotencyKey: id,
    kind: "pangolin.swap_avax_to_usdc",
    status: "prepared",
    preview,
    expiresAt: new Date(Date.now() + SWAP_EXPIRES_MS),
  }).onConflictDoNothing().returning({ preview: agentEvmCalls.preview });
  if (inserted[0]) return inserted[0].preview as unknown as PangolinSwapPreview;

  // A concurrent request won the unique preview ID. Never return local,
  // unpersisted parameters: refetch and bind exclusively to the winner.
  const [persisted] = await db.select({ preview: agentEvmCalls.preview })
    .from(agentEvmCalls)
    .where(and(
      eq(agentEvmCalls.id, id),
      eq(agentEvmCalls.userId, input.userId),
    ))
    .limit(1);
  if (!persisted) throw new Error("fuji_swap_preview_conflict_unresolved");
  const winner = persisted.preview as unknown as PangolinSwapPreview;
  if (winner.amountInAtomic !== input.amountInAtomic) throw new Error("idempotency_key_reused");
  return winner;
}

export async function recordPangolinSwap(input: {
  userId: string;
  previewId: string;
  transactionHash: string;
}): Promise<PangolinSwapPreview & { replayProtected?: boolean }> {
  if (!HASH.test(input.transactionHash)) throw new Error("invalid_transaction_hash");
  const transactionHash = input.transactionHash.toLowerCase();
  const db = getDb();
  const loadPreview = async () => {
    const [row] = await db.select({ preview: agentEvmCalls.preview })
      .from(agentEvmCalls)
      .where(and(
        eq(agentEvmCalls.id, input.previewId),
        eq(agentEvmCalls.userId, input.userId),
      ))
      .limit(1);
    if (!row) throw new Error("fuji_swap_preview_not_found");
    return row.preview as unknown as PangolinSwapPreview;
  };

  let preview = await loadPreview();
  const persistedHash = () => preview.transactionHash?.toLowerCase() ?? null;
  if (persistedHash() && persistedHash() !== transactionHash) {
    throw new Error("fuji_swap_preview_already_consumed");
  }
  if (
    (preview.status === "confirmed" || preview.status === "failed") &&
    persistedHash() === transactionHash
  ) return { ...preview, replayProtected: true };

  const explorerUrl = `${getWalletNetwork("avalanche:fuji").explorerUrl}/tx/${transactionHash}`;
  let isSubmittedRetry = preview.status === "submitted" && persistedHash() === transactionHash;

  if (!isSubmittedRetry) {
    const now = new Date().toISOString();
    if (preview.status !== "prepared") throw new Error("fuji_swap_preview_not_recordable");

    const submittedPreview = {
      ...preview,
      status: "submitted",
      transactionHash,
      explorerUrl,
      submittedAt: now,
      replayProtected: false,
    };
    const transitioned = await db.update(agentEvmCalls).set({
      status: "submitted",
      transactionHash,
      preview: submittedPreview,
    }).where(and(
      eq(agentEvmCalls.id, input.previewId),
      eq(agentEvmCalls.userId, input.userId),
      sql`${agentEvmCalls.preview}->>'status' = 'prepared'`,
      sql`COALESCE(${agentEvmCalls.preview}->>'transactionHash', '') = ''`,
    )).returning({ preview: agentEvmCalls.preview });

    if (transitioned[0]) {
      preview = transitioned[0].preview as unknown as PangolinSwapPreview;
    } else {
      preview = await loadPreview();
      const winnerHash = preview.transactionHash?.toLowerCase() ?? null;
      if (winnerHash !== transactionHash) throw new Error("fuji_swap_preview_already_consumed");
      if (preview.status === "confirmed" || preview.status === "failed") {
        return { ...preview, replayProtected: true };
      }
      if (preview.status !== "submitted") throw new Error("fuji_swap_preview_transition_failed");
      isSubmittedRetry = true;
    }
  }

  const previewEvm = {
    chainId: preview.chainId,
    from: preview.from,
    to: preview.to,
    data: preview.data,
    valueWei: preview.valueWei,
    valueHex: preview.valueHex,
    gasLimit: preview.gasLimit,
    gasLimitHex: preview.gasLimitHex,
    gasPriceWei: preview.gasPriceWei,
    maxGasCostWei: preview.maxGasCostWei,
    nonce: preview.nonce,
  } satisfies EvmContractPreview;

  const evidence = await verifyEvmContractCall(
    getWalletNetwork("avalanche:fuji"),
    previewEvm,
    transactionHash,
  );
  if (
    evidence.transactionHash !== transactionHash ||
    evidence.chainId !== FUJI_CHAIN_ID ||
    evidence.transactionChainId !== FUJI_CHAIN_ID ||
    evidence.from.toLowerCase() !== preview.from.toLowerCase() ||
    evidence.to?.toLowerCase() !== preview.to.toLowerCase()
  ) throw new Error("fuji_swap_transaction_mismatch");

  if (evidence.status === "submitted") {
    return {
      ...preview,
      status: "submitted",
      transactionHash,
      explorerUrl,
      replayProtected: isSubmittedRetry,
    };
  }

  const finalPreview = {
    ...preview,
    status: evidence.status,
    transactionHash,
    explorerUrl,
    blockNumber: evidence.blockNumber,
    receiptStatus: evidence.receiptStatus,
    error: evidence.status === "failed" ? "swap_reverted" : null,
    confirmedAt: evidence.status === "confirmed" ? new Date().toISOString() : null,
    replayProtected: isSubmittedRetry,
  };
  const [updated] = await db.update(agentEvmCalls).set({
    status: evidence.status,
    transactionHash,
    error: evidence.status === "failed" ? "swap_reverted" : null,
    confirmedAt: evidence.status === "confirmed" ? new Date() : null,
    preview: finalPreview,
  }).where(and(
    eq(agentEvmCalls.id, input.previewId),
    eq(agentEvmCalls.userId, input.userId),
    sql`${agentEvmCalls.preview}->>'transactionHash' = ${transactionHash}`,
    sql`${agentEvmCalls.preview}->>'status' = 'submitted'`,
  )).returning({ preview: agentEvmCalls.preview });
  if (updated) return updated.preview as unknown as PangolinSwapPreview;

  const terminal = await loadPreview();
  const terminalHash = terminal.transactionHash?.toLowerCase() ?? null;
  if (terminalHash !== transactionHash) throw new Error("fuji_swap_preview_already_consumed");
  return { ...terminal, replayProtected: true };
}
