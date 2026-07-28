export const FUJI_DISTRIBUTION_AMOUNT = "0.005" as const;
export const FUJI_TRANSFER_DEMO_AMOUNT = "0.001" as const;
export const FUJI_CHAIN_ID = 43113 as const;

export type FujiDistributorConfig =
  | { enabled: false; reason: string }
  | {
      enabled: true;
      endpoint: string;
      secret: string;
      dailyLimit: number;
      amount: typeof FUJI_DISTRIBUTION_AMOUNT;
    };

export function getFujiDistributorConfig(
  env: Record<string, string | undefined> = process.env,
): FujiDistributorConfig {
  if (env.FUJI_DISTRIBUTOR_ENABLED !== "true") {
    return { enabled: false, reason: "fuji_distributor_disabled" };
  }
  const endpoint = env.FUJI_DISTRIBUTOR_URL?.trim();
  const secret = env.FUJI_DISTRIBUTOR_SECRET?.trim();
  if (!endpoint || !/^https:\/\//.test(endpoint)) {
    return { enabled: false, reason: "fuji_distributor_url_invalid" };
  }
  if (!secret || secret.length < 24) {
    return { enabled: false, reason: "fuji_distributor_secret_invalid" };
  }
  const requestedLimit = Number(env.FUJI_DISTRIBUTOR_DAILY_LIMIT ?? "100");
  const dailyLimit = Number.isInteger(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 500)
    : 100;
  return {
    enabled: true,
    endpoint,
    secret,
    dailyLimit,
    amount: FUJI_DISTRIBUTION_AMOUNT,
  };
}

export function fujiClaimWindow() {
  return "once";
}

