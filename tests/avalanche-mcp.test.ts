import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  AVALANCHE_MCP_ALLOWED_TOOLS,
  AVALANCHE_MCP_ENDPOINT,
  AVALANCHE_MCP_TIMEOUT_MS,
  AVALANCHE_MCP_MAX_RESPONSE_BYTES,
  assertAvalancheMcpToolAllowed,
  listAvalancheReadOnlyTools,
  searchAvalancheDocs,
} from "../app/connectors/avalanche-mcp";

type RpcRequestBody = {
  jsonrpc: "2.0";
  id: string;
  method: "tools/list" | "tools/call";
  params?: {
    name?: string;
    arguments?: Record<string, unknown>;
  };
};
function jsonResponse(payload: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: { "content-type": "application/json", ...init.headers },
  });
}

function toolsResult(id: string, extra: Record<string, unknown> = {}) {
  return {
    jsonrpc: "2.0",
    id,
    result: {
      tools: [
        { name: "docs_search", description: "Search docs", inputSchema: { type: "object" } },
        { name: "blockchain_get_native_balance", inputSchema: { type: "object" } },
        { name: "github_get_file", inputSchema: { type: "object" } },
      ],
      ...extra,
    },
  };
}

test("connector is pinned to the official endpoint and one local tool", () => {
  assert.equal(AVALANCHE_MCP_ENDPOINT, "https://build.avax.network/api/mcp");
  assert.equal(AVALANCHE_MCP_TIMEOUT_MS, 15_000);
  assert.deepEqual(AVALANCHE_MCP_ALLOWED_TOOLS, ["docs_search"]);
  assert.throws(
    () => assertAvalancheMcpToolAllowed("blockchain_get_native_balance"),
    /avalanche_mcp_tool_not_allowed/,
  );
});

test("tools/list filters the remote catalog through the closed allowlist", async () => {
  let requestBody: Record<string, unknown> | undefined;
  const fetcher: typeof fetch = async (url, init) => {
    assert.equal(url, AVALANCHE_MCP_ENDPOINT);
    requestBody = JSON.parse(String(init?.body));
    return jsonResponse(toolsResult(String(requestBody?.id)));
  };
  const result = await listAvalancheReadOnlyTools(fetcher);
  assert.equal(requestBody?.method, "tools/list");
  assert.deepEqual(result.available, ["docs_search"]);
  assert.equal(result.remoteToolCount, 3);
  assert.equal(result.readOnly, true);
});

test("docs search lists tools first and sends no credentials", async () => {
  const requests: Array<{ body: RpcRequestBody; init?: RequestInit }> = [];
  const fetcher: typeof fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body)) as RpcRequestBody;
    requests.push({ body, init });
    if (body.method === "tools/list") return jsonResponse(toolsResult(body.id));
    return jsonResponse({
      jsonrpc: "2.0",
      id: body.id,
      result: {
        content: [{
          type: "text",
          text: "Fuji uses chain ID 43113. https://build.avax.network/docs/primary-network",
        }],
      },
    });
  };
  const result = await searchAvalancheDocs({
    query: "Fuji C-Chain chain ID",
    source: "docs",
    limit: 2,
  }, fetcher);
  assert.deepEqual(requests.map(({ body }) => body.method), ["tools/list", "tools/call"]);
  assert.equal(requests[1]?.body.params?.name, "docs_search");
  assert.deepEqual(requests[1]?.body.params?.arguments, {
    query: "Fuji C-Chain chain ID", source: "docs", limit: 2,
  });
  for (const request of requests) {
    const headers = new Headers(request.init?.headers);
    assert.equal(headers.has("authorization"), false);
    assert.equal(request.init?.credentials, "omit");
    assert.equal(request.init?.redirect, "error");
  }
  assert.match(result.text, /43113/);
  assert.deepEqual(result.citations, ["https://build.avax.network/docs/primary-network"]);
});

function timeoutError() {
  const error = new Error("mock timeout");
  error.name = "TimeoutError";
  return error;
}

