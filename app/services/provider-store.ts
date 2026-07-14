import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { ensureMcpProviderSchema } from "@/app/services/provider-migration";
import type { Kind, Network, Offer } from "@/app/domain";
import {
  mcpAccessTokens,
  serviceOffers,
  serviceProviders,
} from "@/db/schema";

async function providerDb() {
  await ensureMcpProviderSchema();
  return getDb();
}

export const PROVIDER_MCP_SCOPES = [
  "provider:read",
  "provider:offers:write",
] as const;

export type ProviderOfferInput = {
  externalId: string;
  title: string;
  description: string;
  kind: Kind;
  amount: number;
  currency: "USDC";
  network: Network;
  metadata?: Record<string, unknown>;
};

export function hashMcpToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function mcpTokenPrefix(token: string) {
  return token.slice(0, 18);
}

export function createRawProviderToken() {
  return "aap_provider_" + randomBytes(32).toString("base64url");
}

export async function createServiceProvider(input: {
  slug: string;
  name: string;
  contactEmail?: string;
  metadata?: Record<string, unknown>;
}) {
  const [provider] = await (await providerDb())
    .insert(serviceProviders)
    .values({
      id: "sp_" + randomUUID(),
      slug: input.slug,
      name: input.name,
      contactEmail: input.contactEmail ?? null,
      metadata: input.metadata ?? {},
    })
    .returning();
  return provider;
}

export async function issueProviderToken(input: {
  providerId: string;
  name?: string;
  scopes?: string[];
  expiresAt?: Date | null;
}) {
  const token = createRawProviderToken();
  const scopes = input.scopes?.length
    ? input.scopes
    : [...PROVIDER_MCP_SCOPES];
  const [record] = await (await providerDb())
    .insert(mcpAccessTokens)
    .values({
      id: "mcpk_" + randomUUID(),
      subjectType: "provider",
      subjectId: input.providerId,
      name: input.name?.trim() || "Primary provider MCP key",
      tokenPrefix: mcpTokenPrefix(token),
      tokenHash: hashMcpToken(token),
      scopes,
      expiresAt: input.expiresAt ?? null,
    })
    .returning({
      id: mcpAccessTokens.id,
      tokenPrefix: mcpAccessTokens.tokenPrefix,
      scopes: mcpAccessTokens.scopes,
      expiresAt: mcpAccessTokens.expiresAt,
      createdAt: mcpAccessTokens.createdAt,
    });
  return { token, record };
}

export async function verifyServiceProviderToken(rawToken: string) {
  if (!rawToken.startsWith("aap_provider_")) {
    throw new Error("provider_token_invalid");
  }
  const db = await providerDb();
  const [token] = await db
    .select()
    .from(mcpAccessTokens)
    .where(eq(mcpAccessTokens.tokenHash, hashMcpToken(rawToken)))
    .limit(1);
  if (
    !token ||
    token.subjectType !== "provider" ||
    token.status !== "active" ||
    (token.expiresAt && token.expiresAt.getTime() <= Date.now())
  ) {
    throw new Error("provider_token_invalid");
  }
  const [provider] = await db
    .select()
    .from(serviceProviders)
    .where(eq(serviceProviders.id, token.subjectId))
    .limit(1);
  if (!provider || provider.status !== "active") {
    throw new Error("provider_inactive");
  }
  await db
    .update(mcpAccessTokens)
    .set({ lastUsedAt: new Date(), updatedAt: new Date() })
    .where(eq(mcpAccessTokens.id, token.id));
  return {
    provider,
    scopes: token.scopes,
    expiresAt: token.expiresAt,
    tokenId: token.id,
  };
}

export async function getServiceProvider(providerId: string) {
  const [provider] = await (await providerDb())
    .select({
      id: serviceProviders.id,
      slug: serviceProviders.slug,
      name: serviceProviders.name,
      status: serviceProviders.status,
      metadata: serviceProviders.metadata,
      createdAt: serviceProviders.createdAt,
      updatedAt: serviceProviders.updatedAt,
    })
    .from(serviceProviders)
    .where(eq(serviceProviders.id, providerId))
    .limit(1);
  if (!provider) throw new Error("provider_not_found");
  return provider;
}

