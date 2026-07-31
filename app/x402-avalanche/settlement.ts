import type { PaymentPayload, PaymentRequirements, SettleResponse } from "@x402/core/types";
import {
  type EvmErc20TransferConfirmation,
  confirmEvmErc20Transfer,
} from "@/app/wallets/evm-rpc";
import { WALLET_NETWORKS } from "@/app/wallets/networks";
import { BYTES32 } from "./config";
import type { AvalancheX402Facilitator } from "./facilitator";
import {
  type AvalancheX402Row,
  type SqlClient,
  claimAvalancheX402Settlement,
  markAvalancheX402Terminal,
  recordAvalancheX402Settlement,
} from "./store";

export type AvalancheX402SettlementOutcome =
  | { kind: "verification_failed"; payment: AvalancheX402Row }
  | { kind: "settled"; payment: AvalancheX402Row };

/**
 * Only an explicit facilitator rejection is a definitive "not settled" answer.
 * Everything else (5xx, network failure, timeout/abort, malformed payload, or
 * a record conflict after settle) is ambiguous: the transfer may already be
 * broadcast, so the payment is quarantined for reconciliation instead of being
 * failed or left wedged in `settling`. When in doubt, quarantine.
 */
const DEFINITIVE_FACILITATOR_REJECTIONS = new Set([400, 402, 422]);

