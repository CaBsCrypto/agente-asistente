import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { getNotionAccessToken } from "@/app/connectors/notion-oauth";

type TextContent = { type: "text"; text: string };

function textFromResult(content: unknown) {
  if (!Array.isArray(content)) return "Notion returned no readable content.";
  const text = content
    .filter(
      (item): item is TextContent =>
        Boolean(
          item &&
            typeof item === "object" &&
            "type" in item &&
            item.type === "text" &&
            "text" in item &&
            typeof item.text === "string",
        ),
    )
    .map((item) => item.text)
    .join("\n\n");
  return text.slice(0, 12_000) || "Notion returned no readable content.";
}

async function withNotionClient<T>(
  userId: string,
  operation: (client: Client) => Promise<T>,
) {
  const token = await getNotionAccessToken(userId);
  const client = new Client(
    { name: "agent-assistant", version: "0.1.0" },
    { capabilities: {} },
  );
  const transport = new StreamableHTTPClientTransport(
    new URL("https://mcp.notion.com/mcp"),
    {
      requestInit: {
        headers: {
          Authorization: "Bearer " + token,
          "User-Agent": "agent-assistant/0.1.0",
        },
      },
    },
  );

  try {
    await client.connect(transport);
    return await operation(client);
  } finally {
    await client.close().catch(() => undefined);
  }
}

export async function searchNotion(userId: string, query: string) {
  return withNotionClient(userId, async (client) => {
    const tools = await client.listTools();
    const searchTool = tools.tools.find(
      (tool) => tool.name === "notion-search" || tool.name === "search",
    );
    if (!searchTool) throw new Error("notion_search_tool_unavailable");

    const result = await client.callTool({
      name: searchTool.name,
      arguments: { query: query.slice(0, 500) },
    });
    if (result.isError) throw new Error("notion_search_failed");
    return {
      tool: searchTool.name,
      text: textFromResult(result.content),
    };
  });
}