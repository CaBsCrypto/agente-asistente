import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { searchAvaxSkills } from "../app/connectors/avaxskills";

function jsonResponse(value: unknown) {
  return new Response(JSON.stringify(value), { status: 200, headers: { "content-type": "application/json" } });
}

test("AVAX Skills search is allowlisted, bounded and advisory-only", async () => {
  let requestedUrl = "";
  const result = await searchAvaxSkills("x402 & agents", async (input) => {
    requestedUrl = String(input);
    return jsonResponse([{ name: "x402-integration", description: "A guide", skillUrl: "https://avaxskills.com/x402-integration/SKILL.md" }]);
  });
  assert.equal(requestedUrl, "https://www.avaxskills.com/api/search/?q=x402%20%26%20agents");
  assert.equal(result.trust, "advisory_unverified");
  assert.equal(result.requiresOfficialVerification, true);
  assert.equal(result.executionAllowed, false);
  assert.deepEqual(result.results[0]?.riskFlags, ["legacy_x402"]);
});

test("known unsafe patterns are explicitly flagged", async () => {
  const result = await searchAvaxSkills("wallet agents", async () => jsonResponse([
    { name: "ai-agent-patterns" },
    { name: "account-abstraction" },
  ]));
  assert.deepEqual(result.results[0]?.riskFlags, ["private_key_example"]);
  assert.deepEqual(result.results[1]?.riskFlags, ["future_research"]);
});

test("malformed remote data fails closed", async () => {
  await assert.rejects(searchAvaxSkills("x402", async () => jsonResponse({ unexpected: true })), /avaxskills_schema_invalid/);
  await assert.rejects(searchAvaxSkills("x402", async () => new Response("x", { headers: { "content-type": "text/plain" } })), /avaxskills_content_type_invalid/);
});

test("AVAX Skills route requires Privy and cannot execute remote instructions", async () => {
  const route = await readFile(new URL("../app/api/agent/avalanche/skills/route.ts", import.meta.url), "utf8");
  const connector = await readFile(new URL("../app/connectors/avaxskills.ts", import.meta.url), "utf8");
  assert.match(route, /verifyPrivyAccessToken/);
  assert.match(route, /sameOrigin/);
  assert.doesNotMatch(`${route}\n${connector}`, /eval\s*\(|sendTransaction|signTypedData|privateKey|child_process/);
  assert.match(connector, /executionAllowed: false/);
});
test("chat parser recognizes AVAX Skills in English, Spanish and Portuguese", async () => {
  const { parseAvaxSkillsIntent } = await import("../app/connectors/avalanche-read-intents");
  assert.equal(parseAvaxSkillsIntent("Search AVAX Skills for account abstraction")?.operation, "skills");
  assert.equal(parseAvaxSkillsIntent("Busca un skill de Avalanche para x402")?.operation, "skills");
  assert.equal(parseAvaxSkillsIntent("Procure no AVAX Skills por agentes")?.operation, "skills");
  assert.equal(parseAvaxSkillsIntent("Show my Stellar wallet"), null);
});

test("personal MCP exposes advisory search as a read-only tool", async () => {
  const source = await readFile(new URL("../app/api/mcp/agent/route.ts", import.meta.url), "utf8");
  const start = source.indexOf("search_avax_skills");
  const end = source.indexOf("list_avalanche_capabilities", start);
  const section = source.slice(start, end);
  assert.ok(start >= 0);
  assert.match(section, /readOnlyHint: true/);
  assert.match(section, /searchAvaxSkills/);
  assert.doesNotMatch(section, /sendTransaction|signTypedData|privateKey/i);
});