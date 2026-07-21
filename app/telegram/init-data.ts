// Validate a Telegram Mini App's initData server-side.
// A Mini App receives window.Telegram.WebApp.initData (a signed query string).
// We MUST verify its HMAC with the bot token before trusting the user — otherwise
// anyone could POST a forged identity. Algorithm per Telegram's docs:
//   secret_key = HMAC_SHA256(key="WebAppData", message=bot_token)
//   hash       = HMAC_SHA256(key=secret_key, message=data_check_string)
// where data_check_string is the remaining fields sorted by key as "k=v" joined by "\n".
import { createHmac, timingSafeEqual } from "node:crypto";

export type TelegramInitUser = {
  id: number;
  username?: string;
  first_name?: string;
  language_code?: string;
};

export type InitDataResult =
  | { ok: true; user?: TelegramInitUser; authDate: number }
  | { ok: false; reason: string };

export function validateTelegramInitData(
  initData: string,
  botToken: string,
  options: { maxAgeSeconds?: number; nowMs?: number } = {},
): InitDataResult {
  if (!initData || !botToken) return { ok: false, reason: "missing_input" };

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { ok: false, reason: "no_hash" };
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const computed = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  const expected = Buffer.from(computed, "hex");
  const provided = Buffer.from(hash, "hex");
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return { ok: false, reason: "bad_hash" };
  }

  const authDate = Number(params.get("auth_date") ?? "0");
  const maxAge = options.maxAgeSeconds ?? 3600;
  if (maxAge > 0 && authDate > 0) {
    const nowMs = options.nowMs ?? Date.now();
    if (nowMs / 1000 - authDate > maxAge) return { ok: false, reason: "expired" };
  }

  let user: TelegramInitUser | undefined;
  const userRaw = params.get("user");
  if (userRaw) {
    try {
      user = JSON.parse(userRaw) as TelegramInitUser;
    } catch {
      /* leave user undefined */
    }
  }
  return { ok: true, user, authDate };
}
