import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@/db";
import { waitlistSignups } from "@/db/schema";
import { waitlistSignupSchema } from "@/app/waitlist/schema";

const json = (body: Record<string, unknown>, status: number) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > 12_000) return json({ status: "invalid_request" }, 413);

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) {
    return json({ status: "invalid_origin" }, 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ status: "invalid_request" }, 400);
  }

  const parsed = waitlistSignupSchema.safeParse(body);
  if (!parsed.success) {
    return json({ status: "invalid_request" }, 400);
  }

  if (parsed.data.website) {
    return json({ status: "joined" }, 201);
  }

  if (!hasDatabase()) {
    return json({ status: "storage_unavailable" }, 503);
  }

  try {
    const [created] = await getDb()
      .insert(waitlistSignups)
      .values({
        id: randomUUID(),
        email: parsed.data.email,
        role: parsed.data.role,
        useCase: parsed.data.useCase,
        country: parsed.data.country,
        company: parsed.data.company,
        source: parsed.data.source,
        referral: parsed.data.referral,
        consent: parsed.data.consent,
      })
      .onConflictDoNothing({ target: waitlistSignups.email })
      .returning({ id: waitlistSignups.id });

    return json({ status: created ? "joined" : "already_joined" }, created ? 201 : 200);
  } catch {
    return json({ status: "storage_error" }, 500);
  }
}