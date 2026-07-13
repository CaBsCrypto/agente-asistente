import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getAdminIdentity } from "@/app/admin/auth";
import { adminUpdateSchema } from "@/app/admin/types";
import { getDb } from "@/db";
import { waitlistActivities, waitlistSignups } from "@/db/schema";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  return !origin || !host || new URL(origin).host === host;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getAdminIdentity();
  if (!identity) {
    return NextResponse.json({ status: "unauthorized" }, { status: 401 });
  }

  if (!sameOrigin(request)) {
    return NextResponse.json({ status: "invalid_origin" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = adminUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid_request" }, { status: 400 });
  }

  const { id } = await params;
  const db = getDb();
  const [current] = await db
    .select()
    .from(waitlistSignups)
    .where(eq(waitlistSignups.id, id));

  if (!current) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }

  const update = parsed.data;
  const statusChanged =
    typeof update.status === "string" && update.status !== current.status;
  const now = new Date();

  const [saved] = await db
    .update(waitlistSignups)
    .set({
      ...update,
      notes: update.notes === "" ? null : update.notes,
      owner: update.owner === "" ? null : update.owner,
      lastContactedAt:
        statusChanged && update.status === "contacted"
          ? now
          : current.lastContactedAt,
      updatedAt: now,
    })
    .where(eq(waitlistSignups.id, id))
    .returning();

  await db.insert(waitlistActivities).values({
    id: randomUUID(),
    signupId: id,
    eventType: statusChanged ? "status_changed" : "lead_updated",
    fromStatus: statusChanged ? current.status : null,
    toStatus: statusChanged ? update.status : null,
    note: update.notes ?? null,
    actor: identity.username,
  });

  return NextResponse.json(
    {
      status: "saved",
      signup: {
        ...saved,
        lastContactedAt: saved.lastContactedAt?.toISOString() ?? null,
        createdAt: saved.createdAt.toISOString(),
        updatedAt: saved.updatedAt.toISOString(),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