export async function listServiceProviders() {
  return (await providerDb())
    .select({
      id: serviceProviders.id,
      slug: serviceProviders.slug,
      name: serviceProviders.name,
      contactEmail: serviceProviders.contactEmail,
      status: serviceProviders.status,
      createdAt: serviceProviders.createdAt,
      updatedAt: serviceProviders.updatedAt,
    })
    .from(serviceProviders)
    .orderBy(desc(serviceProviders.createdAt));
}

export async function listProviderOffers(providerId: string) {
  const rows = await (await providerDb())
    .select()
    .from(serviceOffers)
    .where(eq(serviceOffers.providerId, providerId))
    .orderBy(desc(serviceOffers.updatedAt));
  return rows.map((row) => ({ ...row, amount: Number(row.amount) }));
}

export async function upsertProviderOffer(
  providerId: string,
  input: ProviderOfferInput,
) {
  const now = new Date();
  const [row] = await (await providerDb())
    .insert(serviceOffers)
    .values({
      id: "spo_" + randomUUID(),
      providerId,
      externalId: input.externalId,
      title: input.title,
      description: input.description,
      kind: input.kind,
      amount: String(input.amount),
      currency: input.currency,
      network: input.network,
      status: "draft",
      metadata: input.metadata ?? {},
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [serviceOffers.providerId, serviceOffers.externalId],
      set: {
        title: input.title,
        description: input.description,
        kind: input.kind,
        amount: String(input.amount),
        currency: input.currency,
        network: input.network,
        metadata: input.metadata ?? {},
        updatedAt: now,
      },
    })
    .returning();
  return { ...row, amount: Number(row.amount) };
}

export async function setProviderOfferStatus(
  providerId: string,
  offerId: string,
  status: "draft" | "published" | "paused" | "archived",
) {
  const [row] = await (await providerDb())
    .update(serviceOffers)
    .set({ status, updatedAt: new Date() })
    .where(
      and(
        eq(serviceOffers.id, offerId),
        eq(serviceOffers.providerId, providerId),
      ),
    )
    .returning();
  if (!row) throw new Error("provider_offer_not_found");
  return { ...row, amount: Number(row.amount) };
}


function toPublicOffer(row: {
  id: string;
  merchant: string;
  title: string;
  description: string;
  kind: string;
  amount: string;
  currency: string;
  network: string;
}): Offer {
  return {
    id: row.id,
    merchant: row.merchant,
    title: row.title,
    description: row.description,
    kind: row.kind as Kind,
    amount: Number(row.amount),
    currency: row.currency as "USDC",
    network: row.network as Network,
    availability: "partner_pending",
  };
}

export async function listPublishedServiceOffers(query = "", kind?: Kind) {
  const rows = await (await providerDb())
    .select({
      id: serviceOffers.id,
      merchant: serviceProviders.name,
      title: serviceOffers.title,
      description: serviceOffers.description,
      kind: serviceOffers.kind,
      amount: serviceOffers.amount,
      currency: serviceOffers.currency,
      network: serviceOffers.network,
    })
    .from(serviceOffers)
    .innerJoin(
      serviceProviders,
      eq(serviceOffers.providerId, serviceProviders.id),
    )
    .where(eq(serviceOffers.status, "published"));
  const normalized = query.trim().toLowerCase();
  return rows
    .map(toPublicOffer)
    .filter(
      (offer) =>
        (!kind || offer.kind === kind) &&
        (!normalized ||
          (offer.title + " " + offer.description + " " + offer.merchant)
            .toLowerCase()
            .includes(normalized)),
    );
}

export async function getPublishedServiceOffer(offerId: string) {
  const rows = await (await providerDb())
    .select({
      id: serviceOffers.id,
      merchant: serviceProviders.name,
      title: serviceOffers.title,
      description: serviceOffers.description,
      kind: serviceOffers.kind,
      amount: serviceOffers.amount,
      currency: serviceOffers.currency,
      network: serviceOffers.network,
    })
    .from(serviceOffers)
    .innerJoin(
      serviceProviders,
      eq(serviceOffers.providerId, serviceProviders.id),
    )
    .where(
      and(
        eq(serviceOffers.id, offerId),
        eq(serviceOffers.status, "published"),
      ),
    )
    .limit(1);
  if (!rows[0]) throw new Error("offer_not_found");
  return toPublicOffer(rows[0]);
}
