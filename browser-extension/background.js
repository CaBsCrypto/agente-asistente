const UNBLCK_MEMBER_PATTERN = "https://www.unblck.cl/member/*";

async function memberTabs() {
  const tabs = await chrome.tabs.query({ url: [UNBLCK_MEMBER_PATTERN] });
  return tabs
    .filter((tab) => typeof tab.id === "number")
    .sort((left, right) => (right.lastAccessed ?? 0) - (left.lastAccessed ?? 0));
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "UNBLCK_READ_STATUS") return false;
  if (typeof message.requestId !== "string" || message.requestId.length > 100) {
    sendResponse({ ok: false, error: "invalid_request" });
    return false;
  }

  memberTabs()
    .then(async (tabs) => {
      const target = tabs[0];
      if (!target?.id) return { ok: false, error: "unblck_member_tab_not_found" };
      const result = await chrome.tabs.sendMessage(target.id, {
        type: "UNBLCK_READ_STATUS_INTERNAL",
        requestId: message.requestId,
      });
      return result?.ok ? result : { ok: false, error: result?.error ?? "unblck_read_failed" };
    })
    .then(sendResponse)
    .catch(() => sendResponse({ ok: false, error: "unblck_bridge_failed" }));

  return true;
});
