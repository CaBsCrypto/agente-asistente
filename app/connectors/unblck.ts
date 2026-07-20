import { z } from "zod";

export const unblckChannelSchema = z.enum(["telegram", "whatsapp"]);
export type UnblckChannel = z.infer<typeof unblckChannelSchema>;

export const unblckIdentitySchema = z.object({
  channel: unblckChannelSchema,
  channelUserId: z.string().trim().min(3).max(128),
});
export type UnblckIdentity = z.infer<typeof unblckIdentitySchema>;

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const creditsSchema = z.object({
  total: z.number().nonnegative().nullable(),
  used: z.number().nonnegative(),
  remaining: z.number().nonnegative().nullable(),
});
const passSchema = z.object({ id: z.string().min(1), date: isoDateSchema });

export const unblckHubStateSchema = z.object({
  bookings: z.array(isoDateSchema),
  passes: z.array(passSchema),
  credits: creditsSchema,
  tier: z.string().min(1),
  open_days: z.array(z.number().int().min(0).max(6)),
});
export type UnblckHubState = z.infer<typeof unblckHubStateSchema>;

type Fetcher = typeof fetch;

function config() {
  if (process.env.UNBLCK_API_ENABLED?.trim() !== "true") {
    throw new Error("unblck_api_disabled");
  }
  const apiKey = process.env.UNBLCK_AGENT_API_KEY?.trim();
  const baseUrl = (
    process.env.UNBLCK_API_BASE_URL?.trim() ||
    "https://www.unblck.cl/api/agent/v1"
  ).replace(/\/$/, "");
  if (!apiKey) throw new Error("unblck_api_key_missing");
  return { apiKey, baseUrl };
}

function identityHeaders(identity?: UnblckIdentity): Record<string, string> {
  if (!identity) return {};
  const parsed = unblckIdentitySchema.parse(identity);
  return {
    "X-Channel": parsed.channel,
    "X-Channel-User-Id": parsed.channelUserId,
  };
}

async function request(
  path: string,
  init: RequestInit,
  identity: UnblckIdentity | undefined,
  fetcher: Fetcher,
) {
  const { apiKey, baseUrl } = config();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetcher(baseUrl + path, {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + apiKey,
        ...identityHeaders(identity),
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) {
      const upstreamCode = typeof body.code === "string"
        ? body.code
        : typeof body.error === "string"
          ? body.error
          : "request_failed";
      throw new Error(`unblck_${response.status}:${upstreamCode}`);
    }
    return body;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("unblck_timeout");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function linkUnblckChannel(
  input: UnblckIdentity & { code: string },
  fetcher: Fetcher = fetch,
) {
  const identity = unblckIdentitySchema.parse(input);
  const code = z.string().trim().min(6).max(32).parse(input.code).toUpperCase();
  const body = await request("/channel-links", {
    method: "POST",
    body: JSON.stringify({
      channel: identity.channel,
      channel_user_id: identity.channelUserId,
      code,
    }),
  }, undefined, fetcher);
  return z.object({ ok: z.literal(true) }).parse(body);
}

export async function unlinkUnblckChannel(
  identity: UnblckIdentity,
  fetcher: Fetcher = fetch,
) {
  const parsed = unblckIdentitySchema.parse(identity);
  const body = await request("/channel-links", {
    method: "DELETE",
    body: JSON.stringify({
      channel: parsed.channel,
      channel_user_id: parsed.channelUserId,
    }),
  }, undefined, fetcher);
  return z.object({ ok: z.literal(true) }).parse(body);
}

export async function getUnblckHubState(
  identity: UnblckIdentity,
  fetcher: Fetcher = fetch,
) {
  return unblckHubStateSchema.parse(
    await request("/hub-checkins", { method: "GET" }, identity, fetcher),
  );
}

export async function createUnblckHubCheckin(
  identity: UnblckIdentity,
  bookingDate: string,
  fetcher: Fetcher = fetch,
) {
  const date = isoDateSchema.parse(bookingDate);
  const body = await request("/hub-checkins", {
    method: "POST",
    body: JSON.stringify({ booking_date: date }),
  }, identity, fetcher);
  return z.object({
    ok: z.literal(true),
    booking_id: z.string().min(1),
  }).parse(body);
}

export async function cancelUnblckHubCheckin(
  identity: UnblckIdentity,
  bookingDate: string,
  fetcher: Fetcher = fetch,
) {
  const date = isoDateSchema.parse(bookingDate);
  const body = await request(
    "/hub-checkins/" + encodeURIComponent(date),
    { method: "DELETE" },
    identity,
    fetcher,
  );
  return z.object({ ok: z.literal(true) }).parse(body);
}

export function getUnblckReadiness() {
  return {
    configured: Boolean(
      process.env.UNBLCK_API_ENABLED?.trim() === "true" &&
      process.env.UNBLCK_AGENT_API_KEY?.trim(),
    ),
    baseUrl: (
      process.env.UNBLCK_API_BASE_URL?.trim() ||
      "https://www.unblck.cl/api/agent/v1"
    ).replace(/\/$/, ""),
    channels: unblckChannelSchema.options,
    capabilities: ["link", "state", "book", "cancel"],
    sourceOfTruth: "unblck",
  } as const;
}
