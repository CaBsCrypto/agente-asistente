import { z } from "zod";

export const AVAX_SKILLS_BASE_URL = "https://www.avaxskills.com" as const;
export const AVAX_SKILLS_TIMEOUT_MS = 8_000;
export const AVAX_SKILLS_MAX_RESPONSE_BYTES = 128 * 1024;
export const AVAX_SKILLS_MAX_RESULTS = 8;

const remoteSkillSchema = z.object({
  name: z.string().trim().min(1).max(120),
  version: z.string().trim().max(40).optional(),
  tier: z.union([z.string().trim().max(40), z.number().int().nonnegative()]).optional(),
  description: z.string().trim().max(2_000).optional().default(""),
  trigger: z.string().trim().max(1_000).optional().default(""),
  last_updated: z.string().trim().max(80).optional(),
  avalanche_networks: z.array(z.string().trim().max(80)).max(20).optional().default([]),
  related_skills: z.array(z.string().trim().max(120)).max(30).optional().default([]),
  url: z.string().url().optional(),
  skillUrl: z.string().url().optional(),
}).passthrough();

const searchResponseSchema = z.union([
  z.array(remoteSkillSchema),
  z.object({ results: z.array(remoteSkillSchema) }).passthrough(),
]);

export type AvaxSkillRisk = "legacy_x402" | "private_key_example" | "future_research";

function riskFlags(name: string): AvaxSkillRisk[] {
  const normalized = name.toLowerCase();
  if (normalized === "x402-integration") return ["legacy_x402"];
  if (normalized === "ai-agent-patterns") return ["private_key_example"];
  if (normalized === "account-abstraction") return ["future_research"];
  return [];
}

async function readBoundedJson(response: Response) {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) throw new Error("avaxskills_content_type_invalid");
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > AVAX_SKILLS_MAX_RESPONSE_BYTES) {
    throw new Error("avaxskills_response_too_large");
  }
  if (!response.body) throw new Error("avaxskills_response_empty");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > AVAX_SKILLS_MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("avaxskills_response_too_large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new Error("avaxskills_json_invalid");
  }
}

export async function searchAvaxSkills(
  rawQuery: string,
  fetcher: typeof fetch = fetch,
  signal: AbortSignal = AbortSignal.timeout(AVAX_SKILLS_TIMEOUT_MS),
) {
  const query = z.string().trim().min(2).max(120).parse(rawQuery);
  const url = `${AVAX_SKILLS_BASE_URL}/api/search/?q=${encodeURIComponent(query)}`;
  let response: Response;
  try {
    response = await fetcher(url, {
      method: "GET",
      headers: { accept: "application/json" },
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      signal,
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
      throw new Error("avaxskills_timeout");
    }
    throw new Error("avaxskills_unreachable");
  }
  if (!response.ok) throw new Error(`avaxskills_http_${response.status}`);
  const parsed = searchResponseSchema.safeParse(await readBoundedJson(response));
  if (!parsed.success) throw new Error("avaxskills_schema_invalid");
  const skills = Array.isArray(parsed.data) ? parsed.data : parsed.data.results;
  return {
    source: "AVAX Skills" as const,
    sourceUrl: AVAX_SKILLS_BASE_URL,
    trust: "advisory_unverified" as const,
    requiresOfficialVerification: true as const,
    executionAllowed: false as const,
    query,
    fetchedAt: new Date().toISOString(),
    results: skills.slice(0, AVAX_SKILLS_MAX_RESULTS).map((skill) => ({
      name: skill.name,
      description: skill.description,
      trigger: skill.trigger,
      version: skill.version ?? null,
      tier: skill.tier !== undefined ? String(skill.tier) : null,
      lastUpdated: skill.last_updated ?? null,
      avalancheNetworks: skill.avalanche_networks,
      relatedSkills: skill.related_skills,
      referenceUrl: skill.skillUrl ?? skill.url ?? `${AVAX_SKILLS_BASE_URL}/${encodeURIComponent(skill.name)}/SKILL.md`,
      riskFlags: riskFlags(skill.name),
    })),
  };
}