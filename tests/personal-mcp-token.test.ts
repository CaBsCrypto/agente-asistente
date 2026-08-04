import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createRawPersonalMcpToken, hashPersonalMcpToken, PERSONAL_MCP_SCOPES, PERSONAL_MCP_TOKEN_PREFIX, personalMcpTokenPrefix, validatePersonalMcpScopes } from "@/app/services/personal-mcp-token-store";

test("personal MCP credentials use a recognizable high-entropy prefix and SHA-256 hash", () => {
  const first = createRawPersonalMcpToken(); const second = createRawPersonalMcpToken();
  assert.match(first, /^carmelita_user_[A-Za-z0-9_-]{43}$/); assert.notEqual(first, second);
  assert.equal(PERSONAL_MCP_TOKEN_PREFIX, "carmelita_user_");
  assert.equal(hashPersonalMcpToken(first).length, 64); assert.notEqual(hashPersonalMcpToken(first), first);
  assert.ok(first.startsWith(personalMcpTokenPrefix(first)));
});
test("personal MCP scopes are allowlisted and deduplicated", () => {
  assert.deepEqual(validatePersonalMcpScopes(), ["agent:read", "agent:chat"]);
  assert.deepEqual(validatePersonalMcpScopes(["agent:read", "agent:read", "agent:plan"]), ["agent:read", "agent:plan"]);
  assert.throws(() => validatePersonalMcpScopes(["wallet:secret:read"]), /personal_mcp_scope_invalid/);
  assert.deepEqual(PERSONAL_MCP_SCOPES, ["agent:read", "agent:chat", "agent:plan"]);
});
test("personal MCP token API is Privy authenticated, same-origin and no-store", async () => {
  const collection = await readFile(new URL("../app/api/agent/mcp-tokens/route.ts", import.meta.url), "utf8");
  const member = await readFile(new URL("../app/api/agent/mcp-tokens/[tokenId]/route.ts", import.meta.url), "utf8");
  for (const source of [collection, member]) {
    assert.match(source, /verifyPrivyAccessToken/); assert.match(source, /sameOrigin/);
    assert.match(source, /"Cache-Control": "no-store"/);
  }
  assert.match(collection, /issuePersonalMcpToken/); assert.match(collection, /listPersonalMcpTokens/);
  assert.match(member, /revokePersonalMcpToken/);
});
test("personal MCP storage never exposes token hashes as metadata", async () => {
  const source = await readFile(new URL("../app/services/personal-mcp-token-store.ts", import.meta.url), "utf8");
  const projection = source.slice(source.indexOf("function publicTokenMetadata"), source.indexOf("export async function issuePersonalMcpToken"));
  assert.doesNotMatch(projection, /tokenHash/); assert.match(source, /lastUsedAt: usedAt/);
  assert.match(source, /status: "revoked"/); assert.match(source, /subjectType: "user"/);
});
test("agent MCP auth accepts personal credentials without weakening provider auth", async () => {
  const source = await readFile(new URL("../app/mcp/auth.ts", import.meta.url), "utf8");
  assert.match(source, /verifyPersonalMcpToken/); assert.match(source, /verifyPrivyAccessToken/);
  assert.match(source, /verifyServiceProviderToken/); assert.match(source, /subjectType: "provider"/);
});

test("personal MCP config follows the current deployment origin", async () => {
  const source = await readFile(new URL("../app/agent/agent-external-access.tsx", import.meta.url), "utf8");
  assert.match(source, /window\.location\.origin/);
  assert.doesNotMatch(source, /https:\/\/agente-asistente\.vercel\.app\/api\/mcp\/agent/);
});