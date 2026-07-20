import { createHash } from "node:crypto";
import type { AgentChatReply, AgentLanguage } from "@/app/agent-chat-logic";
import { linkUnblckUser } from "@/app/connectors/unblck-connection";
import { createConnectorRegistry } from "@/app/orchestration/connector";
import { createUnblckWorkflowConnector } from "@/app/orchestration/connectors/unblck";
import { createPersistedWorkflowRuntime } from "@/app/orchestration/runtime";
import { createWorkflowState } from "@/app/orchestration/types";
import type { UnblckChatIntent } from "@/app/unblck-chat";
import { unblckConfirmationMessage } from "@/app/unblck-chat";

type Input = {
  intent: UnblckChatIntent;
  userId: string;
  conversationId: string;
  userMessageId: string;
  language: AgentLanguage;
};

const dayNames = {
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  es: ["domingo", "lunes", "martes", "mi\u00e9rcoles", "jueves", "viernes", "s\u00e1bado"],
  pt: ["domingo", "segunda", "ter\u00e7a", "quarta", "quinta", "sexta", "s\u00e1bado"],
} as const;

function runtime() {
  return createPersistedWorkflowRuntime(
    createConnectorRegistry([createUnblckWorkflowConnector()]),
  );
}

function workflowId(input: Input) {
  const suffix = createHash("sha256")
    .update([
      input.userId,
      input.userMessageId,
      input.intent.operation,
      "bookingDate" in input.intent ? input.intent.bookingDate : "",
    ].join(":"))
    .digest("hex")
    .slice(0, 32);
  return "wf_unblck_" + suffix;
}

function connectedReply(content: string, actions: AgentChatReply["actions"] = []): AgentChatReply {
  return {
    content,
    actions,
    connection: { name: "UNBLCK / Tellus Hub", stage: "Connected", priority: "P0" },
  };
}

function linkInstructions(language: AgentLanguage): AgentChatReply {
  const copy = {
    en: "Generate a Connect code at **UNBLCK > Member Hub > Connect**. Then send: `Connect UNBLCK code ABC123XY telegram 123456789`. Use your real Telegram ID, or replace Telegram and the ID with your WhatsApp identity.",
    es: "Genera un Connect code en **UNBLCK > Member Hub > Connect**. Luego env\u00eda: `Conecta UNBLCK c\u00f3digo ABC123XY telegram 123456789`. Usa tu Telegram ID real, o reemplaza Telegram y el ID por tu identidad de WhatsApp.",
    pt: "Gere um Connect code em **UNBLCK > Member Hub > Connect**. Depois envie: `Conecta UNBLCK c\u00f3digo ABC123XY telegram 123456789`. Use seu Telegram ID real ou substitua pelo WhatsApp.",
  }[language];
  return {
    content: copy,
    actions: [{ label: "Open UNBLCK Connect", href: "https://www.unblck.cl/member/hub/connect" }],
    connection: { name: "UNBLCK / Tellus Hub", stage: "Credentials needed", priority: "P0" },
  };
}

function safeError(error: unknown, language: AgentLanguage): AgentChatReply {
  const raw = error instanceof Error ? error.message.split(":")[0] : "unblck_failed";
  if (raw === "unblck_link_required" || raw === "unblck_403") {
    return linkInstructions(language);
  }
  const known: Record<string, Record<AgentLanguage, string>> = {
    unblck_400: {
      en: "UNBLCK rejected the request. The Connect code may be invalid, expired or already used, or the booking violates a hub rule.",
      es: "UNBLCK rechaz\u00f3 la solicitud. El Connect code puede ser inv\u00e1lido, estar vencido o usado, o la reserva incumple una regla del hub.",
      pt: "A UNBLCK rejeitou a solicita\u00e7\u00e3o. O Connect code pode ser inv\u00e1lido, expirado ou usado, ou a reserva viola uma regra do hub.",
    },
    unblck_401: {
      en: "UNBLCK rejected the partner credential. No action was executed.",
      es: "UNBLCK rechaz\u00f3 la credencial del partner. No se ejecut\u00f3 ninguna acci\u00f3n.",
      pt: "A UNBLCK rejeitou a credencial do parceiro. Nenhuma a\u00e7\u00e3o foi executada.",
    },
    unblck_timeout: {
      en: "UNBLCK did not respond in time. The result is ambiguous and the agent will not retry a mutation automatically.",
      es: "UNBLCK no respondi\u00f3 a tiempo. El resultado es ambiguo y el agente no reintentar\u00e1 una mutaci\u00f3n autom\u00e1ticamente.",
      pt: "A UNBLCK n\u00e3o respondeu a tempo. O resultado \u00e9 amb\u00edguo e o agente n\u00e3o repetir\u00e1 a muta\u00e7\u00e3o automaticamente.",
    },
  };
  return {
    content: known[raw]?.[language] ?? `UNBLCK request failed safely (**${raw}**). No automatic retry was made.`,
    actions: [],
    connection: { name: "UNBLCK / Tellus Hub", stage: "Ready to test", priority: "P0" },
  };
}

