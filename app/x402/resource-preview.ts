export type X402ResourceSummary = {
  title: string | null;
  summary: string | null;
  source: string | null;
};

function decodeHtmlEntities(value: string) {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return value.replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z]+);/gi, (entity, code: string) => {
    if (code.startsWith("#")) {
      const numeric = code[1]?.toLowerCase() === "x"
        ? Number.parseInt(code.slice(2), 16)
        : Number.parseInt(code.slice(1), 10);
      return Number.isFinite(numeric) ? String.fromCodePoint(numeric) : entity;
    }
    return named[code.toLowerCase()] ?? entity;
  });
}

function plainText(value: string) {
  return decodeHtmlEntities(
    value
      .replace(/<(script|style|template|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--([\s\S]*?)-->/g, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function concise(value: unknown, maximum = 260) {
  const text = plainText(String(value ?? ""));
  if (!text) return null;
  return text.length > maximum ? `${text.slice(0, maximum - 1).trimEnd()}\u2026` : text;
}

function sourceFromUrl(resourceUrl: string) {
  try {
    return new URL(resourceUrl).host;
  } catch {
    return null;
  }
}

/**
 * Converts an untrusted paid response into a short, text-only presentation.
 * The original response is deliberately never returned to the React view.
 */
export function summarizeX402Resource(
  resourcePreview: string | null,
  resourceUrl: string,
): X402ResourceSummary {
  const source = sourceFromUrl(resourceUrl);
  if (!resourcePreview) return { title: null, summary: null, source };

  const trimmed = resourcePreview.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const record = parsed as Record<string, unknown>;
        const title = concise(record.title ?? record.name, 90);
        const summary = concise(
          record.message ?? record.description ?? record.summary ?? record.result ?? title,
        );
        return { title, summary, source };
      }
      return { title: null, summary: concise(parsed), source };
    } catch {
      // A malformed JSON-looking response is still reduced to safe plain text below.
    }
  }

  const titleMatch = trimmed.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return {
    title: concise(titleMatch?.[1], 90),
    summary: concise(trimmed),
    source,
  };
}
