import { NextResponse } from "next/server";
import { z } from "zod";
import { evaluateUserAction } from "@/app/agent-memory-store";
import { buildCctpFujiToStellarPlan, CCTP_TESTNET } from "@/app/connectors/circle-cctp";
import { getCctpFujiToStellarContext } from "@/app/connectors/circle-cctp-context";
import { listPersistedUserWallets } from "@/app/multichain-account";
import { verifyPrivyAccessToken } from "@/app/privy-stellar";
import { getCctpAllowance, prepareCctpEvmPreview, verifyCctpEvmTransaction } from "@/app/cctp/evm";
import { getCctpAttestation } from "@/app/cctp/attestation";
import {
  prepareCctpMintAndForward,
  signCctpMintAndForward,
  submitCctpMintAndForward,
} from "@/app/cctp/stellar";
import {
  bindCctpEvmHash,
  completeCctpMint,
  confirmCctpEvm,
  findCctpTransfer,
  prepareCctpTransfer,
  quarantineCctpTransfer,
  refreshCctpEvmPreview,
  saveCctpAttestation,
  saveCctpEvmPreview,
  saveCctpMintPreview,
  stageCctpMintSubmission,
  type CctpTransferRow,
} from "@/app/cctp/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TESTNET_USDC = 5;
const hashSchema = z.string().regex(/^0x[a-fA-F0-9]{64}$/);
const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("prepare"),
    amount: z.string().trim().min(1).max(32),
    requestId: z.string().min(8).max(128),
    explicitUserConfirmation: z.literal(true),
  }).strict(),
  z.object({
    action: z.literal("prepare_next"),
    transferId: z.string().startsWith("cctp_"),
  }).strict(),
  z.object({
    action: z.literal("refresh_evm"),
    transferId: z.string().startsWith("cctp_"),
  }).strict(),
  z.object({
    action: z.literal("record_evm"),
    transferId: z.string().startsWith("cctp_"),
    kind: z.enum(["approve", "burn"]),
    transactionHash: hashSchema,
  }).strict(),
  z.object({
    action: z.literal("attestation"),
    transferId: z.string().startsWith("cctp_"),
  }).strict(),
  z.object({
    action: z.literal("execute_mint"),
    transferId: z.string().startsWith("cctp_"),
    explicitUserConfirmation: z.literal(true),
    signature: z.string().regex(/^0x[0-9a-fA-F]{128}$/),
  }).strict(),
]);

