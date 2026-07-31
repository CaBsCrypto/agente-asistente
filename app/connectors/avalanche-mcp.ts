import { randomUUID } from "node:crypto";
import { z } from "zod";

export const AVALANCHE_MCP_ENDPOINT = "https://build.avax.network/api/mcp" as const;
export const AVALANCHE_MCP_TIMEOUT_MS = 15_000;
export const AVALANCHE_MCP_MAX_RESPONSE_BYTES = 256 * 1024;
export const AVALANCHE_MCP_ALLOWED_TOOLS = ["docs_search"] as const;

type AllowedTool = (typeof AVALANCHE_MCP_ALLOWED_TOOLS)[number];

const docsSearchInputSchema = z.object({
  query: z.string().trim().min(2).max(200).refine(
    (value) => !/[\u0000-\u001f\u007f]/.test(value),
    "control_characters_not_allowed",
  ),
  source: z.enum(["docs", "academy", "integrations", "blog"]).optional(),
  limit: z.number().int().min(1).max(5).default(5),
}).strict();

const jsonRpcErrorSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number(), z.null()]),
  error: z.object({
    code: z.number().int(),
    message: z.string().min(1).max(500),
    data: z.unknown().optional(),
  }).strict(),
}).strict();

const jsonRpcSuccessSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]),
  result: z.unknown(),
}).strict();

const toolSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  inputSchema: z.record(z.string(), z.unknown()),
}).passthrough();
const toolsListResultSchema = z.object({
  tools: z.array(toolSchema).max(200),
  nextCursor: z.string().optional(),
}).strict();
const docsCallResultSchema = z.object({
  content: z.array(z.object({
    type: z.literal("text"),
    text: z.string().max(128 * 1024),
  }).strict()).min(1).max(10),
  isError: z.boolean().optional(),
}).strict();

export type AvalancheDocsSearchInput = z.input<typeof docsSearchInputSchema>;

export function assertAvalancheMcpToolAllowed(name: string): asserts name is AllowedTool {
  if (!(AVALANCHE_MCP_ALLOWED_TOOLS as readonly string[]).includes(name)) {
    throw new Error("avalanche_mcp_tool_not_allowed");
  }
}

async function readBoundedJson(response: Response) {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error("avalanche_mcp_content_type_invalid");
  }
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > AVALANCHE_MCP_MAX_RESPONSE_BYTES) {
    throw new Error("avalanche_mcp_response_too_large");
  }
  if (!response.body) throw new Error("avalanche_mcp_response_empty");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > AVALANCHE_MCP_MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("avalanche_mcp_response_too_large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new Error("avalanche_mcp_json_invalid");
  }
}

async function callJsonRpc(input: {
  method: "tools/list" | "tools/call";
  params?: Record<string, unknown>;
  fetcher?: typeof fetch;
  timeoutMs?: number;
}) {
  const id = `carmelita-avalanche-${randomUUID()}`;
  let response: Response;
  try {
    response = await (input.fetcher ?? fetch)(AVALANCHE_MCP_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id,
        method: input.method,
        ...(input.params ? { params: input.params } : {}),
      }),
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      signal: AbortSignal.timeout(input.timeoutMs ?? AVALANCHE_MCP_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new Error("avalanche_mcp_timeout");
    }
    throw new Error("avalanche_mcp_unreachable");
  }
  if (!response.ok) throw new Error(`avalanche_mcp_http_${response.status}`);
  const payload = await readBoundedJson(response);
  const rpcError = jsonRpcErrorSchema.safeParse(payload);
  if (rpcError.success) throw new Error(`avalanche_mcp_rpc_${rpcError.data.error.code}`);
  const success = jsonRpcSuccessSchema.safeParse(payload);
  if (!success.success) throw new Error("avalanche_mcp_response_invalid");
  if (success.data.id !== id) throw new Error("avalanche_mcp_id_mismatch");
  return success.data.result;
}

export async function listAvalancheReadOnlyTools(
  fetcher: typeof fetch = fetch,
  timeoutMs = AVALANCHE_MCP_TIMEOUT_MS,
) {
  const parsed = toolsListResultSchema.safeParse(
    await callJsonRpc({ method: "tools/list", fetcher, timeoutMs }),
  );
  if (!parsed.success) throw new Error("avalanche_mcp_response_invalid");
  const result = parsed.data;
  const remoteNames = new Set(result.tools.map((tool) => tool.name));
  const available = AVALANCHE_MCP_ALLOWED_TOOLS.filter((name) => remoteNames.has(name));
  if (!available.includes("docs_search")) {
    throw new Error("avalanche_mcp_docs_search_unavailable");
  }
  return {
    endpoint: AVALANCHE_MCP_ENDPOINT,
    available: [...available],
    remoteToolCount: result.tools.length,
    readOnly: true as const,
  };
}

export async function searchAvalancheDocs(
  input: AvalancheDocsSearchInput,
  fetcher: typeof fetch = fetch,
) {
  const parsed = docsSearchInputSchema.parse(input);
  const startedAt = Date.now();
  const nextTimeout = () => {
    const remaining = AVALANCHE_MCP_TIMEOUT_MS - (Date.now() - startedAt);
    if (remaining <= 0) throw new Error("avalanche_mcp_timeout");
    return Math.max(1, remaining);
  };

  await listAvalancheReadOnlyTools(fetcher, nextTimeout());
  assertAvalancheMcpToolAllowed("docs_search");
  const callResult = docsCallResultSchema.safeParse(await callJsonRpc({
    method: "tools/call",
    params: { name: "docs_search", arguments: parsed },
    fetcher,
    timeoutMs: nextTimeout(),
  }));
  if (!callResult.success) throw new Error("avalanche_mcp_response_invalid");
  if (Date.now() - startedAt > AVALANCHE_MCP_TIMEOUT_MS) {
    throw new Error("avalanche_mcp_timeout");
  }
  const result = callResult.data;
  if (result.isError === true) throw new Error("avalanche_mcp_tool_error");
  const text = result.content.map((item) => item.text).join("\n\n");
  const citations = [...new Set(
    Array.from(text.matchAll(/https:\/\/build\.avax\.network\/[a-zA-Z0-9_?&=/#.:%+~-]+/g))
      .map((match) => match[0]),
  )].slice(0, 20);
  return {
    query: parsed.query,
    source: parsed.source ?? null,
    limit: parsed.limit,
    text,
    citations,
    provider: "Avalanche Builder Hub MCP" as const,
    endpoint: AVALANCHE_MCP_ENDPOINT,
    readOnly: true as const,
  };
}
