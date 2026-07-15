import { createHash, randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { evaluateUserAction } from "@/app/agent-memory-store";
import {
  attachStellarSignature,
  submitPreparedDefindexTransaction,
  transactionFromXdr,
} from "@/app/connectors/defindex";
import {
  getStellarTestnetAccount,
  signStellarTransactionHash,
  verifyPrivyAccessToken,
} from "@/app/privy-stellar";
import {
  X402_TESTNET_RESOURCE,
  X402_TESTNET_USDC,
} from "@/app/x402/assets";
import { createPrivyX402Signer } from "@/app/x402/privy-signer";
import { prepareX402UsdcTrustline } from "@/app/x402/trustline";
import {
  freezeRequirement,
  inspectX402Resource,
  payX402Resource,
  type FrozenX402Requirement,
} from "@/app/x402/protocol";
import { getDatabaseUrl, getDb, hasDatabase } from "@/db";
import {
  agentActivities,
  agentStellarActions,
  agentWallets,
  agentX402Payments,
} from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const prepareSchema = z.object({
  action: z.literal("prepare"),
  requestId: z.string().trim().min(8).max(100),
});
const prepareTrustlineSchema = z.object({
  action: z.literal("prepare_trustline"),
  requestId: z.string().trim().min(8).max(100),
});
const executeTrustlineSchema = z.object({
  action: z.literal("execute_trustline"),
  approvalId: z.string().uuid(),
  explicitConfirmation: z.literal(true),
});
const executeSchema = z.object({
  action: z.literal("execute"),
  paymentId: z.string().uuid(),
  explicitConfirmation: z.literal(true),
});

let schemaPromise: Promise<void> | null = null;
async function ensureSchema() {
  if (schemaPromise) return schemaPromise;
  schemaPromise = (async () => {
    const url = getDatabaseUrl();
    if (!url) throw new Error("database_not_configured");
    const sql = neon(url);
    await sql.query(`CREATE TABLE IF NOT EXISTS agent_x402_payments (
      id text PRIMARY KEY,
      user_id text NOT NULL REFERENCES agent_users(id) ON DELETE CASCADE,
      wallet_id text NOT NULL,
      wallet_address text NOT NULL,
      resource_url text NOT NULL,
      network text NOT NULL,
      asset_contract text NOT NULL,
      pay_to text NOT NULL,
      amount_atomic numeric(30,0) NOT NULL,
      amount_display numeric(20,7) NOT NULL,
      status text NOT NULL DEFAULT 'prepared',
      idempotency_key text NOT NULL,
      payment_required jsonb NOT NULL,
      settlement jsonb,
      transaction_hash text,
      resource_preview text,
      expires_at timestamptz NOT NULL,
      error text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      confirmed_at timestamptz
    )`, []);
    await sql.query("CREATE UNIQUE INDEX IF NOT EXISTS agent_x402_payments_idempotency_uidx ON agent_x402_payments(idempotency_key)", []);
    await sql.query("CREATE UNIQUE INDEX IF NOT EXISTS agent_x402_payments_tx_hash_uidx ON agent_x402_payments(transaction_hash)", []);
    await sql.query("CREATE INDEX IF NOT EXISTS agent_x402_payments_user_created_idx ON agent_x402_payments(user_id, created_at)", []);
    await sql.query("CREATE INDEX IF NOT EXISTS agent_x402_payments_status_idx ON agent_x402_payments(status)", []);
  })().catch((error) => {
    schemaPromise = null;
    throw error;
  });
  return schemaPromise;
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  return !origin || !host || new URL(origin).host === host;
}
function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
}
async function auth(request: Request) {
  if (!sameOrigin(request)) throw new Error("invalid_origin");
  const accessToken = bearerToken(request);
  const claims = await verifyPrivyAccessToken(accessToken);
  return { userId: claims.user_id, accessToken };
}
async function userWallet(userId: string) {
  if (!hasDatabase()) throw new Error("database_not_configured");
  await ensureSchema();
  const rows = await getDb()
    .select({ id: agentWallets.id, address: agentWallets.address, network: agentWallets.network })
    .from(agentWallets)
    .where(eq(agentWallets.userId, userId))
    .limit(1);
  if (!rows[0] || rows[0].network !== "stellar:testnet") {
    throw new Error("stellar_wallet_not_ready");
  }
  return rows[0];
}
function publicPayment(row: typeof agentX402Payments.$inferSelect) {
  return {
    id: row.id,
    resourceUrl: row.resourceUrl,
    network: row.network,
    asset: "USDC",
    assetContract: row.assetContract,
    payTo: row.payTo,
    amount: row.amountDisplay,
    status: row.status,
    transactionHash: row.transactionHash,
    explorerUrl: row.transactionHash
      ? `https://stellar.expert/explorer/testnet/tx/${row.transactionHash}`
      : null,
    resourcePreview: row.resourcePreview,
    expiresAt: row.expiresAt.toISOString(),
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    error: row.error,
  };
}
function publicTrustline(row: typeof agentStellarActions.$inferSelect) {
  return {
    id: row.id,
    status: row.status,
    transactionHash: row.transactionHash,
    explorerUrl: row.transactionHash ? `https://stellar.expert/explorer/testnet/tx/${row.transactionHash}` : null,
    preview: row.preview,
    expiresAt: row.expiresAt.toISOString(),
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    error: row.error,
  };
}
async function findTrustline(userId: string, id: string) {
  const rows = await getDb().select().from(agentStellarActions).where(and(
    eq(agentStellarActions.id, id), eq(agentStellarActions.userId, userId),
  )).limit(1);
  if (!rows[0] || rows[0].action !== "x402_usdc_trustline") throw new Error("x402_trustline_not_found");
  return rows[0];
}
async function findPayment(userId: string, id: string) {
  const rows = await getDb().select().from(agentX402Payments).where(and(
    eq(agentX402Payments.id, id),
    eq(agentX402Payments.userId, userId),
  )).limit(1);
  if (!rows[0]) throw new Error("x402_payment_not_found");
  return rows[0];
}

