import {
  jsonResponse,
  readJson,
  normalizeText,
  getClientIp,
  buildSetCookie,
  buildClearCookie
} from "./server/http.js";
import {
  checkCredentials,
  requireAdmin,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS
} from "./server/auth.js";
import { listPosts, getPostBySlug, createPost, updatePost, deletePost } from "./server/posts.js";
import { handleUpload, handleFileGet } from "./server/uploads.js";
import { listCommentsForAdmin, listCommentPageKeys, setCommentVisibility } from "./server/comments-admin.js";

let schemaReady;

async function hashText(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function ensureSchema(env) {
  if (!schemaReady) {
    // D1 的資料表只需要建立一次；之後每次請求都直接沿用相同 schema。
    schemaReady = (async () => {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS page_stats (
          page_key TEXT PRIMARY KEY,
          views INTEGER NOT NULL DEFAULT 0,
          likes INTEGER NOT NULL DEFAULT 0,
          comments INTEGER NOT NULL DEFAULT 0,
          updated_at TEXT NOT NULL
        )
      `).run();

      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          page_key TEXT NOT NULL,
          nickname TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TEXT NOT NULL,
          visible INTEGER NOT NULL DEFAULT 1
        )
      `).run();

      await env.DB.prepare(`
        CREATE INDEX IF NOT EXISTS idx_comments_page_id ON comments(page_key, id DESC)
      `).run();
    })();
  }

  await schemaReady;
}

function getPageKey(request, body) {
  const url = new URL(request.url);
  const rawKey = body?.key || url.searchParams.get("key") || "";
  const value = String(rawKey || "").trim().replace(/\r?\n/g, " ");
  return value.slice(0, 180);
}

async function bumpStats(env, pageKey, delta) {
  const now = new Date().toISOString();
  const views = Number(delta.views || 0);
  const likes = Number(delta.likes || 0);
  const comments = Number(delta.comments || 0);

  // 用 UPSERT 把單頁統計集中寫回同一筆資料，避免另外維護多張計數表。
  await env.DB.prepare(`
    INSERT INTO page_stats (page_key, views, likes, comments, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(page_key) DO UPDATE SET
      views = views + excluded.views,
      likes = likes + excluded.likes,
      comments = comments + excluded.comments,
      updated_at = excluded.updated_at
  `).bind(pageKey, views, likes, comments, now).run();
}

async function getPageSnapshot(env, pageKey) {
  const statsResult = await env.DB.prepare(`
    SELECT views, likes, comments, updated_at
    FROM page_stats
    WHERE page_key = ?
  `).bind(pageKey).first();

  const commentsResult = await env.DB.prepare(`
    SELECT nickname, content, created_at
    FROM comments
    WHERE page_key = ? AND visible = 1
    ORDER BY id DESC
    LIMIT 20
  `).bind(pageKey).all();

  return {
    stats: {
      views: Number(statsResult?.views || 0),
      likes: Number(statsResult?.likes || 0),
      comments: Number(statsResult?.comments || 0),
      updatedAt: statsResult?.updated_at || null
    },
    comments: Array.isArray(commentsResult?.results) ? commentsResult.results : []
  };
}

async function verifyTurnstile(env, request, token) {
  if (!env.TURNSTILE_SECRET_KEY) {
    return { ok: true };
  }

  if (!token) {
    return { ok: false, error: "請先完成 Turnstile 驗證。" };
  }

  const formData = new URLSearchParams();
  formData.set("secret", env.TURNSTILE_SECRET_KEY);
  formData.set("response", token);

  const remoteIp = getClientIp(request);
  if (remoteIp) {
    formData.set("remoteip", remoteIp);
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: formData
  });

  const data = await response.json();
  if (!data?.success) {
    return { ok: false, error: "Turnstile 驗證失敗，請重新確認。" };
  }

  return { ok: true };
}

async function rateLimitComment(env, request, pageKey) {
  if (!env.COMMENT_CACHE) {
    return { ok: true };
  }

  const salt = "personal-website-rate-limit";
  const fingerprint = await hashText(`${getClientIp(request)}|${request.headers.get("user-agent") || ""}|${salt}`);
  const cacheKey = `comment:${pageKey}:${fingerprint}`;
  const blocked = await env.COMMENT_CACHE.get(cacheKey);
  if (blocked) {
    return { ok: false, error: "你送出留言太快了，請稍後再試。" };
  }

  await env.COMMENT_CACHE.put(cacheKey, String(Date.now()), { expirationTtl: 60 });
  return { ok: true };
}

async function isDuplicateComment(env, pageKey, nickname, content) {
  const recent = await env.DB.prepare(`
    SELECT 1
    FROM comments
    WHERE page_key = ?
      AND nickname = ?
      AND content = ?
      AND datetime(created_at) >= datetime('now', '-30 seconds')
    LIMIT 1
  `).bind(pageKey, nickname, content).first();

  return Boolean(recent);
}

