// Resolve a Telegram chat identity to an agent user id.
// - Linked: telegram_links row → the user's real Privy account (shared wallet/memory/connections).
// - Standalone: a synthetic "tg:<id>" agent_users row so foreign keys hold and the user has their own state.
import { randomBytes, randomUUID } from "node:crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
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
  const code = newLinkCode();
  const expiresAt = new Date(Date.now() + ttlMs);
  await getDb().insert(telegramLinkCodes).values({ code, userId, expiresAt });
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
  const rows = await db
    .select({ userId: telegramLinkCodes.userId })
    .from(telegramLinkCodes)
    .where(and(
      eq(telegramLinkCodes.code, input.code.toUpperCase()),
      isNull(telegramLinkCodes.usedAt),
      gt(telegramLinkCodes.expiresAt, now),
    ))
    .limit(1);
  const match = rows[0];
  if (!match) throw new Error("telegram_link_code_invalid");

  await db
    .update(telegramLinkCodes)
    .set({ usedAt: now })
    .where(eq(telegramLinkCodes.code, input.code.toUpperCase()));

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
  const id = randomUUID().replace(/-/g, "").slice(0, 16);
  await getDb().insert(telegramPendingActions).values({
    id,
    telegramUserId: input.telegramUserId,
    userId: input.userId,
    message: input.message,
  });
  return id;
}

// Look up (and consume) the full message behind a callback id.
export async function takePendingAction(input: {
  telegramUserId: string;
  id: string;
}): Promise<string | null> {
  const db = getDb();
  const rows = await db
    .select({ message: telegramPendingActions.message, userId: telegramPendingActions.userId })
    .from(telegramPendingActions)
    .where(and(
      eq(telegramPendingActions.id, input.id),
      eq(telegramPendingActions.telegramUserId, input.telegramUserId),
    ))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  await db.delete(telegramPendingActions).where(eq(telegramPendingActions.id, input.id));
  return row.message;
}
