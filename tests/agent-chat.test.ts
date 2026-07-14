import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAgentReply,
  findRequestedConnection,
} from "../app/agent-chat-logic";

test("recognizes active pilot aliases in natural language", () => {
  assert.equal(findRequestedConnection("quiero conectarme a ArkusX")?.name, "ArcusX");
  assert.equal(findRequestedConnection("connect me to DeFindex")?.name, "DeFindex");
  assert.equal(findRequestedConnection("busquemos un hotel con Travala")?.name, "Travala Travel MCP");
  assert.equal(findRequestedConnection("conecta mi espacio de Notion")?.name, "Notion MCP");
  assert.equal(findRequestedConnection("muéstrame mi tablero de Trello")?.name, "Trello");
  assert.equal(findRequestedConnection("revisa mi agenda de Google Calendar")?.name, "Google Calendar");
  assert.equal(findRequestedConnection("busca un archivo en Drive")?.name, "Google Drive");
  assert.equal(findRequestedConnection("prepara un correo en Gmail")?.name, "Gmail");
});

test("offers a real OAuth action for Notion", () => {
  const reply = buildAgentReply("connect me to Notion");
  assert.ok(
    reply.actions.some(
      (action) => action.label === "Connect Notion" && action.connect === "notion",
    ),
  );
});

test("reports Notion as connected after OAuth state is present", () => {
  const reply = buildAgentReply("connect me to Notion", {
    connectedProviders: ["notion"],
  });
  assert.equal(reply.connection?.stage, "Connected");
  assert.ok(!reply.actions.some((action) => action.connect === "notion"));
  assert.match(reply.content, /stored encrypted/i);
});

test("recognizes portfolio and market data targets", () => {
  assert.equal(findRequestedConnection("revisa precios en CoinGecko")?.name, "CoinGecko Market Data");
  assert.equal(findRequestedConnection("conecta CoinMarketCap")?.name, "CoinMarketCap Agent Hub");
  assert.equal(findRequestedConnection("quiero alertas de TradingView")?.name, "TradingView");
});

test("reports real connection status without claiming unavailable execution", () => {
  const reply = buildAgentReply("connect me to DeFindex");
  assert.match(reply.content, /Credentials needed/);
  assert.match(reply.content, /will not claim/i);
  assert.equal(reply.connection?.name, "DeFindex");
  assert.ok(reply.actions.length >= 2);
});

test("uses live wallet context while preserving authorization boundary", () => {
  const reply = buildAgentReply("show my wallet balance", {
    wallet: {
      address: "GBCTAHK3J56T4F2CSU3MQYQUMFO5ZS4IE3ZJGHOKFOYAAEN4ZAKAY5RZ",
      balance: "10000.0000000",
      network: "Stellar Testnet",
    },
  });

  assert.match(reply.content, /10000\.0000000/);
  assert.match(reply.content, /cannot sign or submit/i);
});

test("offers concrete starting points for an ambiguous request", () => {
  const reply = buildAgentReply("I want my agent to do something useful");
  assert.ok(reply.actions.some((action) => action.message?.includes("DeFindex")));
  assert.ok(reply.actions.some((action) => action.message?.includes("Travala")));
});