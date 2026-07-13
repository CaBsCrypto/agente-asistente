import { desc, ne } from "drizzle-orm";
import { getAdminIdentity } from "@/app/admin/auth";
import { getDb } from "@/db";
import { waitlistSignups } from "@/db/schema";

function csvCell(value: unknown) {
  const normalized =
    value === null || value === undefined
      ? ""
      : Array.isArray(value)
        ? value.join(" | ")
        : value instanceof Date
          ? value.toISOString()
          : String(value);
  return '"' + normalized.replaceAll('"', '""') + '"';
}

export async function GET() {
  const identity = await getAdminIdentity();
  if (!identity) {
    return new Response("Unauthorized", { status: 401 });
  }

  const rows = await getDb()
    .select()
    .from(waitlistSignups)
    .where(ne(waitlistSignups.source, "codex-smoke"))
    .orderBy(desc(waitlistSignups.createdAt));

  const headers = [
    "email",
    "company",
    "role",
    "use_case",
    "country",
    "status",
    "priority",
    "source",
    "referral",
    "owner",
    "tags",
    "notes",
    "last_contacted_at",
    "created_at",
  ];

  const lines = [
    headers.map(csvCell).join(","),
    ...rows.map((row) =>
      [
        row.email,
        row.company,
        row.role,
        row.useCase,
        row.country,
        row.status,
        row.priority,
        row.source,
        row.referral,
        row.owner,
        row.tags,
        row.notes,
        row.lastContactedAt,
        row.createdAt,
      ]
        .map(csvCell)
        .join(","),
    ),
  ];

  const date = new Date().toISOString().slice(0, 10);
  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="agent-assistant-waitlist-' + date + '.csv"',
      "Cache-Control": "no-store",
    },
  });
}