export async function GET(request: Request) {
  try {
    const { userId } = await auth(request);
    const wallet = await userWallet(userId);
    const account = await getStellarTestnetAccount(wallet.address);
    const usdc = account.balances.find(
      (balance) => balance.asset === "USDC" && balance.issuer === X402_TESTNET_USDC.issuer,
    );
    const recent = await getDb().select().from(agentX402Payments)
      .where(eq(agentX402Payments.userId, userId))
      .orderBy(desc(agentX402Payments.createdAt)).limit(5);
    return NextResponse.json({
      wallet: { address: wallet.address, exists: account.exists },
      x402Usdc: {
        trustlineActive: Boolean(usdc),
        balance: usdc?.balance ?? "0",
        issuer: X402_TESTNET_USDC.issuer,
        contract: X402_TESTNET_USDC.contract,
        faucetUrl: X402_TESTNET_USDC.faucetUrl,
      },
      resource: X402_TESTNET_RESOURCE,
      recent: recent.map(publicPayment),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "x402_status_failed" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId, accessToken } = await auth(request);
    const wallet = await userWallet(userId);
    const body = await request.json();
    const executeTrustline = executeTrustlineSchema.safeParse(body);
    if (executeTrustline.success) {
      let action = await findTrustline(userId, executeTrustline.data.approvalId);
      if (action.status === "confirmed") return NextResponse.json({ replayed: true, approval: publicTrustline(action) });
      if (action.expiresAt.getTime() <= Date.now()) throw new Error("x402_trustline_approval_expired");
      const transaction = transactionFromXdr(action.preparedXdr);
      const signature = await signStellarTransactionHash({
        userId, accessToken, walletId: action.walletId, address: action.walletAddress,
        hash: transaction.hash(), idempotencyKey: action.idempotencyKey,
      });
      const signed = attachStellarSignature(action.preparedXdr, action.walletAddress, signature);
      const result = await submitPreparedDefindexTransaction({ action: "usdc_trustline", signedXdr: signed.toXDR() });
      const now = new Date();
      await getDb().update(agentStellarActions).set({
        signedXdr: signed.toXDR(), transactionHash: result.hash, status: "confirmed",
        confirmedAt: now, updatedAt: now, error: null,
      }).where(eq(agentStellarActions.id, action.id));
      action = await findTrustline(userId, action.id);
      return NextResponse.json({ replayed: false, approval: publicTrustline(action) });
    }

    const prepareTrustline = prepareTrustlineSchema.safeParse(body);
    if (prepareTrustline.success) {
      const account = await getStellarTestnetAccount(wallet.address);
      const existing = account.balances.find((balance) => balance.asset === "USDC" && balance.issuer === X402_TESTNET_USDC.issuer);
      if (existing) return NextResponse.json({ alreadyComplete: true, balance: existing.balance });
      const decision = await evaluateUserAction(userId, { actionType: "stellar.trustline.x402_usdc", network: "stellar:testnet", asset: "USDC", amount: 0, financial: true, irreversible: true });
      if (!decision.allowed) return NextResponse.json({ error: "x402_policy_blocked", decision }, { status: 403 });
      const prepared = await prepareX402UsdcTrustline(wallet.address);
      const key = createHash("sha256").update(`x402-trustline:${userId}:${prepareTrustline.data.requestId}`).digest("hex");
      await getDb().insert(agentStellarActions).values({
        id: randomUUID(), userId, walletId: wallet.id, walletAddress: wallet.address,
        action: "x402_usdc_trustline", asset: "USDC", amount: "0", status: "prepared",
        idempotencyKey: key, preparedXdr: prepared.xdr, transactionHash: prepared.transactionHash,
        preview: prepared.preview, expiresAt: prepared.expiresAt,
      }).onConflictDoNothing({ target: agentStellarActions.idempotencyKey });
      const rows = await getDb().select().from(agentStellarActions).where(eq(agentStellarActions.idempotencyKey, key)).limit(1);
      return NextResponse.json({ alreadyComplete: false, decision, approval: publicTrustline(rows[0]) });
    }
    const execute = executeSchema.safeParse(body);
    if (execute.success) {
      let payment = await findPayment(userId, execute.data.paymentId);
      if (payment.status === "confirmed") {
        return NextResponse.json({ replayed: true, payment: publicPayment(payment) });
      }
      if (payment.expiresAt.getTime() <= Date.now()) throw new Error("x402_approval_expired");
      const frozen = payment.paymentRequired as FrozenX402Requirement;
      const signer = createPrivyX402Signer({
        userId,
        accessToken,
        walletId: payment.walletId,
        address: payment.walletAddress,
        paymentId: payment.id,
      });
      await getDb().update(agentX402Payments).set({ status: "signing", updatedAt: new Date(), error: null }).where(eq(agentX402Payments.id, payment.id));
      try {
        const result = await payX402Resource({ resourceUrl: payment.resourceUrl, signer, frozen });
        const transactionHash = result.settlement?.transaction ?? null;
        const now = new Date();
        await getDb().update(agentX402Payments).set({
          status: "confirmed",
          settlement: result.settlement as unknown as Record<string, unknown> | null,
          transactionHash,
          resourcePreview: result.resourcePreview,
          confirmedAt: now,
          updatedAt: now,
          error: null,
        }).where(eq(agentX402Payments.id, payment.id));
        await getDb().insert(agentActivities).values({
          id: randomUUID(), userId, eventType: "x402.payment.confirmed",
          summary: "Paid the Stellar x402 Testnet demo with Privy",
          metadata: { paymentId: payment.id, transactionHash, amount: payment.amountDisplay, asset: "USDC" },
        });
      } catch (error) {
        await getDb().update(agentX402Payments).set({ status: "failed", error: error instanceof Error ? error.message : "x402_payment_failed", updatedAt: new Date() }).where(eq(agentX402Payments.id, payment.id));
        throw error;
      }
      payment = await findPayment(userId, payment.id);
      return NextResponse.json({ replayed: false, payment: publicPayment(payment) });
    }

    const prepare = prepareSchema.safeParse(body);
    if (!prepare.success) throw new Error("invalid_x402_request");
    const challenge = await inspectX402Resource(X402_TESTNET_RESOURCE);
    const decision = await evaluateUserAction(userId, {
      actionType: "x402.payment",
      network: challenge.requirement.network,
      asset: "USDC",
      amount: Number(challenge.amountDisplay),
      financial: true,
      irreversible: true,
    });
    if (!decision.allowed) {
      return NextResponse.json({ error: "x402_policy_blocked", decision }, { status: 403 });
    }
    const key = createHash("sha256").update(`x402:${userId}:${prepare.data.requestId}`).digest("hex");
    await getDb().insert(agentX402Payments).values({
      id: randomUUID(), userId, walletId: wallet.id, walletAddress: wallet.address,
      resourceUrl: X402_TESTNET_RESOURCE,
      network: challenge.requirement.network,
      assetContract: challenge.requirement.asset,
      payTo: challenge.requirement.payTo,
      amountAtomic: challenge.requirement.amount,
      amountDisplay: challenge.amountDisplay,
      status: "prepared",
      idempotencyKey: key,
      paymentRequired: freezeRequirement(challenge.requirement),
      expiresAt: new Date(Date.now() + 5 * 60_000),
    }).onConflictDoNothing({ target: agentX402Payments.idempotencyKey });
    const rows = await getDb().select().from(agentX402Payments).where(eq(agentX402Payments.idempotencyKey, key)).limit(1);
    return NextResponse.json({ replayed: rows[0].createdAt.getTime() < Date.now() - 2_000, decision, payment: publicPayment(rows[0]) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "x402_request_failed";
    const status = message.includes("authorization") ? 401 : message.includes("expired") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
