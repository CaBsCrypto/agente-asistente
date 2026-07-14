import { createHash, randomUUID } from "node:crypto";
import { and, asc, desc, eq } from "drizzle-orm";
import { getDb, hasDatabase } from "@/db";
import {
  agentConnectionInterests,
  agentConversations,
  agentExternalConnections,
  agentMessages,
  agentWallets,
} from "@/db/schema";
import { buildAgentReply, findRequestedConnection } from "@/app/agent-chat-logic";
import { getStellarTestnetAccount } from "@/app/privy-stellar";
import { searchNotion } from "@/app/connectors/notion-mcp";
import {
  addToMarketWatchlist,
  extractMarketSymbol,
  formatMarketQuote,
  getCoinMarketCapQuote,
  listMarketWatchlist,
} from "@/app/connectors/coinmarketcap";

export type StoredAgentMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  actions?: { label: string; message?: string; href?: string; connect?: string }[];
  connection?: { name: string; stage: string; priority: string };
};

function conversationId(userId: string) {
  return "conv_" + createHash("sha256").update(userId).digest("hex").slice(0, 32);
}

async function walletContext(userId: string) {
  const db = getDb();
  const rows = await db
    .select({
      address: agentWallets.address,
      network: agentWallets.network,
    })
    .from(agentWallets)
    .where(eq(agentWallets.userId, userId))
    .limit(1);

  const wallet = rows[0];
  if (!wallet) return null;
  const account = await getStellarTestnetAccount(wallet.address).catch(() => null);
  const xlm = account?.balances.find((balance) => balance.asset === "XLM");

  return {
    address: wallet.address,
    network: "Stellar Testnet",
    balance: xlm?.balance ?? null,
  };
}

async function ensureConversation(userId: string) {
  if (!hasDatabase()) throw new Error("database_not_configured");
  const db = getDb();
  const id = conversationId(userId);
  const now = new Date();

  await db
    .insert(agentConversations)
    .values({ id, userId, title: "My agent", updatedAt: now })
    .onConflictDoUpdate({
      target: agentConversations.id,
      set: { updatedAt: now },
    });

  const current = await db
    .select({ id: agentMessages.id })
    .from(agentMessages)
    .where(eq(agentMessages.conversationId, id))
    .limit(1);

  if (!current.length) {
    await db.insert(agentMessages).values({
      id: randomUUID(),
      conversationId: id,
      userId,
      role: "assistant",
      content:
        "Your Stellar wallet is active and your agent is ready. Tell me what you want to do. You can start with DeFindex, UNBLCK, ArcusX or Travala.",
      metadata: {
        actions: [
          { label: "Connect DeFindex", message: "Connect me to DeFindex" },
          { label: "Connect UNBLCK", message: "Connect me to UNBLCK" },
          { label: "Connect ArcusX", message: "Connect me to ArcusX" },
          { label: "Explore Travala", message: "Connect me to Travala" },
        ],
      },
    });
  }

  return id;
}

function publicMessage(row: {
  id: string;
  role: string;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}): StoredAgentMessage {
  const metadata = row.metadata ?? {};
  return {
    id: row.id,
    role: row.role === "user" ? "user" : "assistant",
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    actions: Array.isArray(metadata.actions)
      ? (metadata.actions as StoredAgentMessage["actions"])
      : undefined,
    connection:
      metadata.connection && typeof metadata.connection === "object"
        ? (metadata.connection as StoredAgentMessage["connection"])
        : undefined,
  };
}

export async function getAgentConversation(userId: string) {
  const db = getDb();
  const id = await ensureConversation(userId);
  const rows = await db
    .select({
      id: agentMessages.id,
      role: agentMessages.role,
      content: agentMessages.content,
      metadata: agentMessages.metadata,
      createdAt: agentMessages.createdAt,
    })
    .from(agentMessages)
    .where(eq(agentMessages.conversationId, id))
    .orderBy(asc(agentMessages.createdAt))
    .limit(80);

  return { conversationId: id, messages: rows.map(publicMessage) };
}

