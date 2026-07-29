import { and, eq } from "drizzle-orm";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  commerce,
  FINAL_STATUSES,
  offers,
  publicIntent,
  type Intent,
  type Kind,
  type Offer,
  type Receipt,
} from "@/app/domain";
import {
  getPublishedServiceOffer,
  listPublishedServiceOffers,
} from "@/app/services/provider-store";
import { getDb, hasDatabase } from "@/db";
import {
  auditEvents,
  authorizations,
  commerceIntents,
  policyDecisions,
  receipts,
} from "@/db/schema";

const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");

async function resolveOffer(id: string): Promise<Offer> {
  const builtIn = offers.find((offer) => offer.id === id);
  if (builtIn) return builtIn;
  if (hasDatabase()) return getPublishedServiceOffer(id);
  throw new Error("offer_not_found");
}

// Scoped by actorId, always. An unscoped lookup let any caller who learned an
// intent id read, authorize and execute an intent belonging to someone else.
const toIntent = async (id: string, actorId: string): Promise<Intent> => {
  const db = getDb();
  const [row] = await db
    .select()
    .from(commerceIntents)
    .where(and(eq(commerceIntents.id, id), eq(commerceIntents.actorId, actorId)));
  if (!row) throw new Error("intent_not_found");
  const [policy] = await db
    .select()
    .from(policyDecisions)
    .where(eq(policyDecisions.intentId, id));
  const [authorization] = await db
    .select()
    .from(authorizations)
    .where(eq(authorizations.intentId, id));
  const [receipt] = await db
    .select()
    .from(receipts)
    .where(eq(receipts.intentId, id));

  return {
    id: row.id,
    offerId: row.offerId,
    actorId: row.actorId,
    amount: Number(row.amount),
    currency: "USDC",
    network: row.network as Intent["network"],
    status: row.status as Intent["status"],
    idempotencyKey: row.idempotencyKey,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    policy: policy
      ? {
          allowed: policy.allowed,
          reasons: policy.reasons,
          evaluatedAt: policy.evaluatedAt.toISOString(),
          policyVersion: "demo-v1",
        }
      : undefined,
    authorization: authorization
      ? {
          token: "",
          authorizedAt: authorization.authorizedAt.toISOString(),
          expiresAt: authorization.expiresAt.toISOString(),
        }
      : undefined,
    receipt: receipt
      ? {
          id: receipt.id,
          intentId: receipt.intentId,
          status: "simulated-settled",
          network: receipt.network as Receipt["network"],
          amount: Number(receipt.amount),
          currency: "USDC",
          transactionRef: receipt.transactionRef,
          executedAt: receipt.executedAt.toISOString(),
          fulfillment: "pending-partner-confirmation",
          replayed: false,
        }
      : undefined,
  };
};

async function audit(
  intentId: string,
  eventType: string,
  actorId?: string,
  payload: Record<string, unknown> = {},
) {
  await getDb()
    .insert(auditEvents)
    .values({
      id: "evt_" + randomUUID(),
      intentId,
      eventType,
      actorId,
      payload,
    });
}

