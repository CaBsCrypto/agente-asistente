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


test("classifies natural Spanish payment obligations as an approval policy", () => {
  const command = parseVaultCommand(
    "Siempre debes preguntarme antes de cada pago",
  );
  assert.equal(command?.action, "save");
  if (command?.action !== "save") return;
  assert.equal(command.record, "policy");
  assert.equal(command.kind, "approval");
  assert.equal(command.enforcement, "hard");
  assert.deepEqual(command.config, {
    alwaysRequireApproval: true,
    actionTypes: ["financial", "irreversible"],
  });
});

test("classifies English and Portuguese approval obligations as policies", () => {
  for (const message of [
    "You must ask me before every payment",
    "Sempre deve me perguntar antes de cada pagamento",
  ]) {
    const command = parseVaultCommand(message);
    assert.equal(command?.action, "save");
    if (command?.action !== "save") continue;
    assert.equal(command.record, "policy");
    assert.equal(command.kind, "approval");
    assert.equal(command.status, "active");
  }
});

test("understands natural-language spend limits", () => {
  for (const message of [
    "Recuerda que no gastes m\u00e1s de 0,10 USDC por pago",
    "Remember that my spending limit is 2 XLM",
    "Lembre que n\u00e3o gaste mais de 3 USDC",
  ]) {
    const command = parseVaultCommand(message);
    assert.equal(command?.action, "save");
    if (command?.action !== "save") continue;
    assert.equal(command.record, "policy");
    assert.equal(command.kind, "spend_limit");
    assert.equal(command.enforcement, "hard");
  }
});

test("Testnet Autopilot enforces caps before delegated execution", () => {
  const decision = evaluateExecutionPolicies(
    [
      {
        id: "autopilot-1",
        kind: "autopilot",
        label: "Testnet Autopilot",
        enforcement: "hard",
        config: {
          network: "stellar:testnet",
          allowedActionTypes: ["defindex.deposit.xlm.prepare"],
          xlmPerAction: 5,
          usdcPerAction: 0.05,
          maxDailyActions: 10,
          delegatedSignerReady: true,
          executionMode: "delegated",
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
        },
      },
    ],
    {
      actionType: "defindex.deposit.xlm.prepare",
      network: "stellar:testnet",
      asset: "XLM",
      amount: 6,
      financial: true,
      irreversible: true,
      autopilotActionsToday: 0,
    },
  );
  assert.equal(decision.allowed, false);
  assert.ok(decision.reasonCodes.includes("autopilot_xlm_limit_exceeded"));
});

test("Testnet Autopilot removes the approval step only when delegated signing is ready", () => {
  const basePolicy = {
    id: "autopilot-1",
    kind: "autopilot",
    label: "Testnet Autopilot",
    enforcement: "hard",
    config: {
      network: "stellar:testnet",
      allowedActionTypes: ["x402.payment"],
      xlmPerAction: 5,
      usdcPerAction: 0.05,
      maxDailyActions: 10,
      executionMode: "policy_only",
      delegatedSignerReady: false,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    },
  };
  const action = {
    actionType: "x402.payment",
    network: "stellar:testnet",
    asset: "USDC",
    amount: 0.01,
    financial: true,
    irreversible: true,
    autopilotActionsToday: 0,
  };
  const manual = evaluateExecutionPolicies([basePolicy], action);
  assert.equal(manual.allowed, true);
  assert.equal(manual.requiresApproval, true);
  const delegated = evaluateExecutionPolicies(
    [{
      ...basePolicy,
      config: {
        ...basePolicy.config,
        executionMode: "delegated",
        delegatedSignerReady: true,
      },
    }],
    action,
  );
  assert.equal(delegated.allowed, true);
  assert.equal(delegated.requiresApproval, false);
});

test("an explicit approval rule overrides Testnet Autopilot delegation", () => {
  const decision = evaluateExecutionPolicies(
    [
      {
        id: "autopilot-1",
        kind: "autopilot",
        label: "Testnet Autopilot",
        enforcement: "hard",
        config: {
          network: "stellar:testnet",
          allowedActionTypes: ["x402.payment"],
          usdcPerAction: 0.05,
          maxDailyActions: 10,
          delegatedSignerReady: true,
          executionMode: "delegated",
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
        },
      },
      {
        id: "approval-1",
        kind: "approval",
        label: "Always ask",
        enforcement: "hard",
        config: { alwaysRequireApproval: true },
      },
    ],
    {
      actionType: "x402.payment",
      network: "stellar:testnet",
      asset: "USDC",
      amount: 0.01,
      financial: true,
      irreversible: true,
    },
  );
  assert.equal(decision.allowed, true);
  assert.equal(decision.requiresApproval, true);
});
