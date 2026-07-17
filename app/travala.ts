import { z } from "zod";

const TRAVALA_MCP_URL = "https://travel-mcp.travala.com/mcp";

const isoCalendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "invalid_calendar_date");

export const travalaSearchInput = z
  .object({
    location: z.string().trim().min(2).max(120),
    checkIn: isoCalendarDate,
    checkOut: isoCalendarDate,
    guests: z.number().int().min(1).max(8),
    maxPrice: z.number().positive().max(10_000).optional(),
  })
  .superRefine((value, context) => {
    const today = new Date().toISOString().slice(0, 10);
    if (value.checkIn < today) {
      context.addIssue({ code: "custom", message: "check_in_must_not_be_in_the_past", path: ["checkIn"] });
    }
    if (value.checkOut <= value.checkIn) {
      context.addIssue({ code: "custom", message: "check_out_must_be_after_check_in", path: ["checkOut"] });
    }
  });

export function futureTravalaDates(now = new Date(), leadDays = 45, nights = 2) {
  if (!Number.isInteger(leadDays) || leadDays < 1) throw new Error("travala_lead_days_invalid");
  if (!Number.isInteger(nights) || nights < 1) throw new Error("travala_nights_invalid");
  const checkIn = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  checkIn.setUTCDate(checkIn.getUTCDate() + leadDays);
  const checkOut = new Date(checkIn);
  checkOut.setUTCDate(checkOut.getUTCDate() + nights);
  return { checkIn: checkIn.toISOString().slice(0, 10), checkOut: checkOut.toISOString().slice(0, 10) };
}

const hotelSchema = z.object({
  hotelId: z.string(),
  packageId: z.string(),
  name: z.string(),
  thumbnail: z.string().url().optional(),
  rating: z.number().nullable().optional(),
  star: z.number().nullable().optional(),
  totalPriceAllRoomsUSD: z.number().nonnegative().optional(),
  totalPrice: z.number().nonnegative().optional(),
  totalPricePerNightAllRoomsUSD: z.number().nonnegative().optional(),
  pricePerNight: z.number().nonnegative().optional(),
  currency: z.string().default("USD"),
  mealType: z.string().optional(),
  address: z.string().optional(),
  refundability: z.string().optional(),
  cancellationPolicyString: z.string().optional(),
  cancellation: z.object({
    free_cancellation_until_utc: z.string().nullable().optional(),
    is_cancellable_now: z.boolean().optional(),
    time_remaining_human: z.string().optional(),
  }).optional(),
});

const searchPayloadSchema = z.object({
  sessionId: z.string(),
  hotels: z.array(hotelSchema),
});

function parseMcpEventStream(body: string) {
  for (const line of body.split(/\r?\n/)) {
    if (!line.startsWith("data:")) continue;
    const message = JSON.parse(line.slice(5).trim()) as {
      error?: { message?: string };
      result?: { content?: { type?: string; text?: string }[] };
    };
    if (message.error) throw new Error(message.error.message ?? "travala_mcp_error");
    for (const content of message.result?.content ?? []) {
      if (content.type !== "text" || !content.text) continue;
      try {
        const parsed = searchPayloadSchema.safeParse(JSON.parse(content.text));
        if (parsed.success) return parsed.data;
      } catch {
        // Human-readable content can precede the JSON payload.
      }
    }
  }
  throw new Error("travala_invalid_search_response");
}

export async function searchTravalaHotels(
  rawInput: z.input<typeof travalaSearchInput>,
  fetcher: typeof fetch = fetch,
  options: { timeoutMs?: number } = {},
) {
  const input = travalaSearchInput.parse(rawInput);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(1, options.timeoutMs ?? 20_000));
  try {
    const response = await fetcher(TRAVALA_MCP_URL, {
      method: "POST",
      headers: { Accept: "application/json, text/event-stream", "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: crypto.randomUUID(),
        method: "tools/call",
        params: {
          name: "travala_search_hotel",
          arguments: {
            location: input.location,
            checkIn: input.checkIn,
            checkOut: input.checkOut,
            rooms: [String(input.guests)],
            ...(input.maxPrice ? { maxPrice: input.maxPrice } : {}),
            response_format: "json",
          },
        },
      }),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      if (response.status === 429) throw new Error("travala_rate_limited");
      throw new Error("travala_unavailable");
    }
    const payload = parseMcpEventStream(await response.text());
    return {
      sessionId: payload.sessionId,
      searchedAt: new Date().toISOString(),
      hotels: payload.hotels.slice(0, 8).map((hotel) => ({
        ...hotel,
        thumbnail: hotel.thumbnail?.startsWith("https://") ? hotel.thumbnail : undefined,
        totalPriceUSD: hotel.totalPriceAllRoomsUSD ?? hotel.totalPrice ?? 0,
        pricePerNightUSD: hotel.totalPricePerNightAllRoomsUSD ?? hotel.pricePerNight ?? 0,
      })),
    };
  } catch (error) {
    if (controller.signal.aborted) throw new Error("travala_timeout");
    if (error instanceof Error && error.message.startsWith("travala_")) throw error;
    throw new Error("travala_unavailable");
  } finally {
    clearTimeout(timeout);
  }
}
