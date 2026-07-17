import type { ActionPreflight } from "@/app/agent-memory";

export const AUTOPILOT_ACTIONS = [
  "defindex.deposit.xlm.prepare",
  "defindex.deposit.usdc.prepare",
  "stellar.trustline.usdc.prepare",
  "stellar.trustline.x402_usdc",
  "x402.payment",
] as const;

export const DEFAULT_AUTOPILOT_CONFIG = {
  version: 1,
  mode: "testnet_autopilot",
  network: "stellar:testnet",
  durationHours: 24,
  xlmPerAction: 5,
  usdcPerAction: 0.05,
  maxDailyActions: 10,
  allowedActionTypes: [...AUTOPILOT_ACTIONS],
  allowedProviders: ["DeFindex", "Stellar x402", "Travala", "CoinMarketCap"],
  delegatedSignerReady: false,
  executionMode: "policy_only",
} as const;

export type AutopilotConfig = {
  version: number;
  mode: string;
  network: string;
  durationHours: number;
  xlmPerAction: number;
  usdcPerAction: number;
  maxDailyActions: number;
  allowedActionTypes: string[];
  allowedProviders: string[];
  delegatedSignerReady: boolean;
  executionMode: "policy_only" | "delegated";
  activatedAt?: string;
  expiresAt?: string;
  pausedAt?: string;
};

export type AutopilotEvaluation = {
  applied: boolean;
  delegated: boolean;
  reasons: string[];
  rules: string[];
};

function positiveNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function normalizeAutopilotConfig(
  value: Record<string, unknown>,
): AutopilotConfig {
  return {
    ...DEFAULT_AUTOPILOT_CONFIG,
    durationHours: positiveNumber(value.durationHours, DEFAULT_AUTOPILOT_CONFIG.durationHours),
    xlmPerAction: positiveNumber(value.xlmPerAction, DEFAULT_AUTOPILOT_CONFIG.xlmPerAction),
    usdcPerAction: positiveNumber(value.usdcPerAction, DEFAULT_AUTOPILOT_CONFIG.usdcPerAction),
    maxDailyActions: positiveNumber(value.maxDailyActions, DEFAULT_AUTOPILOT_CONFIG.maxDailyActions),
    allowedActionTypes: Array.isArray(value.allowedActionTypes)
      ? value.allowedActionTypes.map(String)
      : [...AUTOPILOT_ACTIONS],
    allowedProviders: Array.isArray(value.allowedProviders)
      ? value.allowedProviders.map(String)
      : [...DEFAULT_AUTOPILOT_CONFIG.allowedProviders],
    delegatedSignerReady: value.delegatedSignerReady === true,
    executionMode: value.executionMode === "delegated" ? "delegated" : "policy_only",
    activatedAt: typeof value.activatedAt === "string" ? value.activatedAt : undefined,
    expiresAt: typeof value.expiresAt === "string" ? value.expiresAt : undefined,
    pausedAt: typeof value.pausedAt === "string" ? value.pausedAt : undefined,
  };
}

export function evaluateAutopilot(
  value: Record<string, unknown>,
  action: ActionPreflight,
): AutopilotEvaluation {
  const config = normalizeAutopilotConfig(value);
  const reasons: string[] = [];
  if (config.expiresAt && Date.parse(config.expiresAt) <= Date.now()) {
    return { applied: false, delegated: false, reasons: [], rules: ["Testnet Autopilot expired"] };
  }
  if (action.network !== config.network) reasons.push("autopilot_network_not_allowed");
  if (!config.allowedActionTypes.includes(action.actionType)) {
    reasons.push("autopilot_action_not_allowed");
  }
  if (action.asset?.toUpperCase() === "XLM" && Number(action.amount ?? 0) > config.xlmPerAction) {
    reasons.push("autopilot_xlm_limit_exceeded");
  }
  if (action.asset?.toUpperCase() === "USDC" && Number(action.amount ?? 0) > config.usdcPerAction) {
    reasons.push("autopilot_usdc_limit_exceeded");
  }
  if (Number(action.autopilotActionsToday ?? 0) >= config.maxDailyActions) {
    reasons.push("autopilot_daily_limit_exceeded");
  }
  return {
    applied: true,
    delegated: reasons.length === 0 && config.delegatedSignerReady && config.executionMode === "delegated",
    reasons,
    rules: ["Testnet Autopilot"],
  };
}