function isDefinitiveFacilitatorRejection(message: string) {
  const match = /^avalanche_x402_facilitator_http_(\d{3})(?::[a-zA-Z0-9_.:-]+)?$/.exec(message);
  return match !== null && DEFINITIVE_FACILITATOR_REJECTIONS.has(Number(match[1]));
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function quarantine(
  input: { userId: string; paymentId: string; cause: string },
  sql: SqlClient | undefined,
): Promise<Error> {
  const message = `avalanche_x402_settle_ambiguous:${input.cause}`;
  await markAvalancheX402Terminal({
    userId: input.userId,
    paymentId: input.paymentId,
    status: "reconciliation_required",
    error: message,
  }, sql);
  return new Error(message);
}

/**
 * A `success: true` settle payload must bind to the persisted payment before it
 * is recorded: the transaction must be a usable Fuji hash, and any network or
 * payer the facilitator reported must match the frozen payment. A mismatch or
 * an unparseable payload is ambiguous, never a silent success.
 */
function settlementBindingProblem(
  settlement: SettleResponse,
  payment: AvalancheX402Row,
): string | null {
  if (
    typeof settlement.transaction !== "string" ||
    !BYTES32.test(settlement.transaction)
  ) return "settlement_payload_malformed";
  if (
    typeof settlement.network === "string" &&
    settlement.network !== payment.network
  ) return "settlement_network_mismatch";
  if (
    typeof settlement.payer === "string" &&
    settlement.payer.toLowerCase() !== payment.wallet_address.toLowerCase()
  ) return "settlement_payer_mismatch";
  return null;
}

/**
 * Reads the chain until the transfer is decided.
 *
 * The facilitator's word is a claim, not evidence. Nothing is recorded as
 * settled until the ERC-20 `Transfer` log for this exact payment is found in a
 * mined receipt. A receipt that has not appeared before the attempts run out
 * stays undecided — the caller quarantines it rather than guessing either way.
 */
async function confirmSettlementOnChain(
  payment: AvalancheX402Row,
  transactionHash: string,
  chain: AvalancheX402ChainVerifier,
): Promise<EvmErc20TransferConfirmation> {
  const expected = {
    token: payment.asset_contract,
    from: payment.wallet_address,
    to: payment.pay_to,
    amountAtomic: payment.amount_atomic,
  };
  let confirmation: EvmErc20TransferConfirmation = { kind: "pending" };
  for (let attempt = 0; attempt < chain.attempts; attempt += 1) {
    if (attempt > 0) await chain.wait(chain.delayMs);
    confirmation = await chain.confirm(transactionHash, expected);
    if (confirmation.kind !== "pending") return confirmation;
  }
  return confirmation;
}

export type AvalancheX402ChainVerifier = {
  confirm: (
    transactionHash: string,
    expected: { token: string; from: string; to: string; amountAtomic: string },
  ) => Promise<EvmErc20TransferConfirmation>;
  attempts: number;
  delayMs: number;
  wait: (ms: number) => Promise<void>;
};

export function createAvalancheX402ChainVerifier(
  overrides: Partial<AvalancheX402ChainVerifier> = {},
): AvalancheX402ChainVerifier {
  return {
    confirm: (transactionHash, expected) =>
      confirmEvmErc20Transfer(WALLET_NETWORKS["avalanche:fuji"], transactionHash, expected),
    attempts: 10,
    delayMs: 1_500,
    wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    ...overrides,
  };
}

export async function executeAvalancheX402Settlement(
  input: {
    userId: string;
    paymentId: string;
    payload: PaymentPayload;
    requirement: PaymentRequirements;
  },
  deps: {
    facilitator: AvalancheX402Facilitator;
    sql?: SqlClient;
    chain?: AvalancheX402ChainVerifier;
  },
): Promise<AvalancheX402SettlementOutcome> {
  const { userId, paymentId } = input;
  const verification = await deps.facilitator.verify(input.payload, input.requirement);
  if (!verification.isValid) {
    const payment = await markAvalancheX402Terminal({
      userId,
      paymentId,
      status: "failed",
      error: verification.invalidReason ?? "avalanche_x402_verification_failed",
    }, deps.sql);
    return { kind: "verification_failed", payment };
  }

  let payment = await claimAvalancheX402Settlement(userId, paymentId, deps.sql);
  if (payment.status !== "settling") return { kind: "settled", payment };

  let settlement: SettleResponse;
  try {
    settlement = await deps.facilitator.settle(input.payload, input.requirement);
  } catch (error) {
    const message = errorMessage(error, "avalanche_x402_settle_ambiguous");
    if (isDefinitiveFacilitatorRejection(message)) {
      await markAvalancheX402Terminal({
        userId,
        paymentId,
        status: "failed",
        error: message,
      }, deps.sql);
      throw new Error(message);
    }
    throw await quarantine({ userId, paymentId, cause: message }, deps.sql);
  }

  if (settlement.success === false) {
    const reason = settlement.errorReason ?? "avalanche_x402_settlement_failed";
    await markAvalancheX402Terminal({
      userId,
      paymentId,
      status: reason.toLowerCase().includes("revert") ? "reverted" : "failed",
      error: reason,
    }, deps.sql);
    throw new Error(reason);
  }
  if (settlement.success !== true) {
    throw await quarantine({ userId, paymentId, cause: "settlement_payload_malformed" }, deps.sql);
  }

  const problem = settlementBindingProblem(settlement, payment);
  if (problem !== null) throw await quarantine({ userId, paymentId, cause: problem }, deps.sql);

  // The facilitator says it settled. Ask the chain before believing it.
  const chain = deps.chain ?? createAvalancheX402ChainVerifier();
  let confirmation: EvmErc20TransferConfirmation;
  try {
    confirmation = await confirmSettlementOnChain(payment, settlement.transaction, chain);
  } catch (error) {
    throw await quarantine({
      userId,
      paymentId,
      cause: errorMessage(error, "settlement_chain_unreachable"),
    }, deps.sql);
  }

  if (confirmation.kind === "reverted") {
    await markAvalancheX402Terminal({
      userId,
      paymentId,
      status: "reverted",
      error: "avalanche_x402_settlement_reverted_on_chain",
    }, deps.sql);
    throw new Error("avalanche_x402_settlement_reverted_on_chain");
  }
  // A facilitator success the chain contradicts, and a receipt that never
  // arrived, are both unresolved by us — quarantine, never silently deliver.
  if (confirmation.kind === "mismatch") {
    throw await quarantine({ userId, paymentId, cause: confirmation.reason }, deps.sql);
  }
  if (confirmation.kind !== "confirmed") {
    throw await quarantine({ userId, paymentId, cause: "settlement_unconfirmed_on_chain" }, deps.sql);
  }

  try {
    payment = await recordAvalancheX402Settlement({
      userId,
      paymentId,
      settlement,
      transactionHash: settlement.transaction,
    }, deps.sql);
  } catch (error) {
    throw await quarantine({
      userId,
      paymentId,
      cause: errorMessage(error, "avalanche_x402_settlement_state_conflict"),
    }, deps.sql);
  }
  return { kind: "settled", payment };
}
