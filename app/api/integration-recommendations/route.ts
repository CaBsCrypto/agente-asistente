import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@/db";
import { integrationRecommendations } from "@/db/schema";
import { integrationRecommendationSchema } from "@/app/integrations/schema";
import { ensureIntegrationRecommendationSchema } from "@/app/integrations/storage";

const json = (body: Record<string, unknown>, status: number) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > 8_000) return json({ status: "invalid_request" }, 413);

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return json({ status: "invalid_origin" }, 403);
      }
    } catch {
      return json({ status: "invalid_origin" }, 403);
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ status: "invalid_request" }, 400);
  }

  const parsed = integrationRecommendationSchema.safeParse(body);
  if (!parsed.success) {
    return json({ status: "invalid_request" }, 400);
  }

  if (parsed.data.website) {
    return json({ status: "received" }, 201);
  }

  if (!hasDatabase()) {
    return json({ status: "storage_unavailable" }, 503);
  }

  try {
    await ensureIntegrationRecommendationSchema();

    const [created] = await getDb()
      .insert(integrationRecommendations)
      .values({
        id: randomUUID(),
        integrationName: parsed.data.integrationName,
        email: parsed.data.email,
        useCase: parsed.data.useCase,
        locale: parsed.data.locale,
        source: parsed.data.source,
      })
      .onConflictDoNothing({
        target: [
          integrationRecommendations.email,
          integrationRecommendations.integrationName,
        ],
      })
      .returning({ id: integrationRecommendations.id });

    return json(
      { status: created ? "received" : "already_received" },
      created ? 201 : 200,
    );
  } catch {
    return json({ status: "storage_error" }, 500);
  }
}