async function handleEngagement(request, env) {
  try {
    if (!env.DB) {
      return jsonResponse({ ok: false, error: "D1 綁定尚未設定，請先加入實際 database id。" }, 503);
    }

    await ensureSchema(env);

    const body = request.method === "POST" ? await readJson(request) : null;
    const pageKey = getPageKey(request, body);
    if (!pageKey) {
      return jsonResponse({ ok: false, error: "缺少 page key。" }, 400);
    }

    if (request.method === "GET") {
      const snapshot = await getPageSnapshot(env, pageKey);
      return jsonResponse({ ok: true, pageKey, ...snapshot });
    }

    const action = normalizeText(body?.action, 16);
    if (!action) {
      return jsonResponse({ ok: false, error: "缺少 action。" }, 400);
    }

    if (action === "view") {
      await bumpStats(env, pageKey, { views: 1 });
      const snapshot = await getPageSnapshot(env, pageKey);
      return jsonResponse({ ok: true, pageKey, ...snapshot });
    }

    if (action === "like") {
      await bumpStats(env, pageKey, { likes: 1 });
      const snapshot = await getPageSnapshot(env, pageKey);
      return jsonResponse({ ok: true, pageKey, ...snapshot });
    }

    if (action === "comment") {
      const nickname = normalizeText(body?.nickname, 24, "匿名");
      const content = normalizeText(body?.content, 500, "");

      if (!content) {
        return jsonResponse({ ok: false, error: "留言內容不能為空。" }, 400);
      }

      if (await isDuplicateComment(env, pageKey, nickname, content)) {
        return jsonResponse({ ok: false, error: "這則留言看起來已經送出過了，請稍後再試。" }, 409);
      }

      const throttle = await rateLimitComment(env, request, pageKey);
      if (!throttle.ok) {
        return jsonResponse({ ok: false, error: throttle.error }, 429);
      }

      const turnstile = await verifyTurnstile(env, request, body?.turnstileToken);
      if (!turnstile.ok) {
        return jsonResponse({ ok: false, error: turnstile.error }, 400);
      }

      const now = new Date().toISOString();
      // 留言內容只存純文字，前端顯示時用 textContent 呈現，避免把 HTML 或腳本注入頁面。
      await env.DB.prepare(`
        INSERT INTO comments (page_key, nickname, content, created_at, visible)
        VALUES (?, ?, ?, ?, 1)
      `).bind(pageKey, nickname, content, now).run();

      await bumpStats(env, pageKey, { comments: 1 });
      const snapshot = await getPageSnapshot(env, pageKey);
      return jsonResponse({ ok: true, pageKey, ...snapshot });
    }

    return jsonResponse({ ok: false, error: "不支援的 action。" }, 400);
  } catch (error) {
    console.error("engagement API error", error);
    return jsonResponse({
      ok: false,
      error: `伺服器處理留言時發生錯誤：${error instanceof Error ? error.message : String(error)}`
    }, 500);
  }
}

// ---- Admin：登入 / 登出 / 目前狀態 ----

async function handleAdminLogin(request, env) {
  if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD) {
    return jsonResponse({ ok: false, error: "Admin 帳密尚未設定完成，請先設定 ADMIN_USERNAME / ADMIN_PASSWORD。" }, 503);
  }

  const body = await readJson(request);
  const username = normalizeText(body?.username, 60);
  const password = String(body?.password || "");
  if (!username || !password) {
    return jsonResponse({ ok: false, error: "請輸入帳號密碼。" }, 400);
  }

  if (!checkCredentials(env, username, password)) {
    return jsonResponse({ ok: false, error: "帳號或密碼錯誤。" }, 401);
  }

  // 最簡化版本：登入 cookie 直接存密碼本身當作憑證，不額外簽章、不做 CSRF token。
  return jsonResponse({ ok: true, username }, 200, [
    ["set-cookie", buildSetCookie(SESSION_COOKIE, password, { maxAgeSeconds: SESSION_TTL_SECONDS, httpOnly: true })]
  ]);
}

function handleAdminLogout() {
  return jsonResponse({ ok: true }, 200, [
    ["set-cookie", buildClearCookie(SESSION_COOKIE)]
  ]);
}

function handleAdminMe(request, env) {
  const auth = requireAdmin(request, env);
  if (!auth.ok) return jsonResponse({ ok: false, error: auth.error }, auth.status);
  return jsonResponse({ ok: true, username: auth.username });
}

// ---- Admin：文章 CRUD ----

function handleAdminMutation(request, env) {
  if (!env.DB) return jsonResponse({ ok: false, error: "D1 綁定尚未設定。" }, 503);
  const auth = requireAdmin(request, env);
  if (!auth.ok) return jsonResponse({ ok: false, error: auth.error }, auth.status);
  return null; // 檢查都通過
}

async function handlePostsList(request, env) {
  if (!env.DB) return jsonResponse({ ok: false, error: "D1 綁定尚未設定。" }, 503);

  const url = new URL(request.url);
  const wantsAll = url.searchParams.get("status") === "all";

  if (wantsAll) {
    const auth = requireAdmin(request, env);
    if (!auth.ok) return jsonResponse({ ok: false, error: auth.error }, auth.status);
    const posts = await listPosts(env, { status: "all" });
    return jsonResponse({ ok: true, posts });
  }

  const posts = await listPosts(env, { status: "published" });
  return jsonResponse({ ok: true, posts });
}

