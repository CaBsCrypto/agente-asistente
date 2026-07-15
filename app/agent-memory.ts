export type VaultLanguage = "en" | "es" | "pt";

export type ParsedVaultCommand =
  | { action: "list" }
  | {
      action: "save";
      record: "knowledge" | "policy";
      kind: string;
      label: string;
      content: string;
      config: Record<string, unknown>;
      enforcement: "hard" | "advisory";
      sensitivity: "standard" | "sensitive";
      status: "active" | "draft";
    };

export type ExecutionPolicy = {
  id: string;
  kind: string;
  label: string;
  enforcement: string;
  config: Record<string, unknown>;
};

export type ActionPreflight = {
  actionType: string;
  network: string;
  asset?: string;
  amount?: number;
  irreversible?: boolean;
  financial?: boolean;
};

export type PolicyDecision = {
  allowed: boolean;
  outcome: "allowed" | "blocked";
  reasonCodes: string[];
  appliedRules: string[];
  requiresApproval: boolean;
  summary: string;
};

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function extractRememberedContent(message: string) {
  const patterns = [
    /^\s*recuerda(?:\s+que)?\s+/i,
    /^\s*remember(?:\s+that)?\s+/i,
    /^\s*lembre(?:-se)?(?:\s+de\s+que|\s+que)?\s+/i,
  ];
  for (const pattern of patterns) {
    if (pattern.test(message)) return message.replace(pattern, "").trim();
  }
  return null;
}

export function parseVaultCommand(message: string): ParsedVaultCommand | null {
  const query = normalized(message);
  const asksList = [
    "que sabes de mi",
    "que recuerdas de mi",
    "muestra mi memoria",
    "show my memory",
    "what do you know about me",
    "what do you remember about me",
    "o que voce sabe sobre mim",
    "mostre minha memoria",
  ].some((term) => query.includes(term));
  if (asksList) return { action: "list" };

  const content = extractRememberedContent(message);
  if (!content) return null;
  const plain = normalized(content);

  const limit = plain.match(
    /(?:maximo|limite|no mas de|hasta|maximum|max|limit|no more than|ate|limite de)\s*(?:(?:de|es|is|e)\s*)?(\d+(?:[.,]\d{1,7})?)\s*(xlm|usdc|usd)?/i,
  );
  if (limit) {
    const amount = Number(limit[1].replace(",", "."));
    const asset = (limit[2] || "XLM").toUpperCase();
    return {
      action: "save",
      record: "policy",
      kind: "spend_limit",
      label: `Maximum ${amount} ${asset} per action`,
      content,
      config: { amount, asset, period: "per_action" },
      enforcement: "hard",
      sensitivity: "sensitive",
      status: "active",
    };
  }

  if (
    (plain.includes("solo") || plain.includes("only") || plain.includes("somente")) &&
    plain.includes("testnet")
  ) {
    return {
      action: "save",
      record: "policy",
      kind: "network",
      label: "Stellar Testnet only",
      content,
      config: { allowedNetworks: ["stellar:testnet"] },
      enforcement: "hard",
      sensitivity: "sensitive",
      status: "active",
    };
  }

  if (
    ["preguntame antes", "pide confirmacion", "ask me before", "require confirmation", "pergunte antes", "peca confirmacao"].some(
      (term) => plain.includes(term),
    )
  ) {
    return {
      action: "save",
      record: "policy",
      kind: "approval",
      label: "Explicit approval for financial actions",
      content,
      config: { alwaysRequireApproval: true, actionTypes: ["financial", "irreversible"] },
      enforcement: "hard",
      sensitivity: "sensitive",
      status: "active",
    };
  }

  if (
    ["conservador", "conservative", "conservador", "riesgo bajo", "low risk", "baixo risco"].some(
      (term) => plain.includes(term),
    )
  ) {
    return {
      action: "save",
      record: "policy",
      kind: "risk",
      label: "Conservative risk profile",
      content,
      config: { level: "conservative" },
      enforcement: "advisory",
      sensitivity: "sensitive",
      status: "active",
    };
  }

  const attemptsDelegation =
    ["sin preguntarme", "without asking me", "sem me perguntar"].some((term) =>
      plain.includes(term),
    ) &&
    ["paga", "pay", "deposit", "deposita", "compra", "buy", "compre"].some((term) =>
      plain.includes(term),
    );
  if (attemptsDelegation) {
    return {
      action: "save",
      record: "policy",
      kind: "authority",
      label: "Proposed delegated authority",
      content,
      config: { proposedAuthority: content, requiresManualActivation: true },
      enforcement: "hard",
      sensitivity: "sensitive",
      status: "draft",
    };
  }

  const kind = ["hotel", "viaje", "travel", "viagem", "vuelo", "flight"].some((term) =>
    plain.includes(term),
  )
    ? "travel_preference"
    : ["proyecto", "project", "projeto"].some((term) => plain.includes(term))
      ? "project_context"
      : "preference";

  return {
    action: "save",
    record: "knowledge",
    kind,
    label: content.length > 64 ? content.slice(0, 61) + "..." : content,
    content,
    config: {},
    enforcement: "advisory",
    sensitivity: "standard",
    status: "active",
  };
}

export function evaluateExecutionPolicies(
  policies: ExecutionPolicy[],
  action: ActionPreflight,
): PolicyDecision {
  const reasons: string[] = [];
  const applied: string[] = [];
  let requiresApproval = Boolean(action.financial || action.irreversible);

  if (action.network.includes("mainnet")) {
    reasons.push("mainnet_disabled");
    applied.push("MVP safety boundary: Mainnet is disabled");
  }

  for (const policy of policies) {
    if (policy.kind === "network") {
      const networks = Array.isArray(policy.config.allowedNetworks)
        ? policy.config.allowedNetworks.map(String)
        : [];
      if (networks.length) {
        applied.push(policy.label);
        if (!networks.includes(action.network)) reasons.push("network_not_allowed");
      }
    }
    if (policy.kind === "spend_limit" && typeof action.amount === "number") {
      const maximum = Number(policy.config.amount);
      const asset = String(policy.config.asset ?? action.asset ?? "").toUpperCase();
      if (!Number.isNaN(maximum) && (!action.asset || asset === action.asset.toUpperCase())) {
        applied.push(policy.label);
        if (action.amount > maximum) reasons.push("spend_limit_exceeded");
      }
    }
    if (policy.kind === "approval" && policy.config.alwaysRequireApproval === true) {
      applied.push(policy.label);
      requiresApproval = true;
    }
    if (policy.kind === "risk") applied.push(policy.label);
  }

  const uniqueReasons = [...new Set(reasons)];
  const uniqueApplied = [...new Set(applied)];
  const allowed = uniqueReasons.length === 0;
  return {
    allowed,
    outcome: allowed ? "allowed" : "blocked",
    reasonCodes: allowed ? ["within_user_policy"] : uniqueReasons,
    appliedRules: uniqueApplied,
    requiresApproval,
    summary: allowed
      ? requiresApproval
        ? "Allowed to prepare. Explicit approval is still required before execution."
        : "Allowed within the user's active rules."
      : "Blocked before preparation because an active user rule was violated.",
  };
}

