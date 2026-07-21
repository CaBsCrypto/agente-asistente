// Resolve a Telegram chat identity to an agent user id.
// - Linked: telegram_links row → the user's real Privy account (shared wallet/memory/connections).
// - Standalone: a synthetic "tg:<id>" agent_users row so foreign keys hold and the user has their own state.
import { randomBytes, randomUUID } from "node:crypto";
import { and, desc, eq, gt, isNull, lt } from "drizzle-orm";

// Stale button actions are pruned after this long (best-effort, on write).
const PENDING_ACTION_TTL_MS = 24 * 60 * 60 * 1000;
import { getDb } from "@/db";
import {
  agentUsers,
  telegramLinkCodes,
  telegramLinks,
  telegramPendingActions,
} from "@/db/schema";

export function standaloneUserId(telegramUserId: string): string {
  return `tg:${telegramUserId}`;
}

async function ensureAgentUser(userId: string): Promise<void> {
  await getDb()
    .insert(agentUsers)
    .values({ id: userId })
    .onConflictDoNothing({ target: agentUsers.id });
}

// Returns the agent user id that owns this Telegram identity, creating a standalone user when unlinked.
export async function resolveTelegramUser(input: {
  telegramUserId: string;
  chatId: string | number;
  username?: string;
}): Promise<{ userId: string; linked: boolean }> {
  const db = getDb();
  const existing = await db
    .select({ userId: telegramLinks.userId })
    .from(telegramLinks)
    .where(and(
      eq(telegramLinks.telegramUserId, input.telegramUserId),
      eq(telegramLinks.status, "active"),
    ))
    .limit(1);
  if (existing[0]) {
    return { userId: existing[0].userId, linked: true };
  }
  const userId = standaloneUserId(input.telegramUserId);
  await ensureAgentUser(userId);
  return { userId, linked: false };
}

// Human-friendly one-time code: 8 chars, no ambiguous glyphs (0/O, 1/I).
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function newLinkCode(source: Uint8Array = randomBytes(8)): string {
  let code = "";
  for (const byte of source) code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return code.slice(0, 8);
}

// Web side: mint a one-time code the user pastes into the bot to link their account.
export async function generateTelegramLinkCode(
  userId: string,
  ttlMs = 15 * 60 * 1000,
): Promise<{ code: string; expiresAt: Date }> {
  const db = getDb();
  const code = newLinkCode();
  const expiresAt = new Date(Date.now() + ttlMs);
  await db.insert(telegramLinkCodes).values({ code, userId, expiresAt });
  // Best-effort: drop this user's expired codes so the table stays bounded.
  await db
    .delete(telegramLinkCodes)
    .where(and(eq(telegramLinkCodes.userId, userId), lt(telegramLinkCodes.expiresAt, new Date())))
    .catch(() => {});
  return { code, expiresAt };
}

// Web side: is a Telegram identity currently linked to this account?
export async function getTelegramLink(
  userId: string,
): Promise<{ linked: boolean; username?: string; linkedAt?: string }> {
  const rows = await getDb()
    .select({ username: telegramLinks.username, linkedAt: telegramLinks.linkedAt })
    .from(telegramLinks)
    .where(and(eq(telegramLinks.userId, userId), eq(telegramLinks.status, "active")))
    .orderBy(desc(telegramLinks.linkedAt))
    .limit(1);
  const row = rows[0];
  if (!row) return { linked: false };
  return {
    linked: true,
    username: row.username ?? undefined,
    linkedAt: row.linkedAt.toISOString(),
  };
}

// Is THIS Telegram identity linked to a web account? (Queried by telegram_user_id.)
export async function isTelegramLinked(telegramUserId: string): Promise<boolean> {
  const rows = await getDb()
    .select({ userId: telegramLinks.userId })
    .from(telegramLinks)
    .where(and(
      eq(telegramLinks.telegramUserId, telegramUserId),
      eq(telegramLinks.status, "active"),
    ))
    .limit(1);
  return rows.length > 0;
}

// Web side: revoke all Telegram links for this account.
export async function unlinkTelegramUser(userId: string): Promise<{ ok: true }> {
  await getDb()
    .update(telegramLinks)
    .set({ status: "revoked", updatedAt: new Date() })
    .where(eq(telegramLinks.userId, userId));
  return { ok: true };
}

// Redeem a web-generated one-time code to bind this Telegram identity to an existing Privy account.
export async function redeemLinkCode(input: {
  telegramUserId: string;
  chatId: string | number;
  username?: string;
  code: string;
}): Promise<{ userId: string }> {
  const db = getDb();
  const now = new Date();
  // Claim the code atomically: only an unused, unexpired code updates and returns.
  const claimed = await db
    .update(telegramLinkCodes)
    .set({ usedAt: now })
    .where(and(
      eq(telegramLinkCodes.code, input.code.toUpperCase()),
      isNull(telegramLinkCodes.usedAt),
      gt(telegramLinkCodes.expiresAt, now),
    ))
    .returning({ userId: telegramLinkCodes.userId });
  const match = claimed[0];
  if (!match) throw new Error("telegram_link_code_invalid");

  await db
    .insert(telegramLinks)
    .values({
      telegramUserId: input.telegramUserId,
      userId: match.userId,
      chatId: String(input.chatId),
      username: input.username,
      status: "active",
      linkedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: telegramLinks.telegramUserId,
      set: {
        userId: match.userId,
        chatId: String(input.chatId),
        username: input.username,
        status: "active",
        updatedAt: now,
      },
    });

  return { userId: match.userId };
}

// Persist a button's full message and return a short id for callback_data.
export async function storePendingAction(input: {
  telegramUserId: string;
  userId: string;
  message: string;
}): Promise<string> {
  const db = getDb();
  const id = randomUUID().replace(/-/g, "").slice(0, 16);
  await db.insert(telegramPendingActions).values({
    id,
    telegramUserId: input.telegramUserId,
    userId: input.userId,
    message: input.message,
  });
  // Best-effort: prune this user's stale (untapped) button actions so the table stays bounded.
  await db
    .delete(telegramPendingActions)
    .where(and(
      eq(telegramPendingActions.telegramUserId, input.telegramUserId),
      lt(telegramPendingActions.createdAt, new Date(Date.now() - PENDING_ACTION_TTL_MS)),
    ))
    .catch(() => {});
  return id;
}

// Atomically consume the full message behind a callback id. Using a single
// DELETE ... RETURNING means a duplicate button tap (or a duplicated Telegram
// update) can only succeed once — the second one gets no row back.
export async function takePendingAction(input: {
  telegramUserId: string;
  id: string;
}): Promise<string | null> {
  const rows = await getDb()
    .delete(telegramPendingActions)
    .where(and(
      eq(telegramPendingActions.id, input.id),
      eq(telegramPendingActions.telegramUserId, input.telegramUserId),
    ))
    .returning({ message: telegramPendingActions.message });
  return rows[0]?.message ?? null;
}
