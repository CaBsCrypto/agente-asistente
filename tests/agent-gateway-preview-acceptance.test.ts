import assert from "node:assert/strict";
import test from "node:test";
import {
  buildVercelCurlArgs,
  parseVercelCurlOutput,
  redactAcceptanceSecrets,
} from "../scripts/agent-gateway-preview-acceptance";

test("Preview acceptance redacts personal credentials from failures", () => {
  const token = "carmelita_user_sensitive_example";
  assert.equal(
    redactAcceptanceSecrets(`request failed for ${token}`, [token]),
    "request failed for [REDACTED_PAT]",
  );
});

test("Preview acceptance invokes Vercel without a shell", () => {
  const args = buildVercelCurlArgs({
    deployment: "https://example-preview.vercel.app",
    path: "/api/v1/actions/plan",
    token: "carmelita_user_test",
    method: "POST",
    body: { capabilityId: "stellar.wallet.status" },
  });
  assert.deepEqual(args.slice(0, 4), [
    "curl",
    "/api/v1/actions/plan",
    "--deployment",
    "https://example-preview.vercel.app",
  ]);
  assert.ok(args.includes("Authorization: Bearer carmelita_user_test"));
  assert.ok(args.includes("--write-out"));
});

test("Preview acceptance parses an explicit HTTP status marker", () => {
  assert.deepEqual(
    parseVercelCurlOutput('{"ok":true}\n__CARMELITA_HTTP_STATUS__:201'),
    { status: 201, body: { ok: true } },
  );
  assert.throws(
    () => parseVercelCurlOutput('{"ok":true}'),
    /preview_acceptance_status_missing/,
  );
});
