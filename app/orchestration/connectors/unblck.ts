import type { AgentConnector } from "@/app/orchestration/connector";
import { getUnblckConnection, hasUnblckConnection } from "@/app/connectors/unblck-connection";
import {
  cancelUnblckHubCheckin,
  createUnblckHubCheckin,
  getUnblckHubState,
} from "@/app/connectors/unblck";

const capabilities = [
  { id: "hub.state", operation: "read" as const, description: "Read credits, open days and bookings" },
  { id: "hub.book", operation: "write" as const, description: "Create one hub check-in" },
  { id: "hub.cancel", operation: "write" as const, description: "Cancel one hub check-in" },
];

export function createUnblckWorkflowConnector(): AgentConnector {
  return {
    id: "unblck",
    capabilities,
    async connectionStatus(context) {
      return (await hasUnblckConnection(context.userId)) ? "connected" : "missing";
    },
    async prepare(context, capability) {
      if (capability === "hub.state") {
        return {
          connectorId: "unblck",
          capability,
          operation: "read",
          summary: "Read the linked member's UNBLCK hub state",
          parameters: {},
          immutable: { access: "read-only", userId: context.userId },
        };
      }
      const bookingDate = String(context.parameters.bookingDate ?? "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(bookingDate)) {
        throw new Error("unblck_booking_date_required");
      }
      const book = capability === "hub.book";
      if (!book && capability !== "hub.cancel") {
        throw new Error("unblck_capability_not_supported");
      }
      return {
        connectorId: "unblck",
        capability,
        operation: "write",
        summary: `${book ? "Book" : "Cancel"} UNBLCK hub check-in for ${bookingDate}`,
        parameters: { bookingDate },
        immutable: {
          bookingDate,
          mutation: book ? "book" : "cancel",
          userId: context.userId,
        },
      };
    },
    async execute(context, action) {
      const { identity } = await getUnblckConnection(context.userId);
      if (action.capability === "hub.state") {
        return { kind: "state", state: await getUnblckHubState(identity) };
      }
      const bookingDate = String(action.immutable.bookingDate ?? "");
      if (action.capability === "hub.book") {
        const result = await createUnblckHubCheckin(identity, bookingDate);
        return { kind: "booking", bookingDate, ...result };
      }
      if (action.capability === "hub.cancel") {
        const result = await cancelUnblckHubCheckin(identity, bookingDate);
        return { kind: "cancellation", bookingDate, ...result };
      }
      throw new Error("unblck_capability_not_supported");
    },
    async verify(_context, execution) {
      if (execution.kind === "state") {
        const state = execution.state as Record<string, unknown> | undefined;
        const verified = Boolean(
          state && Array.isArray(state.bookings) &&
          Array.isArray(state.open_days) && state.credits,
        );
        return [{
          kind: "unblck_hub_state",
          reference: "unblck:hub-checkins:state",
          verified,
          metadata: { sourceOfTruth: "unblck", access: "read-only" },
        }];
      }
      if (execution.kind === "booking") {
        return [{
          kind: "unblck_booking",
          reference: `unblck:booking:${String(execution.booking_id ?? "missing")}`,
          verified: execution.ok === true && typeof execution.booking_id === "string",
          metadata: { bookingDate: execution.bookingDate },
        }];
      }
      return [{
        kind: "unblck_cancellation",
        reference: `unblck:cancellation:${String(execution.bookingDate ?? "missing")}`,
        verified: execution.kind === "cancellation" && execution.ok === true,
        metadata: { bookingDate: execution.bookingDate },
      }];
    },
  };
}
