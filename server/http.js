export const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff"
};

// extraHeaderEntries 接受 [name, value] 陣列，讓同一個 response 可以附加多個
// Set-Cookie（例如登入時同時要發 session cookie 跟 csrf cookie）。
export function jsonResponse(payload, status = 200, extraHeaderEntries = []) {
  const headers = new Headers(JSON_HEADERS);
  for (const [name, value] of extraHeaderEntries) {
    headers.append(name, value);
  }
  return new Response(JSON.stringify(payload), { status, headers });
}

export function normalizeText(rawText, maxLength, fallback = "") {
  const value = String(rawText || "").replace(/\r\n/g, "\n").trim();
  if (!value) return fallback;
  return value.slice(0, maxLength);
}

export function getClientIp(request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    ""
  );
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function toHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function fromHex(hex) {
  const clean = String(hex || "");
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function base64UrlEncode(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlDecode(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function parseCookies(request) {
  const header = request.headers.get("cookie") || "";
  const cookies = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

export function buildSetCookie(name, value, { maxAgeSeconds, httpOnly = true } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", "SameSite=Strict", "Secure"];
  if (httpOnly) parts.push("HttpOnly");
  if (typeof maxAgeSeconds === "number") parts.push(`Max-Age=${maxAgeSeconds}`);
  return parts.join("; ");
}

export function buildClearCookie(name) {
  return `${name}=; Path=/; SameSite=Strict; Secure; Max-Age=0`;
}
