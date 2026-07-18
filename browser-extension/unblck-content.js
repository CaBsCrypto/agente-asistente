function normalizedText(element) {
  return (element?.textContent ?? "").replace(/\s+/g, " ").trim();
}

function parseCredits(text) {
  const match = text.match(/(\d+)\s*\/\s*(\d+)\s*cr(?:e|?)ditos/i);
  return match
    ? { remaining: Number(match[1]), total: Number(match[2]) }
    : { remaining: null, total: null };
}

function readHubStatus() {
  const authenticated = window.location.pathname.startsWith("/member/");
  const hubContainer = document.querySelector("aside") ?? document.querySelector("main");
  const hubText = normalizedText(hubContainer);
  const credits = parseCredits(hubText);
  const monthNames = /(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+\d{4}/i;
  const headings = Array.from((hubContainer ?? document).querySelectorAll("h2,h3"));
  const month = headings.map(normalizedText).find((text) => monthNames.test(text)) ?? null;
  const paragraphs = Array.from((hubContainer ?? document).querySelectorAll("p")).map(normalizedText);
  const bookingPolicy = paragraphs.find((text) => /lun.*vie|agenda tu semana|book a day/i.test(text)) ?? null;
  const dateButtons = Array.from((hubContainer ?? document).querySelectorAll("button"))
    .filter((button) => /^\d{1,2}$/.test(normalizedText(button)));
  const enabledDates = dateButtons
    .filter((button) => !button.disabled && button.getAttribute("aria-disabled") !== "true")
    .map((button) => Number(normalizedText(button)));

  return {
    provider: "unblck",
    authenticated,
    pageUrl: window.location.origin + window.location.pathname,
    observedAt: new Date().toISOString(),
    hub: {
      creditsRemaining: credits.remaining,
      creditsTotal: credits.total,
      month,
      bookingPolicy,
      enabledDates,
      disabledDateCount: dateButtons.length - enabledDates.length,
    },
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "UNBLCK_READ_STATUS_INTERNAL") return false;
  if (window.location.origin !== "https://www.unblck.cl") {
    sendResponse({ ok: false, error: "invalid_provider_origin" });
    return false;
  }
  if (!window.location.pathname.startsWith("/member/")) {
    sendResponse({ ok: false, error: "unblck_not_authenticated" });
    return false;
  }
  sendResponse({ ok: true, data: readHubStatus() });
  return false;
});
