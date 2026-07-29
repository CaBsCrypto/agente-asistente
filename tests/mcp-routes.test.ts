// HTTP-level tests for the MCP surfaces.
//
// Before these existed, nothing in the suite POSTed to any MCP route, which is
// how both sibling routes shipped answering 404 to every valid authenticated
// request while the suite stayed green. Each test below is the regression net
// for one specific defect.
import assert from "node:assert/strict";
import test, { after } from "node:test";
import { DELETE as sandboxDelete, POST as sandboxPost } from "../app/api/mcp/route";
import { POST as agentPost } from "../app/api/mcp/agent/route";
import { POST as providerPost } from "../app/api/mcp/provider/route";
import { getAgentMcpHandler } from "../app/mcp/agent-server";
import { getProviderMcpHandler } from "../app/mcp/provider-server";

// createMcpHandler starts a module-level session-cleanup interval
// (mcp-handler/dist/index.mjs:232) and never unrefs it, so any process that
// builds a handler never exits on its own. The handler is built lazily on the
// first request, so unref'ing here — before any request — is enough.
const realSetInterval = globalThis.setInterval;
globalThis.setInterval = ((...args: Parameters<typeof realSetInterval>) => {
  const timer = realSetInterval(...args);
  timer.unref?.();
  return timer;
}) as typeof globalThis.setInterval;

const SANDBOX_URL = "http://localhost/api/mcp";
const PROTOCOL_VERSION = "2025-06-18";

let nextId = 0;

function rpc(method: string, params: Record<string, unknown> = {}) {
  return {
    jsonrpc: "2.0" as const,
    id: ++nextId,
    method,
    params,
  };
}

function mcpRequest(url: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

// The streamable-HTTP transport may answer as JSON or as a single SSE frame.
// Both carry the same JSON-RPC envelope.
async function readEnvelope(response: Response) {
  const raw = await response.text();
  if (!raw.trim()) return null;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("text/event-stream")) {
    const line = raw
      .split(/\r?\n/)
      .find((entry) => entry.startsWith("data:"));
    return line ? JSON.parse(line.slice(5).trim()) : null;
  }
  return JSON.parse(raw);
}

const INITIALIZE = rpc("initialize", {
  protocolVersion: PROTOCOL_VERSION,
  capabilities: {},
  clientInfo: { name: "stage-a-tests", version: "1.0.0" },
});

// Every initialize opens a transport that keeps the process alive, so each one
// is tracked and torn down when the file finishes.
const openSessions = new Set<string>();

async function initializeSandbox() {
  const response = await sandboxPost(mcpRequest(SANDBOX_URL, INITIALIZE));
  const sessionId = response.headers.get("mcp-session-id");
  if (sessionId) openSessions.add(sessionId);
  return { response, sessionId };
}

after(async () => {
  for (const sessionId of openSessions) {
    await sandboxDelete(
      new Request(SANDBOX_URL, {
        method: "DELETE",
        headers: { "mcp-session-id": sessionId },
      }),
    ).catch(() => {});
  }
  openSessions.clear();
});

// Drives one tool call against the public sandbox, returning the parsed tool
// payload. The sandbox is unauthenticated by design, so no bearer is involved.
async function callTool(name: string, args: Record<string, unknown>) {
  const { sessionId } = await initializeSandbox();
  const headers: Record<string, string> = sessionId
    ? { "mcp-session-id": sessionId }
    : {};
  const response = await sandboxPost(
    mcpRequest(SANDBOX_URL, rpc("tools/call", { name, arguments: args }), headers),
  );
  const envelope = await readEnvelope(response);
  const text = envelope?.result?.content?.[0]?.text;
  return {
    status: response.status,
    isError: envelope?.result?.isError === true,
    payload: typeof text === "string" ? JSON.parse(text) : null,
    raw: typeof text === "string" ? text : "",
  };
}

test("initialize against the public sandbox returns 200", async () => {
  const { response } = await initializeSandbox();
  assert.equal(response.status, 200);
});

test("tools/list exposes exactly the expected sandbox tools", async () => {
  const { sessionId } = await initializeSandbox();
  const headers: Record<string, string> = sessionId
    ? { "mcp-session-id": sessionId }
    : {};
  const response = await sandboxPost(
    mcpRequest(SANDBOX_URL, rpc("tools/list"), headers),
  );
  const envelope = await readEnvelope(response);
  const names = (envelope?.result?.tools ?? [])
    .map((tool: { name: string }) => tool.name)
    .sort();
  assert.deepEqual(names, [
    "create_intent",
    "demo_authorize_intent",
    "evaluate_policy",
    "execute_authorized_intent",
    "get_offer",
    "get_receipt",
    "search_offers",
  ]);
});

