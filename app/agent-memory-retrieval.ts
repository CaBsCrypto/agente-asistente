export type MemoryDomain =
  | "travel"
  | "finance"
  | "projects"
  | "tasks"
  | "people"
  | "productivity"
  | "general";

export type RetrievableKnowledge = {
  id: string;
  kind: string;
  label: string;
  content: string;
  source: string;
  updatedAt: Date | string;
};

export type RelevantMemoryContext = {
  provider: "neon-topic-router";
  domains: MemoryDomain[];
  items: Array<{
    id: string;
    kind: string;
    label: string;
    source: string;
    score: number;
  }>;
};

const domainTerms: Record<Exclude<MemoryDomain, "general">, string[]> = {
  travel: ["hotel", "travel", "trip", "viaje", "vuelo", "flight", "travala", "alojamiento", "hospedaje", "viagem", "voo"],
  finance: ["xlm", "usdc", "wallet", "billetera", "carteira", "pago", "payment", "deposit", "deposito", "defindex", "yield", "precio", "price", "mercado"],
  projects: ["project", "proyecto", "projeto", "yc", "startup", "producto", "product", "roadmap", "sprint"],
  tasks: ["task", "tarea", "tarefa", "pendiente", "todo", "deadline", "entrega", "deliverable"],
  people: ["persona", "person", "people", "contacto", "contact", "equipo", "team", "cliente", "client"],
  productivity: ["notion", "trello", "calendar", "calendario", "agenda", "drive", "gmail", "email", "documento", "document"],
};

const kindDomains: Record<string, MemoryDomain[]> = {
  travel_preference: ["travel"],
  project_context: ["projects", "tasks"],
  task_context: ["tasks", "projects"],
  person_context: ["people"],
  productivity_preference: ["productivity", "tasks"],
  financial_preference: ["finance"],
  preference: ["general"],
};

const stopWords = new Set([
  "que", "the", "and", "para", "por", "con", "una", "uno", "los", "las",
  "del", "como", "me", "mi", "mis", "my", "com", "uma", "de", "do", "da",
  "what", "show", "find", "busca", "buscar", "quiero", "need", "necesito",
]);

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function tokens(value: string) {
  return new Set(
    normalize(value)
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2 && !stopWords.has(token)),
  );
}

export function classifyMemoryDomains(query: string): MemoryDomain[] {
  const value = normalize(query);
  const domains = (Object.entries(domainTerms) as Array<[
    Exclude<MemoryDomain, "general">,
    string[],
  ]>)
    .filter(([, terms]) => terms.some((term) => value.includes(term)))
    .map(([domain]) => domain);
  return domains.length ? domains : ["general"];
}

export function buildRelevantMemoryContext(
  knowledge: RetrievableKnowledge[],
  query: string,
  limit = 5,
): RelevantMemoryContext {
  const domains = classifyMemoryDomains(query);
  const queryTokens = tokens(query);
  const scored = knowledge
    .map((item) => {
      const itemDomains = kindDomains[item.kind] ?? ["general"];
      const domainMatch = itemDomains.some((domain) => domains.includes(domain));
      const itemTokens = tokens(`${item.label} ${item.content}`);
      const overlap = [...queryTokens].filter((token) => itemTokens.has(token)).length;
      const score = (domainMatch ? 8 : 0) + Math.min(overlap, 4) * 2;
      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return new Date(right.item.updatedAt).getTime() - new Date(left.item.updatedAt).getTime();
    })
    .slice(0, Math.max(1, Math.min(limit, 8)));

  return {
    provider: "neon-topic-router",
    domains,
    items: scored.map(({ item, score }) => ({
      id: item.id,
      kind: item.kind,
      label: item.label,
      source: item.source,
      score,
    })),
  };
}
