import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminIdentity } from "@/app/admin/auth";
import {
  createServiceProvider,
  issueProviderToken,
  listServiceProviders,
  PROVIDER_MCP_SCOPES,
} from "@/app/services/provider-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(2).max(160),
  contactEmail: z.string().trim().email().optional(),
  tokenName: z.string().trim().min(2).max(120).optional(),
});

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  return !origin || !host || new URL(origin).host === host;
}

async function requireAdmin() {
  const identity = await getAdminIdentity();
  if (!identity) throw new Error("admin_auth_required");
  return identity;
}

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(
      { providers: await listServiceProviders() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "admin_auth_required" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }
  try {
    const admin = await requireAdmin();
    const input = createSchema.parse(await request.json());
    const provider = await createServiceProvider({
      slug: input.slug,
      name: input.name,
      contactEmail: input.contactEmail,
      metadata: { createdBy: admin },
    });
    const credential = await issueProviderToken({
      providerId: provider.id,
      name: input.tokenName,
      scopes: [...PROVIDER_MCP_SCOPES],
    });
    return NextResponse.json(
      {
        provider,
        credential,
        warning:
          "The raw token is returned once. Store it securely; only its SHA-256 hash is persisted.",
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store",
          Pragma: "no-cache",
        },
      },
    );
  } catch (error) {
    const code =
      error instanceof z.ZodError
        ? "invalid_provider"
        : error instanceof Error
          ? error.message.split(":")[0]
          : "provider_creation_failed";
    const status =
      code === "admin_auth_required"
        ? 401
        : code === "invalid_provider"
          ? 400
          : 409;
    return NextResponse.json({ error: code }, { status });
  }
}
