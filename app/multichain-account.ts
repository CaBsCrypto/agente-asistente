import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { getDb, hasDatabase } from "@/db";
import { agentActivities, agentUsers, agentWallets } from "@/db/schema";
import type { UserWallet, WalletNetworkId } from "@/app/wallets/types";

export async function persistActivatedWallet(input: {
  userId: string;
  email: string | null;
  wallet: UserWallet;
  network: WalletNetworkId;
}) {
  if (!hasDatabase()) throw new Error("database_not_configured");
  const db = getDb();
  const now = new Date();

  await db.insert(agentUsers).values({
    id: input.userId,
    email: input.email,
    status: "active",
    lastSeenAt: now,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: agentUsers.id,
    set: { email: input.email, status: "active", lastSeenAt: now, updatedAt: now },
  });

  await db.insert(agentWallets).values({
    id: input.wallet.id,
    userId: input.userId,
    address: input.wallet.address,
    chainType: input.wallet.chainType,
    network: input.network,
    status: "active",
    updatedAt: now,
  }).onConflictDoUpdate({
    target: agentWallets.id,
    set: {
      userId: input.userId,
      address: input.wallet.address,
      chainType: input.wallet.chainType,
      network: input.network,
      status: "active",
      updatedAt: now,
    },
  });

  if (input.wallet.created) {
    await db.insert(agentActivities).values({
      id: randomUUID(),
      userId: input.userId,
      eventType: "wallet.created",
      summary: `${input.wallet.family.toUpperCase()} wallet activated on ${input.network}`,
      metadata: {
        walletId: input.wallet.id,
        address: input.wallet.address,
        family: input.wallet.family,
        chainType: input.wallet.chainType,
        network: input.network,
        provider: "privy",
      },
    });
  }

  return input.wallet;
}

export async function listPersistedUserWallets(userId: string) {
  if (!hasDatabase()) return [];
  return getDb().select({
    id: agentWallets.id,
    address: agentWallets.address,
    chainType: agentWallets.chainType,
    network: agentWallets.network,
    status: agentWallets.status,
    updatedAt: agentWallets.updatedAt,
  }).from(agentWallets)
    .where(eq(agentWallets.userId, userId))
    .orderBy(desc(agentWallets.updatedAt));
}
