import assert from "node:assert/strict";
import test from "node:test";
import { futureTravalaDates, searchTravalaHotels, travalaSearchInput } from "../app/travala";

const validSearch = () => ({
  location: "Santiago, Chile",
  ...futureTravalaDates(),
  guests: 2,
  maxPrice: 250,
});

test("builds reproducible future dates in UTC", () => {
  assert.deepEqual(
    futureTravalaDates(new Date("2026-07-17T23:30:00-04:00"), 45, 2),
    { checkIn: "2026-09-01", checkOut: "2026-09-03" },
  );
});

test("rejects impossible calendar dates and past check-in", () => {
  assert.equal(
    travalaSearchInput.safeParse({
      location: "Santiago",
      checkIn: "2099-02-30",
      checkOut: "2099-03-02",
      guests: 1,
    }).success,
    false,
  );
  assert.equal(
    travalaSearchInput.safeParse({
      location: "Santiago",
      checkIn: "2020-01-01",
      checkOut: "2020-01-02",
      guests: 1,
    }).success,
    false,
  );
});

test("maps Travala rate limits and upstream failures to stable errors", async () => {
  const rateLimited = (async () => new Response("", { status: 429 })) as typeof fetch;
  const unavailable = (async () => new Response("", { status: 503 })) as typeof fetch;

  await assert.rejects(
    () => searchTravalaHotels(validSearch(), rateLimited),
    /travala_rate_limited/,
  );
  await assert.rejects(
    () => searchTravalaHotels(validSearch(), unavailable),
    /travala_unavailable/,
  );
});

test("rejects malformed successful responses without inventing inventory", async () => {
  const malformed = (async () =>
    new Response("event: message\ndata: not-json\n\n", {
      status: 200,
      headers: { "content-type": "text/event-stream" },
    })) as typeof fetch;

  await assert.rejects(
    () => searchTravalaHotels(validSearch(), malformed),
    /travala_unavailable/,
  );
});

test("maps an aborted Travala request to a stable timeout", async () => {
  const neverResponds = ((_url: string | URL | Request, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener(
        "abort",
        () => reject(new DOMException("aborted", "AbortError")),
        { once: true },
      );
    })) as typeof fetch;

  await assert.rejects(
    () => searchTravalaHotels(validSearch(), neverResponds, { timeoutMs: 5 }),
    /travala_timeout/,
  );
});