async function handlePostGet(request, env, slug) {
  if (!env.DB) return jsonResponse({ ok: false, error: "D1 綁定尚未設定。" }, 503);

  const auth = await requireAdmin(request, env);
  const post = await getPostBySlug(env, slug, { includeDraft: auth.ok });
  if (!post) return jsonResponse({ ok: false, error: "找不到這篇文章。" }, 404);
  return jsonResponse({ ok: true, post });
}

async function handlePostCreate(request, env) {
  const denied = await handleAdminMutation(request, env);
  if (denied) return denied;

  try {
    const body = await readJson(request);
    const post = await createPost(env, body || {});
    return jsonResponse({ ok: true, post });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }, 400);
  }
}

async function handlePostUpdate(request, env, slug) {
  const denied = await handleAdminMutation(request, env);
  if (denied) return denied;

  try {
    const body = await readJson(request);
    const post = await updatePost(env, slug, body || {});
    return jsonResponse({ ok: true, post });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }, 400);
  }
}

async function handlePostDelete(request, env, slug) {
  const denied = await handleAdminMutation(request, env);
  if (denied) return denied;

  await deletePost(env, slug);
  return jsonResponse({ ok: true });
}

// ---- Admin：上傳 ----

async function handleAdminUpload(request, env) {
  const denied = await handleAdminMutation(request, env);
  if (denied) return denied;
  return handleUpload(request, env);
}

// ---- Admin：留言管理 ----

async function handleAdminCommentsList(request, env) {
  if (!env.DB) return jsonResponse({ ok: false, error: "D1 綁定尚未設定。" }, 503);
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return jsonResponse({ ok: false, error: auth.error }, auth.status);

  const url = new URL(request.url);
  const pageKey = normalizeText(url.searchParams.get("key"), 180);

  if (!pageKey) {
    const pageKeys = await listCommentPageKeys(env);
    return jsonResponse({ ok: true, pageKeys });
  }

  const comments = await listCommentsForAdmin(env, pageKey);
  return jsonResponse({ ok: true, comments });
}

async function handleAdminCommentVisibility(request, env, id) {
  const denied = await handleAdminMutation(request, env);
  if (denied) return denied;

  const body = await readJson(request);
  await setCommentVisibility(env, Number(id), Boolean(body?.visible));
  return jsonResponse({ ok: true });
}

// ---- 小工具：路由比對 ----

function matchRoute(pattern, pathname) {
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = pathname.split("/").filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;

  const params = {};
  for (let i = 0; i < patternParts.length; i += 1) {
    const p = patternParts[i];
    if (p.startsWith(":")) {
      params[p.slice(1)] = decodeURIComponent(pathParts[i]);
    } else if (p !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

async function router(request, env) {
  const url = new URL(request.url);
  const { pathname } = url;
  const method = request.method;

  if (pathname === "/api/engagement") {
    return handleEngagement(request, env);
  }

  if (pathname === "/api/admin/login" && method === "POST") {
    return handleAdminLogin(request, env);
  }
  if (pathname === "/api/admin/logout" && method === "POST") {
    return handleAdminLogout();
  }
  if (pathname === "/api/admin/me" && method === "GET") {
    return handleAdminMe(request, env);
  }

  if (pathname === "/api/posts" && method === "GET") {
    return handlePostsList(request, env);
  }
  if (pathname === "/api/admin/posts" && method === "POST") {
    return handlePostCreate(request, env);
  }

  const postSlugMatch = matchRoute("/api/posts/:slug", pathname);
  if (postSlugMatch && method === "GET") {
    return handlePostGet(request, env, postSlugMatch.slug);
  }

  const adminPostMatch = matchRoute("/api/admin/posts/:slug", pathname);
  if (adminPostMatch && method === "PUT") {
    return handlePostUpdate(request, env, adminPostMatch.slug);
  }
  if (adminPostMatch && method === "DELETE") {
    return handlePostDelete(request, env, adminPostMatch.slug);
  }

  if (pathname === "/api/admin/uploads" && method === "POST") {
    return handleAdminUpload(request, env);
  }

  if (pathname.startsWith("/api/files/") && method === "GET") {
    const key = decodeURIComponent(pathname.slice("/api/files/".length));
    return handleFileGet(env, key);
  }

  if (pathname === "/api/admin/comments" && method === "GET") {
    return handleAdminCommentsList(request, env);
  }

  const commentVisibilityMatch = matchRoute("/api/admin/comments/:id/visibility", pathname);
  if (commentVisibilityMatch && method === "POST") {
    return handleAdminCommentVisibility(request, env, commentVisibilityMatch.id);
  }

  return null;
}

export default {
  async fetch(request, env, context) {
    const routed = await router(request, env);
    if (routed) return routed;

    return env.ASSETS.fetch(request);
  }
};