export async function handleUnblckChatIntent(input: Input): Promise<AgentChatReply> {
  try {
    if (input.intent.operation === "link") {
      await linkUnblckUser(input.userId, input.intent);
      const suffix = input.intent.channelUserId.slice(-4);
      return connectedReply({
        en: `UNBLCK linked successfully to ${input.intent.channel} identity ending in **${suffix}**. You can now ask for credits, open days or bookings.`,
        es: `UNBLCK qued\u00f3 conectado a la identidad de ${input.intent.channel} terminada en **${suffix}**. Ya puedes consultar cr\u00e9ditos, d\u00edas disponibles o reservas.`,
        pt: `A UNBLCK foi conectada \u00e0 identidade ${input.intent.channel} terminada em **${suffix}**. Agora voc\u00ea pode consultar cr\u00e9ditos, dias ou reservas.`,
      }[input.language], [{
        label: input.language === "es" ? "Ver mi estado" : input.language === "pt" ? "Ver meu estado" : "Show my status",
        message: "UNBLCK status: credits, open days and bookings",
      }]);
    }

    const graph = runtime();
    if (input.intent.operation === "confirm") {
      const current = await graph.get(input.userId, input.intent.workflowId);
      if (!current) throw new Error("unblck_workflow_not_found");
      if (current.actionDigest !== input.intent.actionDigest) {
        throw new Error("approval_does_not_match_prepared_action");
      }
      const result = current.status === "completed"
        ? current
        : await graph.resumeApproval({
            userId: input.userId,
            workflowId: current.workflowId,
            approval: {
              approvedBy: input.userId,
              actionDigest: input.intent.actionDigest,
              approvedAt: new Date().toISOString(),
            },
          });
      if (result.status !== "completed") throw new Error(result.error ?? "unblck_execution_failed");
      const date = String(result.preparedAction?.immutable.bookingDate ?? "");
      const mutation = String(result.preparedAction?.immutable.mutation ?? "");
      const content = mutation === "book"
        ? {
            en: `UNBLCK confirmed the booking for **${date}**. Repeating this confirmation returns the same completed workflow without creating another execution.`,
            es: `UNBLCK confirm\u00f3 la reserva para el **${date}**. Repetir esta confirmaci\u00f3n devuelve el mismo workflow completado sin crear otra ejecuci\u00f3n.`,
            pt: `A UNBLCK confirmou a reserva para **${date}**. Repetir esta confirma\u00e7\u00e3o retorna o mesmo workflow sem outra execu\u00e7\u00e3o.`,
          }[input.language]
        : {
            en: `UNBLCK confirmed the cancellation for **${date}**.`,
            es: `UNBLCK confirm\u00f3 la cancelaci\u00f3n para el **${date}**.`,
            pt: `A UNBLCK confirmou o cancelamento para **${date}**.`,
          }[input.language];
      return {
        ...connectedReply(content, [{
          label: input.language === "es" ? "Actualizar estado" : input.language === "pt" ? "Atualizar estado" : "Refresh status",
          message: "UNBLCK status: credits, open days and bookings",
        }]),
        workflow: { id: result.workflowId, status: result.status, engine: "langgraph", version: result.version },
      };
    }

    const capability = input.intent.operation === "state"
      ? "hub.state"
      : input.intent.operation === "book"
        ? "hub.book"
        : "hub.cancel";
    const operation = input.intent.operation === "state" ? "read" : "write";
    const initial = await graph.start(createWorkflowState({
      workflowId: workflowId(input),
      userId: input.userId,
      conversationId: input.conversationId,
      request: input.intent.operation,
      connectorId: "unblck",
      capability,
      operation,
      risk: input.intent.operation === "state" ? "low" : "medium",
      parameters: "bookingDate" in input.intent
        ? { bookingDate: input.intent.bookingDate }
        : {},
    }));
    if (initial.status === "awaiting_connection") return linkInstructions(input.language);

    if (input.intent.operation === "state") {
      if (initial.status !== "completed" || !initial.execution?.state) {
        throw new Error(initial.error ?? "unblck_state_failed");
      }
      const state = initial.execution.state as {
        bookings: string[];
        credits: { total: number | null; used: number; remaining: number | null };
        tier: string;
        open_days: number[];
      };
      const total = state.credits.total ?? "unlimited";
      const remaining = state.credits.remaining ?? "unlimited";
      const bookings = state.bookings.length ? state.bookings.join(", ") : "none";
      const openDays = state.open_days.map((day) => dayNames[input.language][day]).join(", ");
      return {
        ...connectedReply([
          `**UNBLCK** · ${state.tier}`,
          `Credits: **${remaining}/${total}** (${state.credits.used} used)`,
          `Open days: **${openDays}**`,
          `Bookings: **${bookings}**`,
        ].join("\n\n")),
        workflow: { id: initial.workflowId, status: initial.status, engine: "langgraph", version: initial.version },
      };
    }

    if (initial.status !== "awaiting_approval" || !initial.actionDigest) {
      throw new Error(initial.error ?? "unblck_prepare_failed");
    }
    const book = input.intent.operation === "book";
    const content = {
      en: `Review the UNBLCK ${book ? "booking" : "cancellation"} for **${input.intent.bookingDate}**. Nothing has been executed. Confirm only if the date and action are correct.`,
      es: `Revisa la ${book ? "reserva" : "cancelaci\u00f3n"} de UNBLCK para el **${input.intent.bookingDate}**. Todav\u00eda no se ejecut\u00f3 nada. Confirma solamente si la fecha y la acci\u00f3n son correctas.`,
      pt: `Revise o ${book ? "agendamento" : "cancelamento"} da UNBLCK para **${input.intent.bookingDate}**. Nada foi executado. Confirme somente se a data e a a\u00e7\u00e3o estiverem corretas.`,
    }[input.language];
    return {
      ...connectedReply(content, [{
        label: book
          ? input.language === "es" ? "Confirmar reserva" : input.language === "pt" ? "Confirmar reserva" : "Confirm booking"
          : input.language === "es" ? "Confirmar cancelaci\u00f3n" : input.language === "pt" ? "Confirmar cancelamento" : "Confirm cancellation",
        message: unblckConfirmationMessage(initial.workflowId, initial.actionDigest),
      }]),
      workflow: { id: initial.workflowId, status: initial.status, engine: "langgraph", version: initial.version },
    };
  } catch (error) {
    return safeError(error, input.language);
  }
}