export const backend = {
  mode: () => (hasDatabase() ? "postgres" : "memory"),

  async searchOffers(query = "", kind?: Kind) {
    const builtIn = commerce.searchOffers(query, kind);
    if (!hasDatabase()) return builtIn;
    const providerOffers = await listPublishedServiceOffers(query, kind);
    return [...builtIn, ...providerOffers];
  },

  getOffer: resolveOffer,

  async createIntent(input: {
    offerId: string;
    actorId: string;
    idempotencyKey: string;
    amount?: number;
  }) {
    if (!hasDatabase()) return commerce.createIntent(input);
    const db = getDb();
    const offer = await resolveOffer(input.offerId);
    const now = Date.now();
    const id = "int_" + randomUUID();
    const inserted = await db
      .insert(commerceIntents)
      .values({
        id,
        offerId: offer.id,
        actorId: input.actorId,
        amount: String(input.amount ?? offer.amount),
        currency: "USDC",
        network: offer.network,
        status: "prepared",
        idempotencyKey: input.idempotencyKey,
        expiresAt: new Date(now + 900000),
      })
      .onConflictDoNothing({
        target: [commerceIntents.actorId, commerceIntents.idempotencyKey],
      })
      .returning({ id: commerceIntents.id });

    if (!inserted.length) {
      // Re-select under the caller's own actor. If nothing comes back, the key
      // belongs to a different actor under the old global unique index, and the
      // caller must not learn anything about that intent.
      const [existing] = await db
        .select({ id: commerceIntents.id })
        .from(commerceIntents)
        .where(
          and(
            eq(commerceIntents.actorId, input.actorId),
            eq(commerceIntents.idempotencyKey, input.idempotencyKey),
          ),
        );
      if (!existing) throw new Error("intent_conflict");
      return { intent: await toIntent(existing.id, input.actorId), replayed: true };
    }

    await audit(id, "intent.created", input.actorId, {
      offerId: offer.id,
    });
    return { intent: await toIntent(id, input.actorId), replayed: false };
  },

  async evaluatePolicy(id: string, actorId: string) {
    if (!hasDatabase()) return commerce.evaluatePolicy(id, actorId);
    const db = getDb();
    const intent = await toIntent(id, actorId);
    // Monotonic: re-evaluating must never walk an intent back from authorized,
    // executed or rejected. It used to reset an executed intent to
    // policy_approved, which contradicts the exactly-once guarantee.
    if (FINAL_STATUSES.has(intent.status)) throw new Error("intent_already_final");
    const reasons: string[] = [];
    if (Date.parse(intent.expiresAt) <= Date.now()) {
      reasons.push("intent_expired");
    }
    if (intent.amount < 0) reasons.push("invalid_amount");
    if (intent.amount > 100) reasons.push("demo_limit_exceeded");
    const allowed = !reasons.length;
    const finalReasons = reasons.length
      ? reasons
      : ["within_demo_limit", "supported_test_network"];

    await db
      .insert(policyDecisions)
      .values({
        id: "pol_" + randomUUID(),
        intentId: id,
        allowed,
        reasons: finalReasons,
        policyVersion: "demo-v1",
      })
      .onConflictDoUpdate({
        target: policyDecisions.intentId,
        set: { allowed, reasons: finalReasons, evaluatedAt: new Date() },
      });
    await db
      .update(commerceIntents)
      .set({
        status: allowed ? "policy_approved" : "rejected",
        updatedAt: new Date(),
      })
      .where(and(eq(commerceIntents.id, id), eq(commerceIntents.actorId, actorId)));
    await audit(id, "policy.evaluated", intent.actorId, {
      allowed,
      reasons: finalReasons,
    });
    return toIntent(id, actorId);
  },

  async authorize(id: string, actorId: string, confirmed: boolean) {
    if (!hasDatabase()) return commerce.authorize(id, actorId, confirmed);
    if (!confirmed) throw new Error("explicit_confirmation_required");
    const db = getDb();
    const intent = await toIntent(id, actorId);
    if (!intent.policy?.allowed || intent.status !== "policy_approved") {
      throw new Error("policy_approval_required");
    }
    const token = "auth_" + randomBytes(24).toString("base64url");
    const now = Date.now();
    await db
      .insert(authorizations)
      .values({
        id: "authz_" + randomUUID(),
        intentId: id,
        tokenHash: tokenHash(token),
        authorizedAt: new Date(now),
        expiresAt: new Date(now + 300000),
      })
      .onConflictDoUpdate({
        target: authorizations.intentId,
        set: {
          tokenHash: tokenHash(token),
          authorizedAt: new Date(now),
          expiresAt: new Date(now + 300000),
          revokedAt: null,
        },
      });
    await db
      .update(commerceIntents)
      .set({ status: "authorized", updatedAt: new Date() })
      .where(and(eq(commerceIntents.id, id), eq(commerceIntents.actorId, actorId)));
    await audit(id, "intent.authorized", intent.actorId);
    return { intent: await toIntent(id, actorId), token };
  },

  async execute(id: string, actorId: string, token: string) {
    if (!hasDatabase()) return commerce.execute(id, actorId, token);
    const db = getDb();
    const intent = await toIntent(id, actorId);
    const [authorization] = await db
      .select()
      .from(authorizations)
      .where(
        and(
          eq(authorizations.intentId, id),
          eq(authorizations.tokenHash, tokenHash(token)),
        ),
      );
    if (!authorization || authorization.revokedAt) {
      throw new Error("invalid_authorization");
    }
    if (authorization.expiresAt.getTime() <= Date.now()) {
      throw new Error("authorization_expired");
    }
    if (intent.status !== "authorized" && intent.status !== "executed") {
      throw new Error("authorization_required");
    }

    const digest = createHash("sha256")
      .update(intent.id + ":" + intent.idempotencyKey)
      .digest("hex");
    const receipt: Receipt = {
      id: "rcpt_" + digest.slice(0, 24),
      intentId: intent.id,
      status: "simulated-settled",
      network: intent.network,
      amount: intent.amount,
      currency: "USDC",
      transactionRef: "demo_" + digest,
      executedAt: new Date().toISOString(),
      fulfillment: "pending-partner-confirmation",
      replayed: false,
    };
    const inserted = await db
      .insert(receipts)
      .values({
        ...receipt,
        amount: String(receipt.amount),
        executedAt: new Date(receipt.executedAt),
      })
      .onConflictDoNothing({ target: receipts.intentId })
      .returning({ id: receipts.id });
    await db
      .update(commerceIntents)
      .set({ status: "executed", updatedAt: new Date() })
      .where(and(eq(commerceIntents.id, id), eq(commerceIntents.actorId, actorId)));
    if (inserted.length) {
      await audit(id, "execution.simulated", intent.actorId, {
        transactionRef: receipt.transactionRef,
      });
    }
    const latest = await toIntent(id, actorId);
    return { ...latest.receipt!, replayed: !inserted.length };
  },

  async getReceipt(id: string, actorId: string) {
    if (!hasDatabase()) return commerce.getReceipt(id, actorId);
    return (await toIntent(id, actorId)).receipt ?? null;
  },
};

export { publicIntent };
