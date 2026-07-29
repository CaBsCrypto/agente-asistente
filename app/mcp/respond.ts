// Shared MCP tool responses.
//
// `fail()` used to forward `error.message` straight to the caller. Drizzle
// embeds the whole failing statement and every bound parameter in that message,
// so a database error handed an anonymous caller the SQL text. Only codes on
// the whitelist below cross the boundary; anything else becomes
// `internal_error` and the detail is logged server-side.

const PUBLIC_ERRORS = new Set([
  "offer_not_found",
  "intent_not_found",
  "intent_conflict",
  "invalid_authorization",
  "authorization_expired",
  "authorization_required",
  "policy_approval_required",
  "explicit_confirmation_required",
  "intent_already_final",
  "actor_required",
  "unknown_action",
  "actor_intent_limit_reached",
  "rate_limited",
  "sandbox_disabled",
  "unauthorized",
  "forbidden",
]);

export const ok = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
});

export function publicErrorCode(error: unknown) {
  const raw = error instanceof Error ? error.message : "unknown_error";
  if (PUBLIC_ERRORS.has(raw)) return raw;
  console.error("[mcp]", raw);
  return "internal_error";
}

export const fail = (error: unknown) => ({
  isError: true,
  content: [
    {
      type: "text" as const,
      text: JSON.stringify({ error: publicErrorCode(error) }),
    },
  ],
});

export { PUBLIC_ERRORS };
