export const MPP_ROUTER_SEARCH_URL =
  "https://apiserver.mpprouter.dev/v1/services/search?status=active&limit=20";

export type MppRouterService = {
  id: string;
  name: string;
  price: string;
  path: string;
  paymentStatus: string;
};

const FALLBACK_SERVICES: MppRouterService[] = [
  {
    id: "openai",
    name: "OpenAI",
    price: "check-live-catalog",
    path: "",
    paymentStatus: "unknown",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    price: "check-live-catalog",
    path: "",
    paymentStatus: "unknown",
  },
  {
    id: "brave",
    name: "Brave Search",
    price: "check-live-catalog",
    path: "",
    paymentStatus: "unknown",
  },
  {
    id: "coingecko",
    name: "CoinGecko",
    price: "check-live-catalog",
    path: "",
    paymentStatus: "unknown",
  },
];

export function normalizeMppRouterCatalog(payload: unknown, limit = 20) {
  const services: MppRouterService[] = [];
  if (!payload || typeof payload !== "object") return services;
  const candidates = (payload as { services?: unknown }).services;
  if (!Array.isArray(candidates)) return services;

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    const item = candidate as Record<string, unknown>;
    if (
      typeof item.id !== "string" ||
      typeof item.name !== "string" ||
      typeof item.public_path !== "string"
    ) {
      continue;
    }
    services.push({
      id: item.id.slice(0, 120),
      name: item.name.slice(0, 160),
      price:
        typeof item.price === "string" ? item.price.slice(0, 80) : "unknown",
      path: item.public_path.slice(0, 240),
      paymentStatus:
        typeof item.payment_status === "string"
          ? item.payment_status.slice(0, 40)
          : "unknown",
    });
    if (services.length >= Math.max(1, Math.min(limit, 50))) break;
  }

  return services;
}

export async function discoverMppRouterServices() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6_000);

  try {
    const response = await fetch(MPP_ROUTER_SEARCH_URL, {
      headers: { accept: "application/json" },
      next: { revalidate: 3_600 },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`mpp_catalog_${response.status}`);
    const services = normalizeMppRouterCatalog(await response.json());
    return {
      source: services.length ? ("live" as const) : ("fallback" as const),
      services: services.length ? services : FALLBACK_SERVICES,
    };
  } catch {
    return { source: "fallback" as const, services: FALLBACK_SERVICES };
  } finally {
    clearTimeout(timeout);
  }
}
