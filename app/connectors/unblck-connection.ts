import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { agentExternalConnections } from "@/db/schema";
import {
  decryptConnectorSecret,
  encryptConnectorSecret,
} from "@/app/connectors/notion-oauth";
import {
  linkUnblckChannel,
  type UnblckIdentity,
  unblckIdentitySchema,
  unlinkUnblckChannel,
} from "@/app/connectors/unblck";

const PROVIDER = "unblck";

function encryptedIdentity(identity: UnblckIdentity) {
  return encryptConnectorSecret(JSON.stringify(unblckIdentitySchema.parse(identity)));
}

export async function getUnblckConnection(userId: string) {
  const rows = await getDb()
    .select()
    .from(agentExternalConnections)
    .where(and(
      eq(agentExternalConnections.userId, userId),
      eq(agentExternalConnections.provider, PROVIDER),
    ))
    .limit(1);
  const connection = rows[0];
  if (!connection || connection.status !== "active") {
    throw new Error("unblck_link_required");
  }
  return {
    id: connection.id,
    identity: unblckIdentitySchema.parse(
      JSON.parse(decryptConnectorSecret(connection.accessTokenEncrypted)),
    ),
    linkedAt:
      typeof connection.metadata?.linkedAt === "string"
        ? connection.metadata.linkedAt
        : connection.updatedAt.toISOString(),
  };
}

export async function hasUnblckConnection(userId: string) {
  try {
    await getUnblckConnection(userId);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message === "unblck_link_required") {
      return false;
    }
    throw error;
  }
}

export async function linkUnblckUser(
  userId: string,
  input: UnblckIdentity & { code: string },
) {
  const identity = unblckIdentitySchema.parse(input);
  const encrypted = encryptedIdentity(identity);
  const db = getDb();
  await db
    .insert(agentExternalConnections)
    .values({
      id: randomUUID(),
      userId,
      provider: PROVIDER,
      status: "linking",
      accessTokenEncrypted: encrypted,
      scopes: ["hub:read", "hub:book", "hub:cancel"],
      metadata: { channel: identity.channel, transport: "agent-api" },
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        agentExternalConnections.userId,
        agentExternalConnections.provider,
      ],
      set: {
        status: "linking",
        accessTokenEncrypted: encrypted,
        scopes: ["hub:read", "hub:book", "hub:cancel"],
        metadata: { channel: identity.channel, transport: "agent-api" },
        updatedAt: new Date(),
      },
    });

  try {
    await linkUnblckChannel(input);
    const linkedAt = new Date().toISOString();
    await db
      .update(agentExternalConnections)
      .set({
        status: "active",
        metadata: {
          channel: identity.channel,
          transport: "agent-api",
          linkedAt,
        },
        updatedAt: new Date(),
      })
      .where(and(
        eq(agentExternalConnections.userId, userId),
        eq(agentExternalConnections.provider, PROVIDER),
      ));
    return { identity, linkedAt };
  } catch (error) {
    await db
      .update(agentExternalConnections)
      .set({ status: "link_failed", updatedAt: new Date() })
      .where(and(
        eq(agentExternalConnections.userId, userId),
        eq(agentExternalConnections.provider, PROVIDER),
      ));
    throw error;
  }
}

export async function unlinkUnblckUser(userId: string) {
  const connection = await getUnblckConnection(userId);
  await unlinkUnblckChannel(connection.identity);
  await getDb()
    .update(agentExternalConnections)
    .set({ status: "revoked", updatedAt: new Date() })
    .where(and(
      eq(agentExternalConnections.userId, userId),
      eq(agentExternalConnections.provider, PROVIDER),
    ));
  return { ok: true as const };
}
