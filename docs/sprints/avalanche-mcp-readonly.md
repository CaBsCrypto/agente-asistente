# Avalanche hosted MCP: read-only integration

Status: implemented locally on `feat/multichain-wallet-foundation`; not committed, deployed, or exposed in production.

## Official evidence audited

Primary source: [Avalanche MCP Server](https://build.avax.network/docs/tooling/ai-llm/mcp-server).

The official documentation states:

- Exact hosted endpoint: `https://build.avax.network/api/mcp`.
- `docs_search` is the canonical documentation search tool.
- `tools/list` is supported through JSON-RPC 2.0.
- The hosted server is read-only and does not run local shell/CLI commands, modify node state, or access private files.

The endpoint's public metadata reported MCP version `2.1.0`, protocol `2024-11-05`, and 44 tools during the 2026-07-28 audit. Carmelita intentionally exposes only `docs_search`; aliases, blockchain lookup, GitHub, CLI, RPC, P-Chain and Info tools are denied locally even though the remote server describes them.

Official JSON-RPC examples: [MCP Server - JSON-RPC Examples](https://build.avax.network/docs/tooling/ai-llm/mcp-server#json-rpc-examples).

## Local security contract

Connector: `app/connectors/avalanche-mcp.ts`.

- Endpoint is a compile-time constant; no user-provided URL or environment override.
- Closed allowlist: exactly `docs_search`.
- Every search first performs `tools/list` and fails if canonical `docs_search` is absent.
- JSON-RPC version and response ID must match exactly.
- Success/error envelopes and tool results are schema validated; unknown envelope fields fail closed.
- Query length is `2..200`, no control characters, result limit is locally restricted to `1..5`.
- One search operation has a strict 15-second total budget covering `tools/list` plus exactly one `docs_search` call.
- The connector never retries automatically. A caller/UI may offer an explicit new invocation after a timeout.
- Response is streamed and rejected above 256 KiB, including preflight `Content-Length` checks.
- Response must be UTF-8 JSON with `application/json` content type.
- Redirects are rejected; credentials/cookies are omitted; no authorization header or API key is sent.
- Only citations under `https://build.avax.network/` are normalized.
- No write, wallet, signing, payment, RPC execution or private-key surface exists.

Authenticated application route:

```text
POST /api/agent/avalanche/knowledge
Authorization: Bearer <Privy access token>
```

List the one locally available tool:

```json
{ "action": "list" }
```

Search official Avalanche documentation:

```json
{
  "action": "search",
  "query": "Avalanche Fuji C-Chain chain ID",
  "source": "docs",
  "limit": 2
}
```

The route checks same-origin browser requests and Privy authentication. It returns `Cache-Control: no-store`. Invalid user input is `400`; authentication is `401`; unavailable tool is `503`; timeout is `504`; malformed/upstream failures are `502`.

## Test evidence

Pure suite command (runner borrowed only because this worktree's dependency install remains incomplete):

```powershell
..\agente-asistente\node_modules\.bin\tsx.cmd tests\avalanche-mcp.test.ts
```

Current-policy pure validation: 8 passed, 1 live smoke intentionally skipped.

Live read-only smoke:

```powershell
$env:AVALANCHE_MCP_LIVE='1'
..\agente-asistente\node_modules\.bin\tsx.cmd tests\avalanche-mcp.test.ts
```

Observed behavior on 2026-07-28:

1. Two consecutive live searches under the former 8-second boundary failed closed after approximately 8.6 seconds each.
2. A later explicit invocation of the same read-only flow completed successfully in approximately 1 second with 7/7 tests passing.
3. A separate direct probe returned two source-grounded `docs_search` matches in approximately 1.7 seconds.
4. Final validation with the current 15-second policy produced 8 pure/read-only passes and 1 live failure: `docs_search` failed closed as `avalanche_mcp_timeout` after approximately 15.39 seconds.

This evidence shows the hosted `docs_search` latency is currently not reliable enough to promise a result, even at the new boundary. The policy remains 15 seconds total for `tools/list` plus one `docs_search`; it will not be increased or retried automatically. On timeout, Carmelita returns no search result and the caller/UI may present a clearly explicit retry action. It must never claim an answer, silently retry, switch tools or broaden the allowlist.

## Covered failure cases

- Unknown/mutating tool rejected before network access.
- Remote catalog filtered to one allowed tool.
- Tools are listed before search.
- No credentials or redirects.
- JSON-RPC ID mismatch.
- Unknown JSON-RPC envelope fields.
- Malformed tool result schema.
- Oversized response.
- JSON-RPC server error.
- Authenticated route has no mutation/signing surface.
- Live timeout under both the former 8-second boundary and the current 15-second total budget, plus separately observed successful invocations.
- Timeout makes exactly one `docs_search` call; HTTP/RPC/schema/policy errors are never retried.

## Remaining acceptance

- Repair this worktree's local dependency installation.
- Start localhost and authenticate through Privy.
- Call `list` and `search` through the application route with a real access token.
- Confirm the UI displays normalized text/citations and a clear timeout/retry state.

No secret configuration is required for the official Avalanche MCP.
