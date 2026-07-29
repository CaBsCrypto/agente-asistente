import { createMcpHandler } from "mcp-handler";
import { createHash } from "node:crypto";
import { z } from "zod";
import { backend, publicIntent } from "@/app/commerce-backend";
import { fail, ok } from "@/app/mcp/respond";

export const runtime = "nodejs";
export const maxDuration = 60;

// The sandbox is unauthenticated by design, so it needs a switch that takes it
// offline without a deploy. Checked before any tool body runs.
const sandboxEnabled = () => process.env.MCP_SANDBOX_ENABLED !== "false";

// The caller asserts its own actorId, so it is never persisted verbatim: a
// caller could otherwise write a real `did:privy:...` string into
// audit_events.actor_id and make sandbox traffic look like a real user. The
// caller's own string is echoed back so their correlation still works.
const sandboxActor = (raw: string) =>
  "sandbox:" + createHash("sha256").update(raw).digest("hex").slice(0, 24);

const ACTOR = z.string().min(1).max(128);
const INTENT_ID = z.string().min(1).max(128);

// Every tool body goes through here: the kill switch is checked once, and no
// raw error can escape to the caller.
async function guard<T>(run: () => Promise<T>) {
  try {
    if (!sandboxEnabled()) throw new Error("sandbox_disabled");
    return ok(await run());
  } catch (error) {
    return fail(error);
  }
}

let handler: ReturnType<typeof createMcpHandler> | null = null;
const getHandler = () =>
  handler ??
  (handler = createMcpHandler(
    (server) => {
      server.registerTool(
        "search_offers",
        {
          title: "Search agent-ready offers",
          description: "Search public offers. Never spends funds.",
          inputSchema: {
            query: z.string().max(120).default(""),
            kind: z
              .enum(["finance", "reservation", "task", "travel", "product", "service"])
              .optional(),
          },
          annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
          },
        },
        async ({ query, kind }) =>
          guard(async () => ({
            offers: await backend.searchOffers(query, kind),
            persistence: backend.mode(),
          })),
      );

      server.registerTool(
        "get_offer",
        {
          title: "Get offer",
          description: "Get offer details. Read-only.",
          inputSchema: { offerId: z.string().min(1).max(128) },
          annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
          },
        },
        async ({ offerId }) => guard(() => backend.getOffer(offerId)),
      );

      server.registerTool(
        "create_intent",
        {
          title: "Prepare intent",
          description:
            "Prepare only. Same idempotencyKey from the same actorId returns the original intent.",
          inputSchema: {
            offerId: z.string().min(1).max(128),
            actorId: ACTOR,
            idempotencyKey: z.string().min(8).max(256),
            amount: z.number().nonnegative().max(1_000_000).optional(),
          },
          annotations: {
            readOnlyHint: false,
            destructiveHint: true,
            idempotentHint: true,
            openWorldHint: false,
          },
        },
        async (input) =>
          guard(async () => {
            const result = await backend.createIntent({
              ...input,
              actorId: sandboxActor(input.actorId),
            });
            return {
              ...result,
              intent: publicIntent(result.intent),
              actorId: input.actorId,
              persistence: backend.mode(),
            };
          }),
      );

      server.registerTool(
        "evaluate_policy",
        {
          title: "Evaluate policy",
          description:
            "Apply expiry, network and 100 USDC demo limit. Does not authorize. Refuses once the intent is authorized, executed or rejected.",
          inputSchema: { intentId: INTENT_ID, actorId: ACTOR },
          annotations: {
            readOnlyHint: false,
            destructiveHint: true,
            idempotentHint: true,
            openWorldHint: false,
          },
        },
        async ({ intentId, actorId }) =>
          guard(async () =>
            publicIntent(await backend.evaluatePolicy(intentId, sandboxActor(actorId))),
          ),
      );

      server.registerTool(
        "demo_authorize_intent",
        {
          title: "Confirm demo intent",
          description: "Demo-only explicit confirmation. No signature or funds movement.",
          inputSchema: {
            intentId: INTENT_ID,
            actorId: ACTOR,
            explicitUserConfirmation: z.literal(true),
          },
          annotations: {
            readOnlyHint: false,
            destructiveHint: true,
            idempotentHint: false,
            openWorldHint: false,
          },
        },
        async ({ intentId, actorId, explicitUserConfirmation }) =>
          guard(async () => {
            const result = await backend.authorize(
              intentId,
              sandboxActor(actorId),
              explicitUserConfirmation,
            );
            const intent = "intent" in result ? result.intent : result;
            const token =
              "token" in result ? result.token : result.authorization?.token;
            return {
              intent: publicIntent(intent),
              authorizationToken: token,
              warning: "DEMO ONLY — no wallet signature and no funds moved",
            };
          }),
      );

      server.registerTool(
        "execute_authorized_intent",
        {
          title: "Execute authorized demo",
          description:
            "Execute an authorized demo intent. Duplicates return the same receipt.",
          inputSchema: {
            intentId: INTENT_ID,
            actorId: ACTOR,
            authorizationToken: z.string().min(10).max(256),
          },
          annotations: {
            readOnlyHint: false,
            destructiveHint: true,
            idempotentHint: true,
            openWorldHint: false,
          },
        },
        async ({ intentId, actorId, authorizationToken }) =>
          guard(() =>
            backend.execute(intentId, sandboxActor(actorId), authorizationToken),
          ),
      );

      server.registerTool(
        "get_receipt",
        {
          title: "Get receipt",
          description: "Get execution receipt or null.",
          inputSchema: { intentId: INTENT_ID, actorId: ACTOR },
          annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
          },
        },
        async ({ intentId, actorId }) =>
          guard(async () => ({
            receipt: await backend.getReceipt(intentId, sandboxActor(actorId)),
          })),
      );
    },
    { serverInfo: { name: "agente-asistente", version: "0.2.0" } },
    {
      basePath: "/api",
      maxDuration: 60,
      disableSse: true,
      verboseLogs: process.env.NODE_ENV !== "production",
    },
  ));

export const GET = (request: Request) => getHandler()(request);
export const POST = (request: Request) => getHandler()(request);
export const DELETE = (request: Request) => getHandler()(request);
