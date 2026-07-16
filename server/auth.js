import { toHex, fromHex, base64UrlEncode, base64UrlDecode, parseCookies, getClientIp } from "./http.js";

const SESSION_COOKIE = "admin_session";
const CSRF_COOKIE = "admin_csrf";
const SESSION_TTL_SECONDS = 12 * 60 * 60; // 12 小時
const LOGIN_FAIL_LIMIT = 5;
const LOGIN_FAIL_WINDOW_SECONDS = 15 * 60;

async function pbkdf2Derive(password, saltBytes, iterations) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations },
    keyMaterial,
    256
  );

  return new Uint8Array(derived);
}

// hash 格式：pbkdf2$疊代次數$saltHex$hashHex，只在 ADMIN_PASSWORD_HASH secret 裡看得到。
export async function verifyPassword(password, storedHash) {
  const parts = String(storedHash || "").split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;

  const iterations = Number(parts[1]);
  const saltBytes = fromHex(parts[2]);
  const expectedHex = parts[3];
  if (!Number.isFinite(iterations) || iterations <= 0 || !saltBytes.length || !expectedHex) return false;

  const derived = await pbkdf2Derive(password, saltBytes, iterations);
  const derivedHex = toHex(derived);

  if (derivedHex.length !== expectedHex.length) return false;
  let diff = 0;
  for (let i = 0; i < derivedHex.length; i += 1) {
    diff |= derivedHex.charCodeAt(i) ^ expectedHex.charCodeAt(i);
  }
  return diff === 0;
}

async function hmacSign(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return new Uint8Array(signature);
}

export async function createSessionToken(env, username) {
  const now = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({ sub: username, iat: now, exp: now + SESSION_TTL_SECONDS });
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(payload));
  const signature = await hmacSign(env.SESSION_SECRET, payloadB64);
  return `${payloadB64}.${base64UrlEncode(signature)}`;
}

export async function verifySessionToken(env, token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [payloadB64, sigB64] = token.split(".");
  if (!payloadB64 || !sigB64) return null;

  const expectedSig = await hmacSign(env.SESSION_SECRET, payloadB64);
  const expectedB64 = base64UrlEncode(expectedSig);
  if (expectedB64.length !== sigB64.length) return null;
  let diff = 0;
  for (let i = 0; i < expectedB64.length; i += 1) {
    diff |= expectedB64.charCodeAt(i) ^ sigB64.charCodeAt(i);
  }
  if (diff !== 0) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)));
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}

export function issueCsrfToken() {
  return toHex(crypto.getRandomValues(new Uint8Array(24)));
}

export async function requireAdmin(request, env) {
  const cookies = parseCookies(request);
  const token = cookies[SESSION_COOKIE];
  const payload = await verifySessionToken(env, token);
  if (!payload) {
    return { ok: false, status: 401, error: "尚未登入或登入已過期，請重新登入。" };
  }
  return { ok: true, username: payload.sub };
}

export function requireCsrf(request) {
  const cookies = parseCookies(request);
  const cookieToken = cookies[CSRF_COOKIE] || "";
  const headerToken = request.headers.get("x-csrf-token") || "";
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return { ok: false, status: 403, error: "CSRF 驗證失敗，請重新整理頁面後再試一次。" };
  }
  return { ok: true };
}

export { SESSION_COOKIE, CSRF_COOKIE, SESSION_TTL_SECONDS };

export async function checkLoginRateLimit(env, request) {
  if (!env.COMMENT_CACHE) return { ok: true };

  const ip = getClientIp(request) || "unknown";
  const key = `login-fail:${ip}`;
  const raw = await env.COMMENT_CACHE.get(key);
  const count = Number(raw || "0") || 0;

  if (count >= LOGIN_FAIL_LIMIT) {
    return { ok: false, error: "登入失敗次數過多，請稍後再試。" };
  }
  return { ok: true, key, count };
}

export async function recordLoginFailure(env, key, count) {
  if (!env.COMMENT_CACHE || !key) return;
  await env.COMMENT_CACHE.put(key, String(count + 1), { expirationTtl: LOGIN_FAIL_WINDOW_SECONDS });
}

export async function clearLoginFailures(env, key) {
  if (!env.COMMENT_CACHE || !key) return;
  await env.COMMENT_CACHE.delete(key);
}
