import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { inArray } from "drizzle-orm";
import { getDb } from "../db";
import { agentGatewayPlans, mcpAccessTokens } from "../db/schema";
import { issuePersonalMcpToken, revokePersonalMcpToken } from "../app/services/personal-mcp-token-store";

const MARKER = "__CARMELITA_HTTP_STATUS__:";
const MAX_OUTPUT = 1024 * 1024;

export function redactAcceptanceSecrets(value: string, secrets: Iterable<string>) {
  let result = value.replace(/carmelita_user_[A-Za-z0-9_-]+/g, "[REDACTED_PAT]");
  for (const secret of secrets) if (secret) result = result.split(secret).join("[REDACTED]");
  return result;
}
export function parseVercelCurlOutput(output: string) {
  const match = output.match(new RegExp(`\\r?\\n${MARKER}(\\d{3})\\s*$`));
  if (!match || match.index === undefined) throw new Error("preview_acceptance_status_missing");
  const raw = output.slice(0, match.index).trim();
  return { status: Number(match[1]), body: raw ? JSON.parse(raw) as unknown : null };
}
export function buildVercelCurlArgs(input: { deployment: string; path: string; token: string; method?: string; body?: unknown }) {
  const tail = ["--silent", "--show-error", "--request", input.method ?? "GET", "--header", `Authorization: Bearer ${input.token}`, "--header", "Accept: application/json", "--write-out", `\\n${MARKER}%{http_code}`];
  if (input.body !== undefined) tail.push("--header", "Content-Type: application/json", "--data", JSON.stringify(input.body));
  return ["curl", input.path, "--deployment", input.deployment, "--yes", "--no-color", "--", ...tail];
}
function vercelInvocation() {
  if (process.platform !== "win32") return { command: "vercel", prefix: [] as string[] };
  const cli = join(process.env.APPDATA ?? "", "npm", "node_modules", "vercel", "dist", "index.js");
  return existsSync(cli) ? { command: process.execPath, prefix: [cli] } : { command: "vercel.cmd", prefix: [] as string[] };
}
async function vercelCurl(input: Parameters<typeof buildVercelCurlArgs>[0], secrets: Set<string>) {
  const invocation = vercelInvocation();
  return new Promise<ReturnType<typeof parseVercelCurlOutput>>((resolve, reject) => {
    const child = spawn(invocation.command, [...invocation.prefix, ...buildVercelCurlArgs(input)], { cwd: process.cwd(), shell: false, windowsHide: true, env: { ...process.env, NO_UPDATE_NOTIFIER: "1" }, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = ""; let stderr = ""; let exceeded = false;
    const append = (current: string, chunk: Buffer) => { const next = current + chunk.toString("utf8"); if (Buffer.byteLength(next) > MAX_OUTPUT) { exceeded = true; child.kill(); } return next.slice(0, MAX_OUTPUT); };
    child.stdout.on("data", (chunk: Buffer) => { stdout = append(stdout, chunk); });
    child.stderr.on("data", (chunk: Buffer) => { stderr = append(stderr, chunk); });
    child.on("error", (error) => reject(new Error(redactAcceptanceSecrets(error.message, secrets))));
    child.on("close", (code) => { try { if (exceeded) throw new Error("preview_acceptance_output_limit"); if (code !== 0) throw new Error(`preview_acceptance_vercel_curl_failed:${redactAcceptanceSecrets(stderr, secrets)}`); resolve(parseVercelCurlOutput(stdout)); } catch (error) { reject(error); } });
  });
}
function loadMigrationEnv() {
  if (!existsSync(".env.migrate")) return;
  for (const line of readFileSync(".env.migrate", "utf8").split(/\r?\n/)) { const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (!match) continue; const value = match[2].replace(/^["']|["']$/g, "").trim(); if (value && !process.env[match[1]]) process.env[match[1]] = value; }
}
export async function cleanupPreviewAcceptanceFixtures(input: { actorIds: string[]; idempotencyKeys: string[]; tokenIds: string[] }) {
  const db = getDb();
  const rows = input.actorIds.length ? await db.select({ id: agentGatewayPlans.id, idempotencyKey: agentGatewayPlans.idempotencyKey }).from(agentGatewayPlans).where(inArray(agentGatewayPlans.actorId, input.actorIds)) : [];
  const keys = new Set(input.idempotencyKeys);
  const exactPlanIds = rows.filter((row) => keys.has(row.idempotencyKey)).map((row) => row.id);
  if (exactPlanIds.length) await db.delete(agentGatewayPlans).where(inArray(agentGatewayPlans.id, exactPlanIds));
  if (input.tokenIds.length) await db.delete(mcpAccessTokens).where(inArray(mcpAccessTokens.id, input.tokenIds));
}
function expectStatus(actual: number, expected: number, label: string) { assert.equal(actual, expected, `${label}: expected HTTP ${expected}, received ${actual}`); }
export async function runPreviewAcceptance(deployment: string) {
  loadMigrationEnv();
  if (!deployment) throw new Error("preview_acceptance_deployment_required");
  const runId = randomUUID(); const actorA = `preview-fixture-a-${runId}`; const actorB = `preview-fixture-b-${runId}`; const key = `preview-acceptance-${runId}`;
  const actorIds = [actorA, actorB]; const tokenIds: string[] = []; const secrets = new Set<string>(); let failure: unknown;
  try {
    const read = await issuePersonalMcpToken({ userId: actorA, name: `acceptance-read-${runId}`, scopes: ["agent:read"] }); secrets.add(read.token); tokenIds.push(read.credential.id);
    const plan = await issuePersonalMcpToken({ userId: actorA, name: `acceptance-plan-${runId}`, scopes: ["agent:read", "agent:plan"] }); secrets.add(plan.token); tokenIds.push(plan.credential.id);
    const other = await issuePersonalMcpToken({ userId: actorB, name: `acceptance-b-${runId}`, scopes: ["agent:read"] }); secrets.add(other.token); tokenIds.push(other.credential.id);
    const input = { capabilityId: "stellar.wallet.status", idempotencyKey: key, parameters: { detail: "summary" }, context: { requirementsSatisfied: ["stellar_wallet"] } };
    expectStatus((await vercelCurl({ deployment, path: "/api/v1/actions/plan", token: read.token, method: "POST", body: input }, secrets)).status, 403, "read-only planning");
    const first = await vercelCurl({ deployment, path: "/api/v1/actions/plan", token: plan.token, method: "POST", body: input }, secrets); expectStatus(first.status, 201, "plan creation");
    const planId = (first.body as { plan?: { id?: string } })?.plan?.id; assert.ok(planId, "plan creation returned no ID");
    const replay = await vercelCurl({ deployment, path: "/api/v1/actions/plan", token: plan.token, method: "POST", body: input }, secrets); expectStatus(replay.status, 200, "idempotent replay"); assert.equal((replay.body as { plan?: { id?: string } })?.plan?.id, planId);
    expectStatus((await vercelCurl({ deployment, path: "/api/v1/actions/plan", token: plan.token, method: "POST", body: { ...input, parameters: { detail: "full" } } }, secrets)).status, 409, "idempotency conflict");
    expectStatus((await vercelCurl({ deployment, path: `/api/v1/actions/${planId}`, token: plan.token }, secrets)).status, 200, "owner plan read");
    expectStatus((await vercelCurl({ deployment, path: `/api/v1/actions/${planId}`, token: other.token }, secrets)).status, 404, "cross-user plan read");
    const receipt = await vercelCurl({ deployment, path: `/api/v1/receipts/${planId}`, token: plan.token }, secrets); expectStatus(receipt.status, 202, "missing receipt"); assert.equal((receipt.body as { available?: boolean })?.available, false);
    await revokePersonalMcpToken(actorA, plan.credential.id);
    expectStatus((await vercelCurl({ deployment, path: `/api/v1/actions/${planId}`, token: plan.token }, secrets)).status, 401, "revoked PAT");
    return { ok: true, checks: 9 };
  } catch (error) { failure = error; throw new Error(redactAcceptanceSecrets(error instanceof Error ? error.message : String(error), secrets)); }
  finally {
    for (const [actor, tokenId] of [[actorA, tokenIds[0]], [actorA, tokenIds[1]], [actorB, tokenIds[2]]] as const) if (tokenId) try { await revokePersonalMcpToken(actor, tokenId); } catch { /* exact delete below */ }
    try { await cleanupPreviewAcceptanceFixtures({ actorIds, idempotencyKeys: [key], tokenIds }); } catch (error) { const cleanup = `preview_acceptance_cleanup_failed:${error instanceof Error ? error.message : String(error)}`; const original = failure instanceof Error ? failure.message : failure ? String(failure) : ""; throw new Error(redactAcceptanceSecrets(original ? `${original};${cleanup}` : cleanup, secrets)); }
    secrets.clear();
  }
}
if (!process.env.NODE_TEST_CONTEXT) { const result = await runPreviewAcceptance(deploymentArg() ?? ""); console.log(`Gateway Preview acceptance: PASS (${result.checks} checks)`); }