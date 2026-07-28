export const FUJI_DISTRIBUTION_AMOUNT = "0.005" as const;
export const FUJI_TRANSFER_DEMO_AMOUNT = "0.001" as const;
export const FUJI_CHAIN_ID = 43113 as const;
export const FUJI_DISTRIBUTOR_PROTOCOL = "carmelita-fuji-drip-v1" as const;
export const FUJI_DISTRIBUTOR_TIMEOUT_MS = 5_000 as const;

export type EnabledFujiDistributorConfig = {
  enabled: true;
  endpoint: string;
  secret: string;
  dailyLimit: number;
  timeoutMs: number;
  amount: typeof FUJI_DISTRIBUTION_AMOUNT;
  chainId: typeof FUJI_CHAIN_ID;
  protocol: typeof FUJI_DISTRIBUTOR_PROTOCOL;
};

export type FujiDistributorConfig =
  | { enabled: false; reason: string }
  | EnabledFujiDistributorConfig;

function safeHttpsEndpoint(input: string | undefined) {
  if (!input) return null;
  try {
    const url = new URL(input.trim());
    const hostname = url.hostname.toLowerCase();
    const forbiddenHost = hostname === "localhost"
      || hostname.endsWith(".localhost")
      || hostname.endsWith(".local")
      || hostname === "0.0.0.0"
      || hostname === "127.0.0.1"
      || hostname === "::1"
      || /^10\./.test(hostname)
      || /^192\.168\./.test(hostname)
      || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
      || /^169\.254\./.test(hostname);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || forbiddenHost) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function boundedInteger(value: string | undefined, fallback: number, min: number, max: number) {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

export function getFujiDistributorConfig(
  env: Record<string, string | undefined> = process.env,
): FujiDistributorConfig {
  if (env.FUJI_DISTRIBUTOR_ENABLED !== "true") {
    return { enabled: false, reason: "fuji_distributor_disabled" };
  }
  const endpoint = safeHttpsEndpoint(env.FUJI_DISTRIBUTOR_URL);
  if (!endpoint) return { enabled: false, reason: "fuji_distributor_url_invalid" };

  const secret = env.FUJI_DISTRIBUTOR_SECRET?.trim();
  if (!secret || secret.length < 32) {
    return { enabled: false, reason: "fuji_distributor_secret_invalid" };
  }

  const dailyLimit = boundedInteger(env.FUJI_DISTRIBUTOR_DAILY_LIMIT, 100, 1, 500);
  if (dailyLimit === null) {
    return { enabled: false, reason: "fuji_distributor_daily_limit_invalid" };
  }
  const timeoutMs = boundedInteger(
    env.FUJI_DISTRIBUTOR_TIMEOUT_MS,
    FUJI_DISTRIBUTOR_TIMEOUT_MS,
    1_000,
    10_000,
  );
  if (timeoutMs === null) {
    return { enabled: false, reason: "fuji_distributor_timeout_invalid" };
  }

  return {
    enabled: true,
    endpoint,
    secret,
    dailyLimit,
    timeoutMs,
    amount: FUJI_DISTRIBUTION_AMOUNT,
    chainId: FUJI_CHAIN_ID,
    protocol: FUJI_DISTRIBUTOR_PROTOCOL,
  };
}

export function fujiClaimWindow() {
  return "once_per_authenticated_user" as const;
}
