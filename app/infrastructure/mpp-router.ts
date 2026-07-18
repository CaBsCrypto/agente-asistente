export const MPP_ROUTER_CATALOG_URL =
  "https://apiserver.mpprouter.dev/llms.txt";

export type MppRouterService = {
  name: string;
  url: string;
};

const FALLBACK_SERVICES: MppRouterService[] = [
  { name: "OpenAI", url: "https://www.mpprouter.dev/" },
  { name: "Anthropic", url: "https://www.mpprouter.dev/" },
  { name: "Brave Search", url: "https://www.mpprouter.dev/" },
  { name: "CoinGecko", url: "https://www.mpprouter.dev/" },
  { name: "Google Maps", url: "https://www.mpprouter.dev/" },
  { name: "StableTravel", url: "https://www.mpprouter.dev/" },
];

export function parseMppRouterCatalog(markdown: string, limit = 30) {
  const services: MppRouterService[] = [];
  const seen = new Set<string>();
  const linkPattern = /\[([^\]]{2,80})\]\((https:\/\/[^)\s]+)\)/g;

  for (const match of markdown.matchAll(linkPattern)) {
    const name = match[1].trim();
    const url = match[2];
    const key = `${name.toLowerCase()}|${url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    services.push({ name, url });
    if (services.length >= Math.max(1, Math.min(limit, 50))) break;
  }

  return services;
}

export async function discoverMppRouterServices() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6_000);

  try {
    const response = await fetch(MPP_ROUTER_CATALOG_URL, {
      headers: { accept: "text/plain" },
      next: { revalidate: 3_600 },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`mpp_catalog_${response.status}`);
    const text = (await response.text()).slice(0, 500_000);
    const services = parseMppRouterCatalog(text);
    return {
      source: "live" as const,
      services: services.length ? services : FALLBACK_SERVICES,
    };
  } catch {
    return { source: "fallback" as const, services: FALLBACK_SERVICES };
  } finally {
    clearTimeout(timeout);
  }
}
