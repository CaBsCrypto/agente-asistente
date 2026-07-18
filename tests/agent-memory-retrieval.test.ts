import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRelevantMemoryContext,
  classifyMemoryDomains,
} from "../app/agent-memory-retrieval";

const knowledge = [
  { id: "travel", kind: "travel_preference", label: "Quiet hotels with a desk", content: "I prefer quiet hotels with a desk", source: "chat", updatedAt: "2026-07-01" },
  { id: "project", kind: "project_context", label: "YC application", content: "Prepare the YC application", source: "chat", updatedAt: "2026-07-02" },
  { id: "finance", kind: "financial_preference", label: "Conservative DeFi", content: "Prefer low-risk DeFi", source: "chat", updatedAt: "2026-07-03" },
];

test("routes a travel request only to travel memories", () => {
  const context = buildRelevantMemoryContext(knowledge, "Find a hotel in Buenos Aires");
  assert.deepEqual(context.domains, ["travel"]);
  assert.deepEqual(context.items.map((item) => item.id), ["travel"]);
});

test("keeps unrelated project and finance memories out of a task request", () => {
  const context = buildRelevantMemoryContext(knowledge, "What tasks remain for the YC project?");
  assert.deepEqual(context.domains, ["projects", "tasks"]);
  assert.deepEqual(context.items.map((item) => item.id), ["project"]);
});

test("recognizes Spanish and Portuguese topic signals", () => {
  assert.deepEqual(classifyMemoryDomains("Busca un vuelo y un hotel"), ["travel"]);
  assert.deepEqual(classifyMemoryDomains("Mostre minha carteira e saldo USDC"), ["finance"]);
});
