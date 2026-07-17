import assert from "node:assert/strict";
import test from "node:test";
import { summarizeX402Resource } from "../app/x402/resource-preview";

test("turns a paid HTML response into a concise text-only summary", () => {
  const result = summarizeX402Resource(
    '<html><head><title>Paid report</title><style>.secret{}</style></head><body><h1>Delivered</h1><script>alert("unsafe")</script><p>Your protected market report is ready.</p></body></html>',
    "https://example.com/protected/report",
  );
  assert.equal(result.title, "Paid report");
  assert.equal(result.source, "example.com");
  assert.match(result.summary ?? "", /Delivered/);
  assert.doesNotMatch(result.summary ?? "", /<|alert|secret/);
});

test("only exposes a small allowlisted summary from JSON", () => {
  const result = summarizeX402Resource(
    JSON.stringify({
      title: "Research unlocked",
      message: "The protected resource was delivered.",
      accessToken: "must-not-be-rendered",
    }),
    "https://demo.stellar.org/x402",
  );
  assert.equal(result.title, "Research unlocked");
  assert.equal(result.summary, "The protected resource was delivered.");
  assert.doesNotMatch(JSON.stringify(result), /must-not-be-rendered/);
});

test("caps unexpectedly large resource bodies", () => {
  const result = summarizeX402Resource("A".repeat(2_000), "not-a-url");
  assert.equal(result.source, null);
  assert.ok((result.summary?.length ?? 0) <= 260);
});
