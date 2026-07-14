import { z } from "zod";

const TRAVALA_MCP_URL = "https://travel-mcp.travala.com/mcp";

export const travalaSearchInput = z
  .object({
    location: z.string().trim().min(2).max(120),
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    guests: z.number().int().min(1).max(8),
    maxPrice: z.number().positive().max(10_000).optional(),
  })
  .refine((value) => value.checkOut > value.checkIn, {
    message: "check_out_must_be_after_check_in",
    path: ["checkOut"],
  });

const hotelSchema = z.object({
  hotelId: z.string(),
  packageId: z.string(),
  name: z.string(),
  thumbnail: z.string().url().optional(),
  rating: z.number().nullable().optional(),
  star: z.number().nullable().optional(),
  totalPriceAllRoomsUSD: z.number().optional(),
  totalPrice: z.number().optional(),
  totalPricePerNightAllRoomsUSD: z.number().optional(),
  pricePerNight: z.number().optional(),
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
) {
  const input = travalaSearchInput.parse(rawInput);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
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
    if (!response.ok) throw new Error("travala_unavailable");
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
  } finally {
    clearTimeout(timeout);
  }
}
