export const BROWSER_BRIDGE_VERSION = 1;
export const BROWSER_BRIDGE_PAGE_SOURCE = "agent-assistant";
export const BROWSER_BRIDGE_EXTENSION_SOURCE = "agent-assistant-browser-bridge";

export type UnblckBrowserEvidence = {
  provider: "unblck";
  authenticated: boolean;
  pageUrl: string;
  observedAt: string;
  hub: {
    creditsRemaining: number | null;
    creditsTotal: number | null;
    month: string | null;
    bookingPolicy: string | null;
    enabledDates: number[];
    disabledDateCount: number;
  };
};

export type BrowserBridgeEvent =
  | { type: "BRIDGE_HELLO"; extensionVersion: string }
  | {
      type: "BRIDGE_RESPONSE";
      requestId: string;
      ok: boolean;
      data?: UnblckBrowserEvidence;
      error?: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function finiteInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && Number.isFinite(value);
}

export function parseBrowserBridgeEvent(value: unknown): BrowserBridgeEvent | null {
  if (!isRecord(value)) return null;
  if (value.source !== BROWSER_BRIDGE_EXTENSION_SOURCE || value.version !== BROWSER_BRIDGE_VERSION) return null;
  if (value.type === "BRIDGE_HELLO" && typeof value.extensionVersion === "string") {
    return { type: "BRIDGE_HELLO", extensionVersion: value.extensionVersion };
  }
  if (value.type !== "BRIDGE_RESPONSE" || typeof value.requestId !== "string" || typeof value.ok !== "boolean") return null;
  if (!value.ok) {
    return {
      type: "BRIDGE_RESPONSE",
      requestId: value.requestId,
      ok: false,
      error: typeof value.error === "string" ? value.error : "bridge_request_failed",
    };
  }
  if (!isRecord(value.data) || value.data.provider !== "unblck" || typeof value.data.authenticated !== "boolean") return null;
  if (typeof value.data.pageUrl !== "string" || typeof value.data.observedAt !== "string" || !isRecord(value.data.hub)) return null;
  const hub = value.data.hub;
  if (!Array.isArray(hub.enabledDates) || !hub.enabledDates.every(finiteInteger)) return null;
  if (!finiteInteger(hub.disabledDateCount)) return null;
  const nullableNumber = (candidate: unknown) => candidate === null || finiteInteger(candidate);
  const nullableString = (candidate: unknown) => candidate === null || typeof candidate === "string";
  if (!nullableNumber(hub.creditsRemaining) || !nullableNumber(hub.creditsTotal)) return null;
  if (!nullableString(hub.month) || !nullableString(hub.bookingPolicy)) return null;
  return {
    type: "BRIDGE_RESPONSE",
    requestId: value.requestId,
    ok: true,
    data: {
      provider: "unblck",
      authenticated: value.data.authenticated,
      pageUrl: value.data.pageUrl,
      observedAt: value.data.observedAt,
      hub: {
        creditsRemaining: hub.creditsRemaining as number | null,
        creditsTotal: hub.creditsTotal as number | null,
        month: hub.month as string | null,
        bookingPolicy: hub.bookingPolicy as string | null,
        enabledDates: hub.enabledDates as number[],
        disabledDateCount: hub.disabledDateCount as number,
      },
    },
  };
}

export function browserBridgeRequest(requestId: string) {
  return {
    source: BROWSER_BRIDGE_PAGE_SOURCE,
    version: BROWSER_BRIDGE_VERSION,
    type: "UNBLCK_READ_STATUS",
    requestId,
  } as const;
}

export function browserBridgePing() {
  return {
    source: BROWSER_BRIDGE_PAGE_SOURCE,
    version: BROWSER_BRIDGE_VERSION,
    type: "BRIDGE_PING",
  } as const;
}
