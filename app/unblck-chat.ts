import { z } from "zod";
import { unblckChannelSchema } from "@/app/connectors/unblck";

const workflowIdSchema = z.string().regex(/^wf_unblck_[a-f0-9]{32}$/);
const digestSchema = z.string().regex(/^[a-f0-9]{64}$/);

export type UnblckChatIntent =
  | {
      operation: "link";
      channel: "telegram" | "whatsapp";
      channelUserId: string;
      code: string;
    }
  | { operation: "state" }
  | { operation: "book" | "cancel"; bookingDate: string }
  | { operation: "confirm"; workflowId: string; actionDigest: string };

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function validIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T12:00:00Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function parseUnblckChatIntent(message: string): UnblckChatIntent | null {
  const confirmation = message.trim().match(
    /^UNBLCK_CONFIRM\s+(wf_unblck_[a-f0-9]{32})\s+([a-f0-9]{64})$/i,
  );
  if (confirmation) {
    return {
      operation: "confirm",
      workflowId: workflowIdSchema.parse(confirmation[1].toLowerCase()),
      actionDigest: digestSchema.parse(confirmation[2].toLowerCase()),
    };
  }

  const query = normalized(message);
  if (!query.includes("unblck") && !query.includes("unblock")) return null;

  const code = message.match(/(?:c[oó]digo|code)\s*[:#-]?\s*([a-z0-9]{6,32})/i)?.[1];
  const channelMatch = message.match(
    /\b(telegram|whatsapp)\b\s*(?:id|user|usuario|n[uú]mero|number)?\s*[:#-]?\s*([+a-z0-9._-]{3,128})/i,
  );
  if (code && channelMatch) {
    return {
      operation: "link",
      channel: unblckChannelSchema.parse(channelMatch[1].toLowerCase()),
      channelUserId: channelMatch[2],
      code: code.toUpperCase(),
    };
  }

  const date = message.match(/\b(\d{4}-\d{2}-\d{2})\b/)?.[1];
  const wantsCancel = ["cancel", "cancela", "cancelar", "anula", "desmarcar"].some(
    (term) => query.includes(term),
  );
  const wantsBook = ["book", "reserva", "reservar", "agenda", "agendar"].some(
    (term) => query.includes(term),
  );
  if ((wantsBook || wantsCancel) && date && validIsoDate(date)) {
    return { operation: wantsCancel ? "cancel" : "book", bookingDate: date };
  }

  if (
    [
      "credito", "credit", "dias disponibles", "available days",
      "reservas", "bookings", "estado", "status", "passes",
    ].some((term) => query.includes(term))
  ) {
    return { operation: "state" };
  }

  return null;
}

export function unblckConfirmationMessage(
  workflowId: string,
  actionDigest: string,
) {
  return `UNBLCK_CONFIRM ${workflowIdSchema.parse(workflowId)} ${digestSchema.parse(actionDigest)}`;
}