test("timeout fails closed and one invocation makes only one docs_search call", async () => {
  const methods: string[] = [];
  const fetcher: typeof fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body)) as RpcRequestBody;
    methods.push(body.method);
    if (body.method === "tools/list") return jsonResponse(toolsResult(body.id));
    throw timeoutError();
  };
  await assert.rejects(
    searchAvalancheDocs({ query: "terminal timeout" }, fetcher),
    /avalanche_mcp_timeout/,
  );
  assert.deepEqual(methods, ["tools/list", "tools/call"]);
  assert.equal(methods.filter((method) => method === "tools/call").length, 1);
});

test("HTTP failure is not retried", async () => {
  const methods: string[] = [];
  const fetcher: typeof fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body)) as RpcRequestBody;
    methods.push(body.method);
    if (body.method === "tools/list") return jsonResponse(toolsResult(body.id));
    return jsonResponse({ error: "upstream" }, { status: 503 });
  };
  await assert.rejects(
    searchAvalancheDocs({ query: "no HTTP retry" }, fetcher),
    /avalanche_mcp_http_503/,
  );
  assert.deepEqual(methods, ["tools/list", "tools/call"]);
});
test("strict JSON-RPC rejects ID mismatch and extra envelope fields", async () => {
  const mismatch: typeof fetch = async () => jsonResponse({
    jsonrpc: "2.0", id: "wrong-id", result: { tools: [] },
  });
  await assert.rejects(listAvalancheReadOnlyTools(mismatch), /avalanche_mcp_id_mismatch/);

  const extra: typeof fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    return jsonResponse({ ...toolsResult(body.id), unexpected: true });
  };
  await assert.rejects(listAvalancheReadOnlyTools(extra), /avalanche_mcp_response_invalid/);

  const malformedResult: typeof fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    return jsonResponse({
      jsonrpc: "2.0", id: body.id,
      result: { tools: [{ name: "docs_search" }] },
    });
  };
  await assert.rejects(
    listAvalancheReadOnlyTools(malformedResult),
    /avalanche_mcp_response_invalid/,
  );
});

test("response size and MCP errors fail closed", async () => {
  const oversized: typeof fetch = async () => new Response("{}", {
    headers: {
      "content-type": "application/json",
      "content-length": String(AVALANCHE_MCP_MAX_RESPONSE_BYTES + 1),
    },
  });
  await assert.rejects(listAvalancheReadOnlyTools(oversized), /avalanche_mcp_response_too_large/);

  const rpcError: typeof fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    return jsonResponse({
      jsonrpc: "2.0", id: body.id,
      error: { code: -32601, message: "Method not found" },
    });
  };
  await assert.rejects(listAvalancheReadOnlyTools(rpcError), /avalanche_mcp_rpc_-32601/);
});

test("knowledge route is authenticated and contains no mutation surface", async () => {
  const source = await readFile(
    new URL("../app/api/agent/avalanche/knowledge/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /verifyPrivyAccessToken/);
  assert.match(source, /sameOrigin/);
  assert.match(source, /requestSchema\.safeParse/);
  assert.match(source, /status: 400/);
  assert.match(source, /code === "avalanche_mcp_timeout" \? 504/);
  assert.match(source, /code === "avalanche_mcp_docs_search_unavailable" \? 503/);
  assert.match(source, /code\.startsWith\("avalanche_mcp_"\) \? 502/);
  assert.match(source, /:\s*401;/);
  assert.match(source, /action: z\.literal\("list"\)/);
  assert.match(source, /action: z\.literal\("search"\)/);
  assert.doesNotMatch(source, /privateKey|secretKey|signTransaction|eth_send|tools\/call.*name/i);
});

test("live official MCP smoke remains read-only", {
  skip: process.env.AVALANCHE_MCP_LIVE !== "1",
}, async () => {
  const tools = await listAvalancheReadOnlyTools();
  assert.deepEqual(tools.available, ["docs_search"]);
  assert.ok(tools.remoteToolCount >= 1);
  const result = await searchAvalancheDocs({
    query: "Avalanche Fuji C-Chain chain ID",
    source: "docs",
    limit: 2,
  });
  assert.equal(result.readOnly, true);
  assert.match(result.text, /Avalanche|Fuji|C-Chain/i);
  assert.ok(result.citations.every((url) => url.startsWith("https://build.avax.network/")));
});
