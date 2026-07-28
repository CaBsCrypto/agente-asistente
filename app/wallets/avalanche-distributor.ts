import { createHmac } from "node:crypto";
import { z } from "zod";
import { getEvmTransactionEvidence } from "@/app/wallets/evm-rpc";
import { getWalletNetwork } from "@/app/wallets/networks";
import {
  type EnabledFujiDistributorConfig,
  FUJI_CHAIN_ID,
  FUJI_DISTRIBUTION_AMOUNT,
} from "@/app/wallets/avalanche-policy";

const evmAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
const hashSchema = z.string().regex(/^0x[a-fA-F0-9]{64}$/);
const responseSchema = z.object({
  status: z.enum(["submitted", "confirmed"]),
  transactionHash: hashSchema,
  chainId: z.literal(FUJI_CHAIN_ID),
  amount: z.literal(FUJI_DISTRIBUTION_AMOUNT),
  recipient: evmAddressSchema,
  claimKey: z.string().regex(/^[a-f0-9]{64}$/),
  idempotencyKey: z.string().min(16).max(128),
  replayed: z.boolean(),
  dailyClaims: z.number().int().min(1),
}).strict();

export type FujiDripReceipt = z.infer<typeof responseSchema> & {
  explorerUrl: string;
};

export function createFujiClaimKey(userId: string, secret: string) {
  if (!userId.trim()) throw new Error("fuji_distributor_user_invalid");
  if (secret.length < 32) throw new Error("fuji_distributor_secret_invalid");
  return createHmac("sha256", secret)
    .update(`fuji-drip:v1:${userId}`)
    .digest("hex");
}

export async function requestFujiDrip(input: {
  config: EnabledFujiDistributorConfig;
  userId: string;
  recipient: string;
  explicitUserConfirmation: true;
  fetcher?: typeof fetch;
  rpcFetcher?: typeof fetch;
}): Promise<FujiDripReceipt> {
  const recipient = evmAddressSchema.parse(input.recipient).toLowerCase();
  if (input.explicitUserConfirmation !== true) {
    throw new Error("fuji_distributor_confirmation_required");
  }
  const claimKey = createFujiClaimKey(input.userId, input.config.secret);
  const idempotencyKey = `fuji-drip-v1-${claimKey}`;
  const fetcher = input.fetcher ?? fetch;
  let response: Response;
  try {
    response = await fetcher(input.config.endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${input.config.secret}`,
        "content-type": "application/json",
        accept: "application/json",
        "idempotency-key": idempotencyKey,
      },
      body: JSON.stringify({
        protocol: input.config.protocol,
        chainId: input.config.chainId,
        amount: input.config.amount,
        recipient,
        claimKey,
        idempotencyKey,
        claimWindow: "once_per_authenticated_user",
        dailyLimit: input.config.dailyLimit,
      }),
      signal: AbortSignal.timeout(input.config.timeoutMs),
      redirect: "error",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("fuji_distributor_timeout");
    }
    throw new Error("fuji_distributor_unreachable");
  }
  if (!response.ok) {
    throw new Error(response.status === 409
      ? "fuji_distributor_claim_already_used"
      : response.status === 429
        ? "fuji_distributor_daily_limit_reached"
        : "fuji_distributor_rejected");
  }

  const receipt = responseSchema.parse(await response.json());
  if (
    receipt.recipient.toLowerCase() !== recipient
    || receipt.claimKey !== claimKey
    || receipt.idempotencyKey !== idempotencyKey
    || receipt.dailyClaims > input.config.dailyLimit
  ) {
    throw new Error("fuji_distributor_receipt_mismatch");
  }

  let evidence;
  try {
    evidence = await getEvmTransactionEvidence(
      getWalletNetwork("avalanche:fuji"),
      receipt.transactionHash,
      input.rpcFetcher ?? fetch,
    );
  } catch (error) {
    if (error instanceof Error && error.message === "evm_transaction_not_found") {
      throw new Error("fuji_distributor_transaction_pending");
    }
    throw error;
  }
  if (
    evidence.chainId !== FUJI_CHAIN_ID
    || evidence.transactionChainId !== FUJI_CHAIN_ID
    || evidence.transactionHash !== receipt.transactionHash.toLowerCase()
    || evidence.to?.toLowerCase() !== recipient
    || evidence.valueWei !== "5000000000000000"
  ) {
    throw new Error("fuji_distributor_onchain_mismatch");
  }
  if (evidence.receiptStatus === null) {
    throw new Error("fuji_distributor_transaction_pending");
  }
  if (evidence.receiptStatus !== "0x1") {
    throw new Error("fuji_distributor_transaction_failed");
  }
  return {
    ...receipt,
    status: "confirmed",
    recipient,
    explorerUrl: `https://subnets-test.avax.network/c-chain/tx/${receipt.transactionHash}`,
  };
}