export async function sendAgentMessage(userId: string, content: string) {
  const db = getDb();
  const id = await ensureConversation(userId);
  const now = new Date();
  const userMessage = {
    id: randomUUID(),
    conversationId: id,
    userId,
    role: "user",
    content,
    metadata: {},
    createdAt: now,
  };

  await db.insert(agentMessages).values(userMessage);
  const [wallet, activeConnections] = await Promise.all([
    walletContext(userId),
    db
      .select({ provider: agentExternalConnections.provider })
      .from(agentExternalConnections)
      .where(
        and(
          eq(agentExternalConnections.userId, userId),
          eq(agentExternalConnections.status, "active"),
        ),
      ),
  ]);
  const connectedProviders = activeConnections.map((item) => item.provider);
  const normalizedContent = content
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const marketSymbol = extractMarketSymbol(content);
  const requestsWatchlistAdd =
    Boolean(marketSymbol) &&
    ["add", "agrega", "agregar", "suma", "follow", "seguir"].some((term) =>
      normalizedContent.includes(term),
    ) &&
    (normalizedContent.includes("watchlist") ||
      normalizedContent.includes("lista"));
  const requestsWatchlist =
    (normalizedContent.includes("watchlist") ||
      normalizedContent.includes("lista de seguimiento")) &&
    ["show", "list", "muestra", "mostrar", "ver"].some((term) =>
      normalizedContent.includes(term),
    );
  const requestsMarketQuote =
    Boolean(marketSymbol) &&
    [
      "price",
      "precio",
      "quote",
      "cotiza",
      "market cap",
      "coinmarketcap",
      "coin market cap",
      "cmc",
    ].some((term) => normalizedContent.includes(term));

  const requestsNotionSearch =
    connectedProviders.includes("notion") &&
    (normalizedContent.includes("notion") ||
      normalizedContent.includes("workspace")) &&
    [
      "search",
      "find",
      "look for",
      "busca",
      "buscar",
      "encuentra",
      "tarea",
      "task",
      "pendiente",
      "document",
      "pagina",
      "page",
    ].some((term) => normalizedContent.includes(term));

  let reply;
  if (requestsNotionSearch) {
    try {
      const result = await searchNotion(userId, content);
      reply = {
        content: [
          "I searched your connected Notion workspace using **" +
            result.tool +
            "**.",
          result.text,
        ].join("\n\n"),
        connection: {
          name: "Notion MCP",
          stage: "Connected" as const,
          priority: "P0" as const,
        },
        actions: [
          {
            label: "Search again",
            message: "Search my Notion workspace for pending project tasks",
          },
          { label: "Open Notion", href: "https://www.notion.so/" },
        ],
      };
    } catch (error) {
      const code =
        error instanceof Error
          ? error.message.split(":")[0]
          : "notion_search_failed";
      const reconnect =
        code === "notion_reauth_required" || code === "notion_not_connected";
      reply = {
        content: reconnect
          ? "Your Notion authorization must be renewed before I can search the workspace."
          : "I reached your Notion connection, but the first search did not complete. Nothing was changed. You can retry safely.",
        connection: {
          name: "Notion MCP",
          stage: reconnect ? ("Credentials needed" as const) : ("Connected" as const),
          priority: "P0" as const,
        },
        actions: reconnect
          ? [{ label: "Reconnect Notion", connect: "notion" }]
          : [
              {
                label: "Retry Notion search",
                message: "Search my Notion workspace for pending project tasks",
              },
            ],
      };
    }
  } else if (requestsWatchlistAdd && marketSymbol) {
    try {
      const quote = await getCoinMarketCapQuote(marketSymbol);
      await addToMarketWatchlist(userId, quote.symbol);
      reply = {
        content: [
          quote.symbol + " is now on your persistent CoinMarketCap watchlist.",
          formatMarketQuote(quote),
        ].join("\n\n"),
        connection: {
          name: "CoinMarketCap Agent Hub",
          stage: "Read-only connected" as const,
          priority: "P0" as const,
        },
        actions: [
          { label: "Show watchlist", message: "Show my crypto watchlist" },
          {
            label: "Check another asset",
            message: "What is the current BTC price on CoinMarketCap?",
          },
        ],
      };
    } catch {
      reply = {
        content:
          "CoinMarketCap could not validate that asset, so I did not add anything to your watchlist.",
        connection: {
          name: "CoinMarketCap Agent Hub",
          stage: "Read-only connected" as const,
          priority: "P0" as const,
        },
        actions: [
          {
            label: "Try XLM",
            message: "Add XLM to my CoinMarketCap watchlist",
          },
        ],
      };
    }
  } else if (requestsWatchlist) {
    const watchlist = await listMarketWatchlist(userId);
    if (!watchlist.length) {
      reply = {
        content:
          "Your CoinMarketCap watchlist is empty. Add an asset to begin tracking real market data.",
        connection: {
          name: "CoinMarketCap Agent Hub",
          stage: "Read-only connected" as const,
          priority: "P0" as const,
        },
        actions: [
          {
            label: "Add XLM",
            message: "Add XLM to my CoinMarketCap watchlist",
          },
          {
            label: "Add BTC",
            message: "Add BTC to my CoinMarketCap watchlist",
          },
        ],
      };
    } else {
      const results = await Promise.allSettled(
        watchlist.slice(0, 8).map((item) =>
          getCoinMarketCapQuote(item.symbol),
        ),
      );
      const rows = results
        .filter(
          (result): result is PromiseFulfilledResult<
            Awaited<ReturnType<typeof getCoinMarketCapQuote>>
          > => result.status === "fulfilled",
        )
        .map((result) => {
          const quote = result.value;
          const change =
            quote.change24h === null
              ? "n/a"
              : (quote.change24h >= 0 ? "+" : "") +
                quote.change24h.toFixed(2) +
                "%";
          return (
            "**" +
            quote.symbol +
            "** $" +
            quote.price.toLocaleString("en-US", {
              maximumFractionDigits: quote.price < 1 ? 6 : 2,
            }) +
            " | 24h " +
            change
          );
        });
      reply = {
        content: [
          "**Your CoinMarketCap watchlist**",
          rows.join("\n") || "Live quotes are temporarily unavailable.",
          "Read-only market data. No trading action was performed.",
        ].join("\n\n"),
        connection: {
          name: "CoinMarketCap Agent Hub",
          stage: "Read-only connected" as const,
          priority: "P0" as const,
        },
        actions: [
          {
            label: "Add another asset",
            message: "Add ETH to my CoinMarketCap watchlist",
          },
          {
            label: "Refresh",
            message: "Show my crypto watchlist",
          },
        ],
      };
    }
  } else if (requestsMarketQuote && marketSymbol) {
    try {
      const quote = await getCoinMarketCapQuote(marketSymbol);
      reply = {
        content: formatMarketQuote(quote),
        connection: {
          name: "CoinMarketCap Agent Hub",
          stage: "Read-only connected" as const,
          priority: "P0" as const,
        },
        actions: [
          {
            label: "Add to watchlist",
            message:
              "Add " + quote.symbol + " to my CoinMarketCap watchlist",
          },
          {
            label: "Check BTC",
            message: "What is the current BTC price on CoinMarketCap?",
          },
        ],
      };
    } catch (error) {
      const code =
        error instanceof Error ? error.message : "cmc_request_failed";
      reply = {
        content:
          code === "cmc_rate_limited"
            ? "CoinMarketCap's keyless trial is temporarily rate-limited. No cached price was presented as live."
            : "CoinMarketCap could not return a verified quote for that asset.",
        connection: {
          name: "CoinMarketCap Agent Hub",
          stage: "Read-only connected" as const,
          priority: "P0" as const,
        },
        actions: [
          {
            label: "Retry XLM",
            message: "What is the current XLM price on CoinMarketCap?",
          },
        ],
      };
    }
  } else {
    reply = buildAgentReply(content, { wallet, connectedProviders });
  }
  const assistantMessage = {
    id: randomUUID(),
    conversationId: id,
    userId,
    role: "assistant",
    content: reply.content,
    metadata: {
      actions: reply.actions,
      connection: reply.connection,
    },
    createdAt: new Date(),
  };

  await db.insert(agentMessages).values(assistantMessage);
  await db
    .update(agentConversations)
    .set({ updatedAt: new Date() })
    .where(eq(agentConversations.id, id));

  const connection = findRequestedConnection(content);
  if (connection) {
    await db
      .insert(agentConnectionInterests)
      .values({
        id: randomUUID(),
        userId,
        connectionName: connection.name,
        status: "exploring",
        lastMessage: content,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          agentConnectionInterests.userId,
          agentConnectionInterests.connectionName,
        ],
        set: {
          status: "exploring",
          lastMessage: content,
          updatedAt: new Date(),
        },
      });
  }

  return {
    conversationId: id,
    userMessage: publicMessage(userMessage),
    assistantMessage: publicMessage(assistantMessage),
  };
}

export async function recentConversationSummary(userId: string) {
  const db = getDb();
  return db
    .select({
      id: agentConversations.id,
      title: agentConversations.title,
      updatedAt: agentConversations.updatedAt,
    })
    .from(agentConversations)
    .where(eq(agentConversations.userId, userId))
    .orderBy(desc(agentConversations.updatedAt))
    .limit(10);
}