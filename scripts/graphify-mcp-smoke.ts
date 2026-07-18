import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

function commandPath() {
  if (process.env.GRAPHIFY_MCP_COMMAND) return process.env.GRAPHIFY_MCP_COMMAND;
  if (process.platform === "win32" && process.env.USERPROFILE) {
    const candidate = join(process.env.USERPROFILE, ".local", "bin", "graphify-mcp.exe");
    if (existsSync(candidate)) return candidate;
  }
  return "graphify-mcp";
}

function textContent(content: unknown) {
  if (!Array.isArray(content)) return "";
  return content
    .filter((item): item is { type: "text"; text: string } =>
      Boolean(item && typeof item === "object" && "type" in item && item.type === "text" && "text" in item && typeof item.text === "string"),
    )
    .map((item) => item.text)
    .join("\n");
}

const graphPath = resolve("graphify-out", "graph.json");
if (!existsSync(graphPath)) throw new Error("graphify_graph_missing");

const client = new Client(
  { name: "agent-assistant-graphify-smoke", version: "0.1.0" },
  { capabilities: {} },
);
const transport = new StdioClientTransport({
  command: commandPath(),
  args: [graphPath],
  cwd: process.cwd(),
  stderr: "pipe",
});

try {
  await client.connect(transport);
  const listed = await client.listTools();
  const names = listed.tools.map((tool) => tool.name);
  const required = ["query_graph", "get_node", "get_neighbors", "shortest_path", "graph_stats"];
  const missing = required.filter((name) => !names.includes(name));
  if (missing.length) throw new Error("graphify_tools_missing:" + missing.join(","));

  const stats = await client.callTool({ name: "graph_stats", arguments: {} });
  if (stats.isError) throw new Error("graphify_stats_failed");

  const queryTool = listed.tools.find((tool) => tool.name === "query_graph");
  const properties = queryTool?.inputSchema && typeof queryTool.inputSchema === "object" && "properties" in queryTool.inputSchema
    ? Object.keys((queryTool.inputSchema.properties ?? {}) as Record<string, unknown>)
    : [];
  const queryKey = properties.includes("question") ? "question" : properties.includes("query") ? "query" : null;
  if (!queryKey) throw new Error("graphify_query_schema_unknown");

  const query = await client.callTool({
    name: "query_graph",
    arguments: { [queryKey]: "what connects agent memory to policy execution" },
  });
  if (query.isError) throw new Error("graphify_query_failed");

  console.log(JSON.stringify({
    ok: true,
    server: "graphify",
    graphPath,
    tools: names,
    stats: textContent(stats.content).slice(0, 1200),
    query: textContent(query.content).slice(0, 1200),
  }, null, 2));
} finally {
  await client.close().catch(() => undefined);
}
