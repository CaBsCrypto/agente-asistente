import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  agentExternalConnections,
  agentUsers,
  agentWallets,
} from "@/db/schema";

export async function getAgentMcpContext(userId: string) {
  const db = getDb();
  const [users, wallets, connections] = await Promise.all([
    db
      .select({
        id: agentUsers.id,
        email: agentUsers.email,
        status: agentUsers.status,
        lastSeenAt: agentUsers.lastSeenAt,
      })
      .from(agentUsers)
      .where(eq(agentUsers.id, userId))
      .limit(1),
    db
      .select({
        address: agentWallets.address,
        chainType: agentWallets.chainType,
        network: agentWallets.network,
        status: agentWallets.status,
      })
      .from(agentWallets)
      .where(eq(agentWallets.userId, userId)),
    db
      .select({
        provider: agentExternalConnections.provider,
        status: agentExternalConnections.status,
        scopes: agentExternalConnections.scopes,
        updatedAt: agentExternalConnections.updatedAt,
      })
      .from(agentExternalConnections)
      .where(eq(agentExternalConnections.userId, userId)),
  ]);
  if (!users[0]) throw new Error("agent_user_not_found");
  return {
    user: users[0],
    wallets,
    connections,
    authority: {
      paymentSigning: "not_enabled",
      custody: false,
      writeToolsRequireExplicitApproval: true,
    },
  };
}
