import { parseCookies } from "./http.js";

const SESSION_COOKIE = "admin_session";
const SESSION_TTL_SECONDS = 12 * 60 * 60; // 12 小時，單純讓瀏覽器過一段時間自動忘記登入狀態。

// 最簡化版本：帳號密碼直接明文存在 Cloudflare secret（ADMIN_USERNAME / ADMIN_PASSWORD），
// 不做雜湊、不簽章 session、不做 CSRF token，登入 cookie 直接存密碼本身當作憑證。
export function checkCredentials(env, username, password) {
  return Boolean(env.ADMIN_USERNAME) && Boolean(env.ADMIN_PASSWORD)
    && username === env.ADMIN_USERNAME
    && password === env.ADMIN_PASSWORD;
}

export function requireAdmin(request, env) {
  if (!env.ADMIN_PASSWORD) {
    return { ok: false, status: 503, error: "Admin 帳密尚未設定。" };
  }

  const cookies = parseCookies(request);
  const token = cookies[SESSION_COOKIE];
  if (!token || token !== env.ADMIN_PASSWORD) {
    return { ok: false, status: 401, error: "尚未登入或登入已過期，請重新登入。" };
  }

  return { ok: true, username: env.ADMIN_USERNAME };
}

export { SESSION_COOKIE, SESSION_TTL_SECONDS };
