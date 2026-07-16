let schemaReady;

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff"
};

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: JSON_HEADERS
  });
}

function normalizePageKey(rawKey) {
  const value = String(rawKey || "").trim().replace(/\r?\n/g, " ");
  if (!value) return "";
  return value.slice(0, 180);
}

function normalizeText(rawText, maxLength, fallback = "") {
  const value = String(rawText || "").replace(/\r\n/g, "\n").trim();
  if (!value) return fallback;
  return value.slice(0, maxLength);
}

function getClientIp(request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    ""
  );
}

function getUserAgent(request) {
  return request.headers.get("user-agent") || "";
}

async function hashText(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function ensureSchema(env) {
  if (!schemaReady) {
    // D1 綁定的 SQL 只需要初始化一次，後續請求直接沿用既有連線與表結構。
    schemaReady = env.DB.exec(`
      CREATE TABLE IF NOT EXISTS page_stats (
        page_key TEXT PRIMARY KEY,
        views INTEGER NOT NULL DEFAULT 0,
        likes INTEGER NOT NULL DEFAULT 0,
        comments INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        page_key TEXT NOT NULL,
        nickname TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        visible INTEGER NOT NULL DEFAULT 1
      );

      CREATE INDEX IF NOT EXISTS idx_comments_page_id ON comments(page_key, id DESC);
    `);
  }

  await schemaReady;
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function getPageKey(request, body) {
  const url = new URL(request.url);
  const rawKey = body?.key || url.searchParams.get("key") || "";
  return normalizePageKey(rawKey);
}

async function bumpStats(env, pageKey, delta) {
  const now = new Date().toISOString();
  const views = Number(delta.views || 0);
  const likes = Number(delta.likes || 0);
  const comments = Number(delta.comments || 0);

  // 這裡使用 D1 的 UPSERT，把單頁統計集中寫回同一筆資料，避免多表同步成本。
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
    // 本機或尚未完成 Turnstile 設定時，允許直接送出，方便先把功能跑通。
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
  const fingerprint = await hashText(`${getClientIp(request)}|${getUserAgent(request)}|${salt}`);
  const cacheKey = `comment:${pageKey}:${fingerprint}`;
  const blocked = await env.COMMENT_CACHE.get(cacheKey);
  if (blocked) {
    return { ok: false, error: "你送出留言太快了，請稍後再試。" };
  }

  await env.COMMENT_CACHE.put(cacheKey, String(Date.now()), { expirationTtl: 60 });
  return { ok: true };
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "GET" && request.method !== "POST") {
    return jsonResponse({ ok: false, error: "只支援 GET 與 POST。" }, 405);
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
}