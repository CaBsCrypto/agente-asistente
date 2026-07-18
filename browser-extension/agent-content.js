const PAGE_SOURCE = "agent-assistant";
const EXTENSION_SOURCE = "agent-assistant-browser-bridge";
const VERSION = 1;
const EXTENSION_VERSION = chrome.runtime.getManifest().version;

function postToPage(message) {
  window.postMessage({
    source: EXTENSION_SOURCE,
    version: VERSION,
    ...message,
  }, window.location.origin);
}

function announce() {
  postToPage({ type: "BRIDGE_HELLO", extensionVersion: EXTENSION_VERSION });
}

window.addEventListener("message", (event) => {
  if (event.source !== window || event.origin !== window.location.origin) return;
  const message = event.data;
  if (!message || message.source !== PAGE_SOURCE || message.version !== VERSION) return;
  if (message.type === "BRIDGE_PING") {
    announce();
    return;
  }
  if (message.type !== "UNBLCK_READ_STATUS") return;
  if (typeof message.requestId !== "string" || message.requestId.length > 100) return;

  chrome.runtime.sendMessage({
    type: "UNBLCK_READ_STATUS",
    requestId: message.requestId,
  }).then((response) => {
    postToPage({
      type: "BRIDGE_RESPONSE",
      requestId: message.requestId,
      ok: Boolean(response?.ok),
      data: response?.data,
      error: response?.error,
    });
  }).catch(() => {
    postToPage({
      type: "BRIDGE_RESPONSE",
      requestId: message.requestId,
      ok: false,
      error: "bridge_runtime_unavailable",
    });
  });
});

announce();