function bearerToken(request: Request) {
  const value = request.headers.get("authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function publicTransfer(row: CctpTransferRow) {
  return {
    id: row.id,
    status: row.status,
    amountAtomic: row.amount_atomic,
    amount: (Number(row.amount_atomic) / 1_000_000).toFixed(6),
    sourceAddress: row.source_address,
    destinationAddress: row.destination_address,
    evm: row.evm_preview,
    approveTransactionHash: row.approve_tx_hash,
    burnTransactionHash: row.burn_tx_hash,
    mintTransactionHash: row.mint_tx_hash,
    mint: row.status === "mint_prepared" ||
      row.status === "mint_submitted"
      ? {
      signingHash: row.mint_signing_hash,
      signingAddress: row.destination_address,
      network: "stellar:testnet",
      contract: CCTP_TESTNET.stellar.cctpForwarder,
      method: "mint_and_forward",
    } : null,
    error: row.error,
  };
}

function nextActionFor(row: CctpTransferRow): string | null {
  switch (row.status) {
    case "approve_prepared": return "approve";
    case "approve_submitted": return row.approve_tx_hash ? "verify_approve" : "reconciliation";
    case "approve_confirmed": return "prepare_next";
    case "burn_prepared": return "burn";
    case "burn_submitted": return row.burn_tx_hash ? "verify_burn" : "reconciliation";
    case "attesting": return "attestation";
    case "mint_prepared": return "mint";
    case "mint_submitted": return "mint";
    case "completed": return null;
    case "reconciliation_required":
    case "failed":
      return "reconciliation";
    default:
      return "prepare_next";
  }
}

async function prepareNext(userId: string, row: CctpTransferRow) {
  if (
    row.status === "approve_prepared" ||
    row.status === "burn_prepared" ||
    row.status === "mint_prepared" ||
    row.status === "completed"
  ) return row;
  if (row.status !== "draft" && row.status !== "approve_confirmed") {
    throw new Error(`cctp_prepare_next_not_allowed:${row.status}`);
  }
  const plan = row.plan as ReturnType<typeof buildCctpFujiToStellarPlan>;
  const allowance = await getCctpAllowance(row.source_address as `0x${string}`);
  const kind = allowance >= BigInt(row.amount_atomic) ? "burn" : "approve";
  const preview = await prepareCctpEvmPreview({
    kind,
    walletAddress: row.source_address as `0x${string}`,
    amountAtomic: row.amount_atomic,
    mintRecipient: plan.safety.mintRecipient,
    destinationCaller: plan.safety.destinationCaller,
    hookData: plan.safety.hookData,
  });
  return saveCctpEvmPreview({ userId, transferId: row.id, preview });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }
  let userId = "";
  let activeTransferId: string | null = null;
  try {
    const claims = await verifyPrivyAccessToken(bearerToken(request));
    userId = claims.user_id;
    const parsed = requestSchema.parse(await request.json());
    if (parsed.action === "prepare") {
      const amount = Number(parsed.amount.replace(",", "."));
      if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_TESTNET_USDC) {
        throw new Error("cctp_testnet_amount_out_of_range");
      }
      const [readiness, wallets] = await Promise.all([
        getCctpFujiToStellarContext(userId),
        listPersistedUserWallets(userId),
      ]);
      if (!readiness.sourceAddress || !readiness.destinationAddress) {
        throw new Error("cctp_wallets_not_activated");
      }
      const source = wallets.find(
        (wallet) =>
          wallet.network === "avalanche:fuji" &&
          wallet.address.toLowerCase() === readiness.sourceAddress?.toLowerCase(),
      );
      const destination = wallets.find(
        (wallet) =>
          wallet.network === "stellar:testnet" &&
          wallet.address === readiness.destinationAddress,
      );
      if (!source || !destination) throw new Error("cctp_wallet_ownership_mismatch");
      const plan = buildCctpFujiToStellarPlan({
        amount: parsed.amount,
        sourceAddress: source.address,
        destinationAddress: destination.address,
        readiness,
      });
      const nonTrustlineBlockers = plan.blockers.filter(
        (blocker) => blocker !== "stellar_circle_usdc_trustline_required",
      );
      if (nonTrustlineBlockers.length) {
        return NextResponse.json({
          error: "cctp_readiness_blocked",
          blockers: nonTrustlineBlockers,
        }, { status: 409 });
      }
      const decision = await evaluateUserAction(userId, {
        actionType: "cctp.bridge",
        network: "avalanche:fuji->stellar:testnet",
        asset: "USDC",
        amount,
        financial: true,
        irreversible: true,
      });
      if (!decision.allowed) {
        return NextResponse.json({ error: "cctp_policy_blocked", decision }, { status: 403 });
      }
      const prepared = await prepareCctpTransfer({
        userId,
        requestId: parsed.requestId,
        sourceWalletId: source.id,
        sourceAddress: source.address,
        destinationWalletId: destination.id,
        destinationAddress: destination.address,
        amountAtomic: plan.amountAtomic,
        plan,
      });
      activeTransferId = prepared.row.id;
      if (!readiness.destinationTrustlineReady) {
        return NextResponse.json({
          transfer: publicTransfer(prepared.row),
          nextAction: "stellar_trustline",
          replayed: prepared.replayed,
        });
      }
      const next = prepared.row.status === "draft" ||
        prepared.row.status === "approve_confirmed"
        ? await prepareNext(userId, prepared.row)
        : prepared.row;
      return NextResponse.json({
        transfer: publicTransfer(next),
        nextAction: nextActionFor(next),
        replayed: prepared.replayed,
      });
    }

    activeTransferId = parsed.transferId;
    let row = await findCctpTransfer(userId, parsed.transferId);
    if (parsed.action === "prepare_next") {
      row = await prepareNext(userId, row);
      return NextResponse.json({
        transfer: publicTransfer(row),
        nextAction: nextActionFor(row),
      });
    }
    if (parsed.action === "refresh_evm") {
      if (
        !row.evm_preview ||
        (row.status !== "approve_prepared" && row.status !== "burn_prepared")
      ) {
        throw new Error(`cctp_evm_refresh_not_allowed:${row.status}`);
      }
      const plan = row.plan as ReturnType<typeof buildCctpFujiToStellarPlan>;
      const preview = await prepareCctpEvmPreview({
        kind: row.evm_preview.kind,
        walletAddress: row.source_address as `0x${string}`,
        amountAtomic: row.amount_atomic,
        mintRecipient: plan.safety.mintRecipient,
        destinationCaller: plan.safety.destinationCaller,
        hookData: plan.safety.hookData,
      });
      row = await refreshCctpEvmPreview({
        userId,
        transferId: row.id,
        preview,
      });
      return NextResponse.json({
        transfer: publicTransfer(row),
        nextAction: nextActionFor(row),
      });
    }
    if (parsed.action === "record_evm") {
      if (!row.evm_preview || row.evm_preview.kind !== parsed.kind) {
        throw new Error("cctp_evm_preview_mismatch");
      }
      row = await bindCctpEvmHash({
        userId,
        transferId: row.id,
        kind: parsed.kind,
        transactionHash: parsed.transactionHash,
      });
      await verifyCctpEvmTransaction(
        row.evm_preview!,
        parsed.transactionHash as `0x${string}`,
      );
      row = await confirmCctpEvm({ userId, transferId: row.id, kind: parsed.kind });
      if (parsed.kind === "approve") row = await prepareNext(userId, row);
      return NextResponse.json({
        transfer: publicTransfer(row),
        nextAction: nextActionFor(row),
      });
    }
    if (parsed.action === "attestation") {
      if (row.status === "mint_prepared" || row.status === "completed") {
        return NextResponse.json({ transfer: publicTransfer(row), nextAction: "mint" });
      }
      if (row.status !== "attesting" || !row.burn_tx_hash) {
        throw new Error(`cctp_attestation_not_allowed:${row.status}`);
      }
      const result = await getCctpAttestation(row.burn_tx_hash as `0x${string}`);
      if (result.status === "pending") {
        return NextResponse.json({
          transfer: publicTransfer(row),
          nextAction: "attestation",
          attestationStatus: "pending",
        }, { status: 202 });
      }
      row = await saveCctpAttestation({
        userId,
        transferId: row.id,
        message: result.message as `0x${string}`,
        attestation: result.attestation as `0x${string}`,
      });
      const mint = await prepareCctpMintAndForward({
        walletAddress: row.destination_address,
        message: result.message as `0x${string}`,
        attestation: result.attestation as `0x${string}`,
      });
      row = await saveCctpMintPreview({
        userId,
        transferId: row.id,
        xdr: mint.xdr,
        signingHash: mint.signingHash,
      });
      return NextResponse.json({
        transfer: publicTransfer(row),
        nextAction: "mint",
        attestationStatus: "complete",
      });
    }
    if (row.status === "completed") {
      return NextResponse.json({
        transfer: publicTransfer(row),
        nextAction: null,
        replayed: true,
      });
    }
    if (
      (row.status !== "mint_prepared" && row.status !== "mint_submitted") ||
      !row.mint_xdr ||
      !row.mint_signing_hash
    ) {
      throw new Error(`cctp_mint_not_prepared:${row.status}`);
    }
    const signed = signCctpMintAndForward({
      preparedXdr: row.mint_xdr,
      walletAddress: row.destination_address,
      signature: parsed.signature,
    });
    row = await stageCctpMintSubmission({
      userId,
      transferId: row.id,
      signedXdr: signed.signedXdr,
      expectedHash: signed.expectedHash,
    });
    try {
      const result = await submitCctpMintAndForward({
        signedXdr: row.mint_signed_xdr!,
        expectedHash: row.mint_expected_hash!,
      });
      row = await completeCctpMint({
        userId,
        transferId: row.id,
        transactionHash: result.hash,
      });
      return NextResponse.json({
        transfer: publicTransfer(row),
        nextAction: null,
        replayed: false,
        explorerUrl: `https://stellar.expert/explorer/testnet/tx/${result.hash}`,
      });
    } catch (error) {
      const code = error instanceof Error ? error.message : "cctp_mint_failed";
      if (code === "cctp_mint_failed_onchain") {
        await quarantineCctpTransfer({ userId, transferId: row.id, error: code });
      }
      throw error;
    }
  } catch (error) {
    const code = error instanceof z.ZodError
      ? "invalid_cctp_execution_request"
      : error instanceof Error
        ? error.message.split(":")[0]
        : "cctp_execution_failed";
    if (
      userId &&
      activeTransferId &&
      [
        "cctp_evm_receipt_scope_mismatch",
        "cctp_approve_reverted",
        "cctp_burn_reverted",
      ].includes(code)
    ) {
      await quarantineCctpTransfer({
        userId,
        transferId: activeTransferId,
        error: code,
      }).catch(() => null);
    }
    const status = code === "database_not_configured" ? 503
      : code.includes("not_found") ? 404
        : code.includes("blocked") || code.includes("not_allowed") ||
          code.includes("in_progress") || code.includes("reconciliation")
          ? 409
          : code.startsWith("cctp_attestation_") || code.startsWith("evm_")
            ? 502
            : code.startsWith("invalid_") || code.includes("mismatch") ||
              code.includes("out_of_range")
              ? 400
              : 401;
    return NextResponse.json({ error: code }, {
      status,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