test("the sibling routes reject a request with no bearer", async () => {
  for (const [path, handler] of [
    ["http://localhost/api/mcp/agent", agentPost],
    ["http://localhost/api/mcp/provider", providerPost],
  ] as const) {
    const response = await handler(mcpRequest(path, INITIALIZE));
    assert.equal(response.status, 401, `${path} should require a bearer`);
  }
});

// Regression test for B4. Both sibling routes passed `basePath: "/api/mcp"`,
// from which mcp-handler derived `/api/mcp/mcp` — a path no file serves — so an
// authenticated request fell through the dispatcher and returned 404. Driving
// the handlers directly skips auth and proves the dispatch itself matches.
test("an authenticated request to a sibling route is dispatched, not 404'd", async () => {
  for (const [path, getHandler] of [
    ["http://localhost/api/mcp/agent", getAgentMcpHandler],
    ["http://localhost/api/mcp/provider", getProviderMcpHandler],
  ] as const) {
    const response = await getHandler()(mcpRequest(path, INITIALIZE));
    assert.notEqual(response.status, 404, `${path} must not 404 on a dispatched request`);
    assert.equal(response.status, 200, `${path} should initialize`);
  }
});

// Regression test for B1/B2. The idempotency key used to be globally unique, so
// a second actor reusing a key was handed the first actor's intent.
test("the same idempotency key under two actors never crosses the actor boundary", async () => {
  const idempotencyKey = "shared-key-" + Math.random().toString(36).slice(2, 10);
  const args = { offerId: "defindex-yield-demo", idempotencyKey };

  const alice = await callTool("create_intent", { ...args, actorId: "actor-alice" });
  assert.equal(alice.isError, false, alice.raw);
  const aliceIntentId = alice.payload.intent.id;

  const mallory = await callTool("create_intent", { ...args, actorId: "actor-mallory" });
  assert.equal(mallory.isError, false, mallory.raw);
  assert.notEqual(mallory.payload.intent.id, aliceIntentId);

  // Knowing the id is not enough: the actor scope is what refuses the read.
  const stolen = await callTool("get_receipt", {
    intentId: aliceIntentId,
    actorId: "actor-mallory",
  });
  assert.equal(stolen.isError, true);
  assert.equal(stolen.payload.error, "intent_not_found");
});

// Regression test for B6. evaluate_policy used to reset an executed intent back
// to policy_approved, contradicting the exactly-once claim.
test("evaluate_policy cannot rewind an executed intent", async () => {
  const actorId = "actor-monotonic";
  const created = await callTool("create_intent", {
    offerId: "defindex-yield-demo",
    actorId,
    idempotencyKey: "monotonic-" + Math.random().toString(36).slice(2, 10),
  });
  const intentId = created.payload.intent.id;

  await callTool("evaluate_policy", { intentId, actorId });
  const authorized = await callTool("demo_authorize_intent", {
    intentId,
    actorId,
    explicitUserConfirmation: true,
  });
  await callTool("execute_authorized_intent", {
    intentId,
    actorId,
    authorizationToken: authorized.payload.authorizationToken,
  });

  const rewind = await callTool("evaluate_policy", { intentId, actorId });
  assert.equal(rewind.isError, true);
  assert.equal(rewind.payload.error, "intent_already_final");
});

// Regression test for B5. fail() forwarded error.message verbatim, and Drizzle
// embeds the failing statement plus every bound parameter in it.
test("an unexpected error never leaks its detail to the caller", async () => {
  const leaked = await callTool("get_offer", { offerId: "no-such-offer-id" });
  assert.equal(leaked.isError, true);
  assert.equal(leaked.payload.error, "offer_not_found");

  const { publicErrorCode } = await import("../app/mcp/respond");
  const sqlish = new Error(
    'insert into "commerce_intents" ("id","actor_id") values ($1,$2) — did:privy:real-user',
  );
  assert.equal(publicErrorCode(sqlish), "internal_error");
  assert.doesNotMatch(publicErrorCode(sqlish), /insert into|did:privy/);
});

// The sandbox is unauthenticated, so it needs to go offline without a deploy.
test("MCP_SANDBOX_ENABLED=false takes the sandbox offline", async () => {
  const previous = process.env.MCP_SANDBOX_ENABLED;
  process.env.MCP_SANDBOX_ENABLED = "false";
  try {
    const blocked = await callTool("search_offers", { query: "" });
    assert.equal(blocked.isError, true);
    assert.equal(blocked.payload.error, "sandbox_disabled");
  } finally {
    if (previous === undefined) delete process.env.MCP_SANDBOX_ENABLED;
    else process.env.MCP_SANDBOX_ENABLED = previous;
  }
});
