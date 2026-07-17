import assert from "node:assert/strict";
import test from "node:test";
import { futureTravalaDates, searchTravalaHotels, travalaSearchInput } from "../app/travala";

test("rejects an invalid hotel date range", () => {
  assert.equal(
    travalaSearchInput.safeParse({
      location: "Santiago",
      checkIn: "2099-07-20",
      checkOut: "2099-07-20",
      guests: 2,
    }).success,
    false,
  );
});

test("calls only Travala hotel search and normalizes its response", async () => {
  let requestBody: Record<string, unknown> | undefined;
  const fetcher = (async (_url: string | URL | Request, init?: RequestInit) => {
    requestBody = JSON.parse(String(init?.body));
    return new Response(
      'event: message\ndata: {"result":{"content":[{"type":"text","text":"{\\\"sessionId\\\":\\\"session-1\\\",\\\"hotels\\\":[{\\\"hotelId\\\":\\\"hotel-1\\\",\\\"packageId\\\":\\\"package-1\\\",\\\"name\\\":\\\"Test Hotel\\\",\\\"totalPrice\\\":70,\\\"pricePerNight\\\":70,\\\"currency\\\":\\\"USD\\\"}]}"}]},"jsonrpc":"2.0","id":1}\n\n',
      { status: 200, headers: { "content-type": "text/event-stream" } },
    );
  }) as typeof fetch;

  const result = await searchTravalaHotels(
    {
      location: "Santiago, Chile",
      ...futureTravalaDates(),
      guests: 2,
      maxPrice: 200,
    },
    fetcher,
  );

  const params = requestBody?.params as {
    name?: string;
    arguments?: { rooms?: string[]; response_format?: string };
  };
  assert.equal(params.name, "travala_search_hotel");
  assert.deepEqual(params.arguments?.rooms, ["2"]);
  assert.equal(params.arguments?.response_format, "json");
  assert.equal(result.sessionId, "session-1");
  assert.equal(result.hotels[0]?.totalPriceUSD, 70);
});
