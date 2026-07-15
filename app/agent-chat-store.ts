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
import {
  buildAgentReply,
  detectAgentLanguage,
  findRequestedConnection,
  type AgentDefindexIntent,
} from "@/app/agent-chat-logic";
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
  defindexIntent?: AgentDefindexIntent & { requestId: string };
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
        "Your personal Stellar Testnet wallet is active. Start the guided Testnet proof to review the wallet, activate USDC and prepare a DeFindex deposit with explicit authorization.",
      metadata: {
        actions: [
          { label: "Start Testnet proof", message: "Start my DeFindex Testnet proof" },
          { label: "Connect DeFindex", message: "Connect me to DeFindex" },
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
    defindexIntent:
      metadata.defindexIntent && typeof metadata.defindexIntent === "object"
        ? (metadata.defindexIntent as StoredAgentMessage["defindexIntent"])
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
    .toLowerCase();  const language = detectAgentLanguage(content);
  const local = (english: string, portuguese: string) =>
    language === "pt" ? portuguese : english;

  const marketSymbol = extractMarketSymbol(content);
  const requestsWatchlistAdd =
    Boolean(marketSymbol) &&
    ["add", "agrega", "agregar", "suma", "follow", "seguir", "adicione", "adicionar", "coloque", "acompanhar"].some((term) =>
      normalizedContent.includes(term),
    ) &&
    (normalizedContent.includes("watchlist") ||
      normalizedContent.includes("lista"));
  const requestsWatchlist =
    (normalizedContent.includes("watchlist") ||
      normalizedContent.includes("lista de seguimiento")) &&
    ["show", "list", "muestra", "mostrar", "ver", "mostre", "listar"].some((term) =>
      normalizedContent.includes(term),
    );
  const requestsMarketQuote =
    Boolean(marketSymbol) &&
    [
      "price",
      "precio",
      "preco",
      "cotacao",
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
      "pesquise",
      "procure",
      "encontre",
      "tarea",
      "tarefas",
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
          local("I searched your connected Notion workspace using **", "Pesquisei seu workspace conectado do Notion usando **") +
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
            label: local("Search again", "Pesquisar novamente"),
            message: language === "pt" ? "Pesquise no meu Notion as tarefas pendentes" : "Search my Notion workspace for pending project tasks",
          },
          { label: local("Open Notion", "Abrir Notion"), href: "https://www.notion.so/" },
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
          ? local("Your Notion authorization must be renewed before I can search the workspace.", "Sua autorização do Notion precisa ser renovada antes da pesquisa.")
          : local("I reached your Notion connection, but the first search did not complete. Nothing was changed. You can retry safely.", "A conexão com o Notion respondeu, mas a pesquisa não terminou. Nada foi alterado e você pode tentar novamente com segurança."),
        connection: {
          name: "Notion MCP",
          stage: reconnect ? ("Credentials needed" as const) : ("Connected" as const),
          priority: "P0" as const,
        },
        actions: reconnect
          ? [{ label: local("Reconnect Notion", "Reconectar Notion"), connect: "notion" }]
          : [
              {
                label: local("Retry Notion search", "Tentar pesquisa no Notion"),
                message: language === "pt" ? "Pesquise no meu Notion as tarefas pendentes" : "Search my Notion workspace for pending project tasks",
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
          quote.symbol + local(" is now on your persistent CoinMarketCap watchlist.", " agora está na sua watchlist persistente do CoinMarketCap."),
          formatMarketQuote(quote, language),
        ].join("\n\n"),
        connection: {
          name: "CoinMarketCap Agent Hub",
          stage: "Read-only connected" as const,
          priority: "P0" as const,
        },
        actions: [
          { label: local("Show watchlist", "Mostrar watchlist"), message: language === "pt" ? "Mostre minha watchlist de criptomoedas" : "Show my crypto watchlist" },
          {
            label: local("Check another asset", "Ver outro ativo"),
            message: language === "pt" ? "Qual é o preço atual do BTC no CoinMarketCap?" : "What is the current BTC price on CoinMarketCap?",
          },
        ],
      };
    } catch {
      reply = {
        content:
          local("CoinMarketCap could not validate that asset, so I did not add anything to your watchlist.", "O CoinMarketCap não conseguiu validar esse ativo, então nada foi adicionado à sua watchlist."),
        connection: {
          name: "CoinMarketCap Agent Hub",
          stage: "Read-only connected" as const,
          priority: "P0" as const,
        },
        actions: [
          {
            label: local("Try XLM", "Tentar XLM"),
            message: language === "pt" ? "Adicione XLM à minha watchlist do CoinMarketCap" : "Add XLM to my CoinMarketCap watchlist",
          },
        ],
      };
    }
  } else if (requestsWatchlist) {
    const watchlist = await listMarketWatchlist(userId);
    if (!watchlist.length) {
      reply = {
        content:
          local("Your CoinMarketCap watchlist is empty. Add an asset to begin tracking real market data.", "Sua watchlist do CoinMarketCap está vazia. Adicione um ativo para acompanhar dados reais de mercado."),
        connection: {
          name: "CoinMarketCap Agent Hub",
          stage: "Read-only connected" as const,
          priority: "P0" as const,
        },
        actions: [
          {
            label: local("Add XLM", "Adicionar XLM"),
            message: language === "pt" ? "Adicione XLM à minha watchlist do CoinMarketCap" : "Add XLM to my CoinMarketCap watchlist",
          },
          {
            label: local("Add BTC", "Adicionar BTC"),
            message: language === "pt" ? "Adicione BTC à minha watchlist do CoinMarketCap" : "Add BTC to my CoinMarketCap watchlist",
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
          local("**Your CoinMarketCap watchlist**", "**Sua watchlist do CoinMarketCap**"),
          rows.join("\n") || local("Live quotes are temporarily unavailable.", "As cotações ao vivo estão temporariamente indisponíveis."),
          local("Read-only market data. No trading action was performed.", "Dados de mercado somente para leitura. Nenhuma operação foi executada."),
        ].join("\n\n"),
        connection: {
          name: "CoinMarketCap Agent Hub",
          stage: "Read-only connected" as const,
          priority: "P0" as const,
        },
        actions: [
          {
            label: local("Add another asset", "Adicionar outro ativo"),
            message: language === "pt" ? "Adicione ETH à minha watchlist do CoinMarketCap" : "Add ETH to my CoinMarketCap watchlist",
          },
          {
            label: local("Refresh", "Atualizar"),
            message: language === "pt" ? "Mostre minha watchlist de criptomoedas" : "Show my crypto watchlist",
          },
        ],
      };
    }
  } else if (requestsMarketQuote && marketSymbol) {
    try {
      const quote = await getCoinMarketCapQuote(marketSymbol);
      reply = {
        content: formatMarketQuote(quote, language),
        connection: {
          name: "CoinMarketCap Agent Hub",
          stage: "Read-only connected" as const,
          priority: "P0" as const,
        },
        actions: [
          {
            label: local("Add to watchlist", "Adicionar à watchlist"),
            message:
              language === "pt" ? "Adicione " + quote.symbol + " à minha watchlist do CoinMarketCap" : "Add " + quote.symbol + " to my CoinMarketCap watchlist",
          },
          {
            label: local("Check BTC", "Ver BTC"),
            message: language === "pt" ? "Qual é o preço atual do BTC no CoinMarketCap?" : "What is the current BTC price on CoinMarketCap?",
          },
        ],
      };
    } catch (error) {
      const code =
        error instanceof Error ? error.message : "cmc_request_failed";
      reply = {
        content:
          code === "cmc_rate_limited"
            ? local("CoinMarketCap's keyless trial is temporarily rate-limited. No cached price was presented as live.", "O trial sem chave do CoinMarketCap está temporariamente limitado. Nenhum preço em cache foi apresentado como ao vivo.")
            : local("CoinMarketCap could not return a verified quote for that asset.", "O CoinMarketCap não conseguiu retornar uma cotação verificada para esse ativo."),
        connection: {
          name: "CoinMarketCap Agent Hub",
          stage: "Read-only connected" as const,
          priority: "P0" as const,
        },
        actions: [
          {
            label: local("Retry XLM", "Tentar XLM novamente"),
            message: language === "pt" ? "Qual é o preço atual do XLM no CoinMarketCap?" : "What is the current XLM price on CoinMarketCap?",
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
      defindexIntent: reply.defindexIntent
        ? { ...reply.defindexIntent, requestId: userMessage.id }
        : undefined,
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