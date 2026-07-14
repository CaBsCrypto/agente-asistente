import { connections, type Connection } from "@/app/connections/data";

export type AgentChatAction = {
  label: string;
  message?: string;
  href?: string;
  connect?: string;
};

export type AgentChatReply = {
  content: string;
  actions: AgentChatAction[];
  connection?: {
    name: string;
    stage: Connection["stage"];
    priority: Connection["priority"];
  };
};

export type AgentChatContext = {
  wallet?: {
    address: string;
    balance: string | null;
    network: string;
  } | null;
  connectedProviders?: string[];
};

function normalized(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const aliases: Record<string, string[]> = {
  DeFindex: ["defindex", "de findex", "findex"],
  "UNBLCK / Tellus Hub": ["unblck", "unblock", "tellus", "innovation hub"],
  ArcusX: ["arcusx", "arcus", "arkusx", "arkus"],
  "Travala Travel MCP": ["travala", "travel", "hotel", "viaje"],
  "Apify MCP": ["apify"],
  "Shopify Storefront MCP": ["shopify"],
  "Cal.com MCP": ["cal.com", "cal booking", "reserva cal"],
  "Notion MCP": ["notion", "wiki", "notas", "notes"],
  Trello: ["trello", "tablero", "board", "cards", "tarjetas"],
  "Google Calendar": ["google calendar", "google calendario", "agenda"],
  "Google Drive": ["google drive", "drive", "archivos", "files", "documentos"],
  Gmail: ["gmail", "correo", "email", "mail"],
  "Privy wallet orchestration": ["privy", "wallet", "billetera"],
  "x402 Bazaar": ["x402", "bazaar"],
  "CoinGecko Market Data": ["coingecko", "coin gecko"],
  "CoinMarketCap Agent Hub": ["coinmarketcap", "coin market cap", "cmc"],
  TradingView: ["tradingview", "trading view"],
};

export function findRequestedConnection(message: string) {
  const query = normalized(message);

  for (const connection of connections) {
    const terms = aliases[connection.name] ?? [connection.name];
    if (terms.some((term) => query.includes(normalized(term)))) return connection;
  }

  return null;
}

function connectionReply(
  connection: Connection,
  context: AgentChatContext,
): AgentChatReply {
  const isConnected =
    connection.name === "Notion MCP" &&
    context.connectedProviders?.includes("notion");
  const effectiveStage: Connection["stage"] = isConnected
    ? "Connected"
    : connection.stage;
  const safeBoundary =
    effectiveStage === "Connected" || effectiveStage === "Read-only connected"
      ? "I can use the capability that is already available, but any financial or irreversible action will still require an explicit review."
      : "I can prepare the integration and its test plan now, but I will not claim the external connection is active until the required access and proof are complete.";

  return {
    content: [
      connection.name +
        " is currently **" +
        effectiveStage +
        "** (" +
        connection.priority +
        ").",
      ...(isConnected
        ? [
            "Your authorization is stored encrypted on the server and can be used only through this agent.",
          ]
        : [connection.proof, "Next step: " + connection.nextAction]),
      safeBoundary,
    ].join("\n\n"),
    connection: {
      name: connection.name,
      stage: effectiveStage,
      priority: connection.priority,
    },
    actions: [
      ...(connection.name === "Notion MCP" && !isConnected
        ? [{ label: "Connect Notion", connect: "notion" }]
        : []),
      ...(connection.name === "Notion MCP" && isConnected
        ? [
            {
              label: "Search Notion",
              message: "Search my Notion workspace for pending project tasks",
            },
          ]
        : connection.name === "CoinMarketCap Agent Hub"
          ? [
              {
                label: "Check XLM price",
                message: "What is the current XLM price on CoinMarketCap?",
              },
              {
                label: "Show watchlist",
                message: "Show my crypto watchlist",
              },
            ]
          : [
              {
                label: "Prepare " + connection.name + " plan",
                message: "Prepare the safest first test for " + connection.name,
              },
            ]),
      {
        label: "What is missing?",
        message:
          "What credentials, permissions and proof are missing for " +
          connection.name +
          "?",
      },
      { label: "Open official source", href: connection.href },
    ],
  };
}

export function buildAgentReply(
  message: string,
  context: AgentChatContext = {},
): AgentChatReply {
  const query = normalized(message);
  const connection = findRequestedConnection(message);


  if (
    query.includes("balance") ||
    query.includes("saldo") ||
    query.includes("wallet") ||
    query.includes("billetera")
  ) {
    if (!context.wallet) {
      return {
        content:
          "Your Privy identity is connected, but I do not have a persisted Stellar wallet record yet. Reopen the agent workspace so the safe wallet bootstrap can complete.",
        actions: [{ label: "Retry wallet setup", message: "Retry my Stellar wallet setup" }],
      };
    }

    const balance = context.wallet.balance ?? "not available";
    return {
      content:
        "Your active wallet is on **" + context.wallet.network + "**.\n\n" +
        "Address: " + context.wallet.address + "\n\n" +
        "Current XLM balance: **" + balance + "**.\n\n" +
        "I can use this address to prepare Testnet intents, but I cannot sign or submit a payment without your explicit authorization.",
      actions: [
        { label: "Explore DeFindex", message: "Connect me to DeFindex" },
        { label: "Prepare a test payment", message: "Prepare a 1 XLM Testnet payment" },
      ],
    };
  }

  if (connection) return connectionReply(connection, context);

  if (
    query.includes("connect") ||
    query.includes("conecta") ||
    query.includes("integrat")
  ) {
    return {
      content:
        "I can help you connect a service through a safe sequence: discover its real interface, identify credentials, prepare a reversible test, request authorization and preserve evidence. Choose one of our active pilot tracks.",
      actions: [
        { label: "Notion", message: "Connect me to Notion" },
        { label: "Trello", message: "Connect me to Trello" },
        { label: "Google Calendar", message: "Connect me to Google Calendar" },
        { label: "DeFindex", message: "Connect me to DeFindex" },
      ],
    };
  }

  if (
    query.includes("que puedes") ||
    query.includes("what can") ||
    query.includes("help") ||
    query.includes("ayuda")
  ) {
    return {
      content:
        "I can inspect your Stellar Testnet context, explain and prepare integrations, search connected read-only services, create controlled commerce intents and guide approvals. Today, wallet creation and on-chain validation are real; partner execution and payments remain gated until each connector is proven.",
      actions: [
        { label: "Show my wallet", message: "Show my wallet balance" },
        { label: "Explore connections", message: "What can I connect to?" },
        { label: "Connect Notion", message: "Connect me to Notion" },
        { label: "Search travel", message: "Connect me to Travala" },
      ],
    };
  }

  return {
    content:
      "I understand the goal, but I need one concrete target to prepare a safe action. Tell me what you want to connect, discover, reserve or pay—or choose one of the starting points below.",
    actions: [
      { label: "Connect DeFindex", message: "Connect me to DeFindex" },
      { label: "Connect ArcusX", message: "Connect me to ArcusX" },
      { label: "Explore travel", message: "Connect me to Travala" },
      { label: "Show wallet", message: "Show my wallet balance" },
    ],
  };
}