import { sendAgentMessage } from "../app/agent-chat-store";
import {
  decryptConnectorSecret,
  encryptConnectorSecret,
} from "../app/connectors/notion-oauth";
import {
  getUnblckHubState,
  unblckChannelSchema,
  type UnblckIdentity,
} from "../app/connectors/unblck";
import {
  getUnblckConnection,
  hasUnblckConnection,
} from "../app/connectors/unblck-connection";
import { listWorkflowEvents, loadWorkflow } from "../app/orchestration/store";
import { getDb } from "../db";
import { agentUsers } from "../db/schema";

type Mode = "doctor" | "run";
type CheckResult = {
  name: string;
  layer: "local" | "database" | "provider" | "chat";
  ok: boolean;
  durationMs: number;
  detail: string;
};

const mode = (process.argv[2] ?? "doctor") as Mode;
if (!(["doctor", "run"] as string[]).includes(mode)) {
  throw new Error(
    "usage: unblck-acceptance.ts <doctor|run> [--code C] [--channel telegram|whatsapp] " +
      "[--channel-user-id ID] [--date YYYY-MM-DD] [--keep-booking] [--user-id ID] [--json]",
  );
}

const checks: CheckResult[] = [];
const jsonOutput = process.argv.includes("--json");

function arg(name: string) {
  const index = process.argv.indexOf("--" + name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function check(
  name: string,
  layer: CheckResult["layer"],
  operation: () => Promise<string> | string,
) {
  const started = performance.now();
  try {
    const detail = await operation();
    checks.push({ name, layer, ok: true, durationMs: Math.round(performance.now() - started), detail });
  } catch (error) {
    checks.push({
      name,
      layer,
      ok: false,
      durationMs: Math.round(performance.now() - started),
      detail: error instanceof Error ? error.message : "unknown_error",
    });
  }
}

function unblckBaseUrl() {
  return (
    process.env.UNBLCK_API_BASE_URL?.trim() ||
    "https://www.unblck.cl/api/agent/v1"
  ).replace(/\/$/, "");
}

function santiagoToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());
}

