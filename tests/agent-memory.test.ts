import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateExecutionPolicies,
  parseVaultCommand,
} from "../app/agent-memory";

test("turns conversational preferences into portable knowledge", () => {
  const command = parseVaultCommand(
    "Recuerda que prefiero hoteles tranquilos y con escritorio",
  );
  assert.equal(command?.action, "save");
  if (command?.action !== "save") return;
  assert.equal(command.record, "knowledge");
  assert.equal(command.kind, "travel_preference");
  assert.equal(command.status, "active");
});

test("turns spending language into a hard structured policy", () => {
  const command = parseVaultCommand(
    "Recuerda que mi maximo es 5 XLM por operacion",
  );
  assert.equal(command?.action, "save");
  if (command?.action !== "save") return;
  assert.equal(command.record, "policy");
  assert.equal(command.kind, "spend_limit");
  assert.deepEqual(command.config, {
    amount: 5,
    asset: "XLM",
    period: "per_action",
  });
});

test("keeps dangerous delegated authority as a draft", () => {
  const command = parseVaultCommand(
    "Recuerda que puedes pagar sin preguntarme",
  );
  assert.equal(command?.action, "save");
  if (command?.action !== "save") return;
  assert.equal(command.kind, "authority");
  assert.equal(command.status, "draft");
});

test("blocks an action before signing when a user limit is exceeded", () => {
  const decision = evaluateExecutionPolicies(
    [
      {
        id: "policy-1",
        kind: "spend_limit",
        label: "Maximum 5 XLM per action",
        enforcement: "hard",
        config: { amount: 5, asset: "XLM" },
      },
    ],
    {
      actionType: "defindex.deposit.xlm",
      network: "stellar:testnet",
      asset: "XLM",
      amount: 10,
      financial: true,
      irreversible: true,
    },
  );
  assert.equal(decision.allowed, false);
  assert.ok(decision.reasonCodes.includes("spend_limit_exceeded"));
  assert.equal(decision.requiresApproval, true);
});

test("allows preparation inside the limit but still requires approval", () => {
  const decision = evaluateExecutionPolicies(
    [
      {
        id: "policy-1",
        kind: "network",
        label: "Stellar Testnet only",
        enforcement: "hard",
        config: { allowedNetworks: ["stellar:testnet"] },
      },
    ],
    {
      actionType: "defindex.deposit.xlm",
      network: "stellar:testnet",
      asset: "XLM",
      amount: 1,
      financial: true,
      irreversible: true,
    },
  );
  assert.equal(decision.allowed, true);
  assert.equal(decision.requiresApproval, true);
  assert.deepEqual(decision.reasonCodes, ["within_user_policy"]);
});

test("mainnet remains blocked independently of user memory", () => {
  const decision = evaluateExecutionPolicies([], {
    actionType: "transfer",
    network: "stellar:mainnet",
    asset: "XLM",
    amount: 1,
    financial: true,
  });
  assert.equal(decision.allowed, false);
  assert.ok(decision.reasonCodes.includes("mainnet_disabled"));
});

