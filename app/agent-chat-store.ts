import { createHash, randomUUID } from "node:crypto";
import { and, asc, desc, eq } from "drizzle-orm";
import { getDb, hasDatabase } from "@/db";
import {
  agentConnectionInterests,
  agentConversations,
  agentExternalConnections,
  agentMessages,
  agentWallets,
} from "@/db/schema";
import { buildAgentReply, findRequestedConnection } from "@/app/agent-chat-logic";
import { getStellarTestnetAccount } from "@/app/privy-stellar";

export type StoredAgentMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  actions?: { label: string; message?: string; href?: string; connect?: string }[];
  connection?: { name: string; stage: string; priority: string };
};

function conversationId(userId: string) {
  return "conv_" + createHash("sha256").update(userId).digest("hex").slice(0, 32);
}

async function walletContext(userId: string) {
  const db = getDb();
  const rows = await db
    .select({
      address: agentWallets.address,
      network: agentWallets.network,
    })
    .from(agentWallets)
    .where(eq(agentWallets.userId, userId))
    .limit(1);

  const wallet = rows[0];
  if (!wallet) return null;
  const account = await getStellarTestnetAccount(wallet.address).catch(() => null);
  const xlm = account?.balances.find((balance) => balance.asset === "XLM");

  return {
    address: wallet.address,
    network: "Stellar Testnet",
    balance: xlm?.balance ?? null,
  };
}

async function ensureConversation(userId: string) {
  if (!hasDatabase()) throw new Error("database_not_configured");
  const db = getDb();
  const id = conversationId(userId);
  const now = new Date();

  await db
    .insert(agentConversations)
    .values({ id, userId, title: "My agent", updatedAt: now })
    .onConflictDoUpdate({
      target: agentConversations.id,
      set: { updatedAt: now },
    });

  const current = await db
    .select({ id: agentMessages.id })
    .from(agentMessages)
    .where(eq(agentMessages.conversationId, id))
    .limit(1);

  if (!current.length) {
    await db.insert(agentMessages).values({
      id: randomUUID(),
      conversationId: id,
      userId,
      role: "assistant",
      content:
        "Your Stellar wallet is active and your agent is ready. Tell me what you want to do. You can start with DeFindex, UNBLCK, ArcusX or Travala.",
      metadata: {
        actions: [
          { label: "Connect DeFindex", message: "Connect me to DeFindex" },
          { label: "Connect UNBLCK", message: "Connect me to UNBLCK" },
          { label: "Connect ArcusX", message: "Connect me to ArcusX" },
          { label: "Explore Travala", message: "Connect me to Travala" },
        ],
      },
    });
  }

  return id;
}

function publicMessage(row: {
  id: string;
  role: string;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}): StoredAgentMessage {
  const metadata = row.metadata ?? {};
  return {
    id: row.id,
    role: row.role === "user" ? "user" : "assistant",
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    actions: Array.isArray(metadata.actions)
      ? (metadata.actions as StoredAgentMessage["actions"])
      : undefined,
    connection:
      metadata.connection && typeof metadata.connection === "object"
        ? (metadata.connection as StoredAgentMessage["connection"])
        : undefined,
  };
}

export async function getAgentConversation(userId: string) {
  const db = getDb();
  const id = await ensureConversation(userId);
  const rows = await db
    .select({
      id: agentMessages.id,
      role: agentMessages.role,
      content: agentMessages.content,
      metadata: agentMessages.metadata,
      createdAt: agentMessages.createdAt,
    })
    .from(agentMessages)
    .where(eq(agentMessages.conversationId, id))
    .orderBy(asc(agentMessages.createdAt))
    .limit(80);

  return { conversationId: id, messages: rows.map(publicMessage) };
}

export async function sendAgentMessage(userId: string, content: string) {
  const db = getDb();
  const id = await ensureConversation(userId);
  const now = new Date();
  const userMessage = {
    id: randomUUID(),
    conversationId: id,
    userId,
    role: "user",
    content,
    metadata: {},
    createdAt: now,
  };

  await db.insert(agentMessages).values(userMessage);
  const [wallet, activeConnections] = await Promise.all([
    walletContext(userId),
    db
      .select({ provider: agentExternalConnections.provider })
      .from(agentExternalConnections)
      .where(
        and(
          eq(agentExternalConnections.userId, userId),
          eq(agentExternalConnections.status, "active"),
        ),
      ),
  ]);
  const reply = buildAgentReply(content, {
    wallet,
    connectedProviders: activeConnections.map((item) => item.provider),
  });
  const assistantMessage = {
    id: randomUUID(),
    conversationId: id,
    userId,
    role: "assistant",
    content: reply.content,
    metadata: {
      actions: reply.actions,
      connection: reply.connection,
    },
    createdAt: new Date(),
  };

  await db.insert(agentMessages).values(assistantMessage);
  await db
    .update(agentConversations)
    .set({ updatedAt: new Date() })
    .where(eq(agentConversations.id, id));

  const connection = findRequestedConnection(content);
  if (connection) {
    await db
      .insert(agentConnectionInterests)
      .values({
        id: randomUUID(),
        userId,
        connectionName: connection.name,
        status: "exploring",
        lastMessage: content,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          agentConnectionInterests.userId,
          agentConnectionInterests.connectionName,
        ],
        set: {
          status: "exploring",
          lastMessage: content,
          updatedAt: new Date(),
        },
      });
  }

  return {
    conversationId: id,
    userMessage: publicMessage(userMessage),
    assistantMessage: publicMessage(assistantMessage),
  };
}

export async function recentConversationSummary(userId: string) {
  const db = getDb();
  return db
    .select({
      id: agentConversations.id,
      title: agentConversations.title,
      updatedAt: agentConversations.updatedAt,
    })
    .from(agentConversations)
    .where(eq(agentConversations.userId, userId))
    .orderBy(desc(agentConversations.updatedAt))
    .limit(10);
}