function addDays(iso: string, days: number) {
  const date = new Date(iso + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function weekdayOf(iso: string) {
  return new Date(iso + "T12:00:00Z").getUTCDay();
}

async function sharedDoctorChecks() {
  await check("Partner API enabled", "local", () => {
    invariant(process.env.UNBLCK_API_ENABLED?.trim() === "true", "unblck_api_disabled");
    return "UNBLCK_API_ENABLED=true";
  });

  await check("Partner API key configured", "local", () => {
    const key = process.env.UNBLCK_AGENT_API_KEY?.trim() ?? "";
    invariant(key.length > 0, "unblck_api_key_missing");
    return `server-only key set (${key.length} chars)`;
  });

  await check("Channel identity encryption key", "local", () => {
    const probe = "unblck-acceptance-probe";
    invariant(decryptConnectorSecret(encryptConnectorSecret(probe)) === probe, "connector_encryption_roundtrip_failed");
    return "AES-256-GCM roundtrip ok";
  });

  await check("Database reachable", "database", async () => {
    await getDb().select({ id: agentUsers.id }).from(agentUsers).limit(1);
    return "agent_users query ok";
  });

  await check("UNBLCK Agent API reachable", "provider", async () => {
    const response = await fetch(unblckBaseUrl() + "/hub-checkins", {
      signal: AbortSignal.timeout(8_000),
    });
    return `HTTP ${response.status} from ${unblckBaseUrl()}`;
  });
}

async function run() {
  await sharedDoctorChecks();
  const failedPrerequisite = () => checks.some((result) => !result.ok);

  const userId = arg("user-id")?.trim() || "unblck-acceptance";
  const channel = unblckChannelSchema.parse(arg("channel")?.trim().toLowerCase() ?? "");
  const channelUserId = arg("channel-user-id")?.trim() ?? "";
  const code = arg("code")?.trim() ?? "";
  const keepBooking = process.argv.includes("--keep-booking");
  invariant(channelUserId.length >= 3, "channel_user_id_missing");
  invariant(code.length >= 6, "connect_code_missing");

  type AssistantMessage = Awaited<ReturnType<typeof sendAgentMessage>>["assistantMessage"];
  const say = async (content: string) => (await sendAgentMessage(userId, content)).assistantMessage;
  const confirmationOf = (message: AssistantMessage) => {
    const command = message.actions?.find((action) => action.message?.startsWith("UNBLCK_CONFIRM "))?.message;
    invariant(command, "confirmation_action_missing");
    return command;
  };

  let identity: UnblckIdentity = { channel, channelUserId };
  let bookingDate = arg("date")?.trim() ?? "";
  let preparedWorkflowId = "";
  let preparedDigest = "";
  let bookingId = "";

  await check("Acceptance user ready", "database", async () => {
    invariant(!failedPrerequisite(), "prerequisite_failed");
    const now = new Date();
    await getDb()
      .insert(agentUsers)
      .values({ id: userId, status: "active", lastSeenAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: agentUsers.id,
        set: { status: "active", lastSeenAt: now, updatedAt: now },
      });
    return `user ${userId}`;
  });

  await check("Connect code linked", "chat", async () => {
    invariant(!failedPrerequisite(), "prerequisite_failed");
    const reply = await say(`Conecta UNBLCK código ${code} ${channel} ${channelUserId}`);
    invariant(reply.connection?.stage === "Connected", `link_not_completed: ${reply.content.slice(0, 120)}`);
    invariant(await hasUnblckConnection(userId), "connection_not_persisted");
    const connection = await getUnblckConnection(userId);
    identity = connection.identity;
    return `${identity.channel} identity linked and decrypted (ends ${identity.channelUserId.slice(-4)})`;
  });

  await check("Live hub state read", "chat", async () => {
    invariant(!failedPrerequisite(), "prerequisite_failed");
    const reply = await say("Muéstrame mis créditos, días disponibles y reservas en UNBLCK");
    invariant(reply.workflow?.status === "completed", `state_read_failed: ${reply.content.slice(0, 120)}`);
    const state = await getUnblckHubState(identity);
    return `tier ${state.tier}, credits ${state.credits.remaining ?? "∞"}/${state.credits.total ?? "∞"}, bookings ${state.bookings.length}`;
  });

  await check("Booking date selected", "local", async () => {
    invariant(!failedPrerequisite(), "prerequisite_failed");
    const state = await getUnblckHubState(identity);
    if (bookingDate) {
      invariant(/^\d{4}-\d{2}-\d{2}$/.test(bookingDate), "date_must_be_yyyy_mm_dd");
      invariant(bookingDate > santiagoToday(), "date_must_be_future");
      invariant(!state.bookings.includes(bookingDate), "date_already_booked");
    } else {
      for (let offset = 1; offset <= 21 && !bookingDate; offset += 1) {
        const candidate = addDays(santiagoToday(), offset);
        if (
          state.open_days.includes(weekdayOf(candidate)) &&
          !state.bookings.includes(candidate) &&
          !state.passes.some((pass) => pass.date === candidate)
        ) {
          bookingDate = candidate;
        }
      }
      invariant(bookingDate, "no_open_day_available_in_next_21_days");
    }
    return `${bookingDate} (America/Santiago)`;
  });

  await check("Booking prepared and paused for approval", "chat", async () => {
    invariant(!failedPrerequisite(), "prerequisite_failed");
    const reply = await say(`Reserva UNBLCK para ${bookingDate}`);
    invariant(reply.workflow?.status === "awaiting_approval", `booking_not_paused: ${reply.content.slice(0, 120)}`);
    preparedWorkflowId = reply.workflow.id;
    const command = confirmationOf(reply);
    preparedDigest = command.split(" ").at(-1) ?? "";
    invariant(preparedDigest.length === 64, "action_digest_missing");
    return `workflow ${preparedWorkflowId.slice(0, 20)}... awaiting approval`;
  });

  await check("No provider mutation before approval", "provider", async () => {
    invariant(!failedPrerequisite(), "prerequisite_failed");
    const state = await getUnblckHubState(identity);
    invariant(!state.bookings.includes(bookingDate), "provider_mutated_before_approval");
    return `${bookingDate} still absent from provider bookings`;
  });

  await check("Booking confirmed with provider evidence", "chat", async () => {
    invariant(!failedPrerequisite(), "prerequisite_failed");
    const reply = await say(`UNBLCK_CONFIRM ${preparedWorkflowId} ${preparedDigest}`);
    invariant(reply.workflow?.status === "completed", `confirm_failed: ${reply.content.slice(0, 120)}`);
    invariant(reply.workflow.id === preparedWorkflowId, "confirm_workflow_changed");
    const stored = await loadWorkflow(userId, preparedWorkflowId);
    invariant(stored?.execution?.kind === "booking", "execution_not_booking");
    invariant(stored.execution.ok === true, "provider_booking_not_ok");
    bookingId = String(stored.execution.booking_id ?? "");
    invariant(bookingId.length > 0, "provider_booking_id_missing");
    invariant(stored.evidence[0]?.verified === true, "provider_evidence_not_verified");
    return `provider booking_id ${bookingId}`;
  });

  await check("Booking visible at provider", "provider", async () => {
    invariant(!failedPrerequisite(), "prerequisite_failed");
    const state = await getUnblckHubState(identity);
    invariant(state.bookings.includes(bookingDate), "booking_not_visible_at_provider");
    return `${bookingDate} present in provider bookings`;
  });

  await check("Repeated confirmation stays idempotent", "chat", async () => {
    invariant(!failedPrerequisite(), "prerequisite_failed");
    const before = await loadWorkflow(userId, preparedWorkflowId);
    const eventsBefore = await listWorkflowEvents(userId, preparedWorkflowId);
    const stateBefore = await getUnblckHubState(identity);
    const reply = await say(`UNBLCK_CONFIRM ${preparedWorkflowId} ${preparedDigest}`);
    invariant(reply.workflow?.id === preparedWorkflowId, "replay_workflow_changed");
    invariant(reply.workflow.status === "completed", "replay_not_completed");
    const after = await loadWorkflow(userId, preparedWorkflowId);
    invariant(after?.version === before?.version, "replay_mutated_workflow_version");
    const eventsAfter = await listWorkflowEvents(userId, preparedWorkflowId);
    invariant(eventsAfter.length === eventsBefore.length, "replay_added_workflow_events");
    const stateAfter = await getUnblckHubState(identity);
    invariant(
      stateAfter.bookings.filter((date) => date === bookingDate).length ===
        stateBefore.bookings.filter((date) => date === bookingDate).length,
      "replay_duplicated_provider_booking",
    );
    return `same workflow v${after?.version}, no second provider execution`;
  });

  if (keepBooking) {
    checks.push({
      name: "Cancellation flow",
      layer: "chat",
      ok: true,
      durationMs: 0,
      detail: `skipped via --keep-booking; ${bookingDate} remains booked at the provider`,
    });
    return;
  }

  let cancelWorkflowId = "";
  let cancelDigest = "";

  await check("Cancellation prepared and paused", "chat", async () => {
    invariant(!failedPrerequisite(), "prerequisite_failed");
    const reply = await say(`Cancela UNBLCK ${bookingDate}`);
    invariant(reply.workflow?.status === "awaiting_approval", `cancel_not_paused: ${reply.content.slice(0, 120)}`);
    cancelWorkflowId = reply.workflow.id;
    invariant(cancelWorkflowId !== preparedWorkflowId, "cancel_reused_booking_workflow");
    const command = confirmationOf(reply);
    cancelDigest = command.split(" ").at(-1) ?? "";
    const state = await getUnblckHubState(identity);
    invariant(state.bookings.includes(bookingDate), "provider_mutated_before_cancel_approval");
    return `workflow ${cancelWorkflowId.slice(0, 20)}... awaiting approval`;
  });

  await check("Cancellation confirmed", "chat", async () => {
    invariant(!failedPrerequisite(), "prerequisite_failed");
    const reply = await say(`UNBLCK_CONFIRM ${cancelWorkflowId} ${cancelDigest}`);
    invariant(reply.workflow?.status === "completed", `cancel_confirm_failed: ${reply.content.slice(0, 120)}`);
    const stored = await loadWorkflow(userId, cancelWorkflowId);
    invariant(stored?.execution?.kind === "cancellation", "execution_not_cancellation");
    invariant(stored.execution.ok === true, "provider_cancellation_not_ok");
    invariant(stored.evidence[0]?.verified === true, "provider_evidence_not_verified");
    return `cancellation executed for ${bookingDate}`;
  });

  await check("Cancellation visible at provider", "provider", async () => {
    invariant(!failedPrerequisite(), "prerequisite_failed");
    const state = await getUnblckHubState(identity);
    invariant(!state.bookings.includes(bookingDate), "cancellation_not_visible_at_provider");
    return `${bookingDate} absent from provider bookings`;
  });
}

if (mode === "doctor") {
  await sharedDoctorChecks();
} else {
  await run();
}

const failed = checks.filter((result) => !result.ok);
const report = {
  mode,
  baseUrl: unblckBaseUrl(),
  generatedAt: new Date().toISOString(),
  passed: checks.length - failed.length,
  failed: failed.length,
  checks,
};

if (jsonOutput) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`\nUNBLCK agent acceptance - ${mode}\n`);
  for (const result of checks) {
    console.log(`${result.ok ? "PASS" : "FAIL"}  ${result.name} (${result.durationMs}ms)`);
    console.log(`      ${result.detail}`);
  }
  console.log(`\n${report.passed} passed - ${report.failed} failed\n`);
  if (mode === "doctor") {
    console.log(
      "Next: npm run acceptance:unblck -- run --code <CONNECT_CODE> --channel <telegram|whatsapp> " +
        "--channel-user-id <id> [--date YYYY-MM-DD] [--keep-booking]\n",
    );
  }
}

if (failed.length > 0) process.exitCode = 1;
