/**
 * UNBLCK Agent API — fix verification / full-pass booking check.
 *
 * Run this ON DEMAND once UNBLCK deploys the member_profiles RLS fix
 * (blessedux/unblck_landing PR #17). It talks straight to the live UNBLCK
 * Agent API with the partner key — no local database, no app server.
 *
 *   npm run unblck:fix-check                 # read-only: is the fix live?
 *   npm run unblck:fix-check -- --book       # reserve a full pass, then cancel it
 *   npm run unblck:fix-check -- --book --keep # reserve a full pass and keep it
 *
 * Optional: --channel whatsapp|telegram  --channel-user-id <id>
 * Defaults to the identity we linked live: whatsapp / +56961857682.
 *
 * Exit codes: 0 ok · 2 fix not deployed yet (still 404) · 3 channel not linked · 1 other.
 */
import {
  cancelUnblckHubCheckin,
  createUnblckHubCheckin,
  getUnblckHubState,
  unblckChannelSchema,
  type UnblckIdentity,
} from "../app/connectors/unblck";

function arg(name: string) {
  const index = process.argv.indexOf("--" + name);
  return index === -1 ? undefined : process.argv[index + 1];
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

function errorCode(error: unknown) {
  return error instanceof Error ? error.message.split(":")[0] : "unknown_error";
}

async function main() {
  // Env preflight — mirrors the connector's own config().
  if (process.env.UNBLCK_API_ENABLED?.trim() !== "true") {
    console.error("✗ UNBLCK_API_ENABLED is not 'true'. Set it (and the key) in .env.local before running.");
    process.exit(1);
  }
  if (!process.env.UNBLCK_AGENT_API_KEY?.trim()) {
    console.error(
      "✗ UNBLCK_AGENT_API_KEY is empty locally (it's a Sensitive var in Vercel and can't be pulled).\n" +
        "  Paste the partner key into .env.local to run this check.",
    );
    process.exit(1);
  }

  const channel = unblckChannelSchema.parse((arg("channel") ?? "whatsapp").toLowerCase());
  const channelUserId = (arg("channel-user-id") ?? "+56961857682").trim();
  const identity: UnblckIdentity = { channel, channelUserId };
  const doBook = process.argv.includes("--book");
  const keep = process.argv.includes("--keep");

  console.log(`\nUNBLCK fix check — ${channel} ending ${channelUserId.slice(-4)}\n`);

  // 1) Read hub state. A 404 here means the RLS fix (PR #17) is not deployed yet.
  let state;
  try {
    state = await getUnblckHubState(identity);
  } catch (error) {
    const code = errorCode(error);
    if (code === "unblck_404") {
      console.log("⏳ PENDING — GET /hub-checkins still returns 404 (profile_missing).");
      console.log("   UNBLCK has not deployed PR #17 yet. Re-run once they merge + deploy.");
      process.exit(2);
    }
    if (code === "unblck_403") {
      console.log("✗ Channel not linked (403 link_required). Re-link the WhatsApp identity first.");
      process.exit(3);
    }
    if (code === "unblck_401") {
      console.log("✗ Partner key rejected (401). Check UNBLCK_AGENT_API_KEY.");
      process.exit(1);
    }
    throw error;
  }

  console.log("✅ FIX LIVE — hub state is readable through the Agent API:");
  console.log(`   tier:      ${state.tier}`);
  console.log(`   credits:   ${state.credits.remaining ?? "∞"}/${state.credits.total ?? "∞"} (${state.credits.used} used)`);
  console.log(`   open_days: [${state.open_days.join(", ")}]  (0=Sun … 6=Sat)`);
  console.log(`   bookings:  [${state.bookings.join(", ") || "none"}]`);

  if (!doBook) {
    console.log("\nRead-only check passed. Run with --book to reserve a full pass.\n");
    return;
  }

  // 2) Pick the next open, un-booked weekday (future, America/Santiago).
  let target = "";
  for (let offset = 1; offset <= 21 && !target; offset += 1) {
    const candidate = addDays(santiagoToday(), offset);
    if (
      state.open_days.includes(weekdayOf(candidate)) &&
      !state.bookings.includes(candidate) &&
      !state.passes.some((pass) => pass.date === candidate)
    ) {
      target = candidate;
    }
  }
  if (!target) throw new Error("no_open_day_available_in_next_21_days");

  // 3) Book the full pass.
  console.log(`\nReserving a full pass for ${target}…`);
  const booking = await createUnblckHubCheckin(identity, target);
  console.log(`✅ BOOKED — provider booking_id ${booking.booking_id}`);

  // 4) Verify it shows up at the provider.
  const after = await getUnblckHubState(identity);
  const visible = after.bookings.includes(target);
  console.log(`   verification: ${target} ${visible ? "present ✅" : "MISSING ✗"} in provider bookings`);
  if (!visible) throw new Error("booking_not_visible_at_provider");

  // 5) Clean up unless --keep.
  if (keep) {
    console.log(`\n🎟️  Full pass KEPT for ${target}. Done.\n`);
  } else {
    await cancelUnblckHubCheckin(identity, target);
    console.log(`\nCleaned up (cancelled ${target}). Run with --book --keep to keep a real pass.\n`);
  }
}

main().catch((error) => {
  console.error("✗ FAILED:", errorCode(error));
  process.exit(1);
});
