import { toHex, normalizeText } from "./http.js";

let postsSchemaReady;

// 跟 comments/page_stats 一樣，schema 用 CREATE TABLE IF NOT EXISTS 在執行期自動補齊，
// 就算忘記先跑 migration，功能也不會直接壞掉。
export async function ensurePostsSchema(env) {
  if (!postsSchemaReady) {
    postsSchemaReady = (async () => {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS posts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          slug TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          category TEXT NOT NULL DEFAULT '未分類',
          excerpt TEXT NOT NULL DEFAULT '',
          content TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'draft',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          published_at TEXT
        )
      `).run();

      await env.DB.prepare(`
        CREATE INDEX IF NOT EXISTS idx_posts_status_published ON posts(status, published_at DESC)
      `).run();

      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS uploads (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          r2_key TEXT NOT NULL UNIQUE,
          kind TEXT NOT NULL,
          original_name TEXT NOT NULL DEFAULT '',
          size_bytes INTEGER NOT NULL DEFAULT 0,
          uploaded_at TEXT NOT NULL
        )
      `).run();
    })().catch((error) => {
      // 建表失敗的話，把快取清掉讓下一次呼叫重新嘗試，避免同一個 isolate 存活期間
      // 永遠卡在同一個失敗的 promise 上（例如第一次遇到暫時性的 D1 錯誤）。
      postsSchemaReady = undefined;
      throw error;
    });
  }

  await postsSchemaReady;
}

function generateSlug() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = toHex(crypto.getRandomValues(new Uint8Array(3)));
  return `${datePart}-${randomPart}`;
}

function serializePost(row) {
  if (!row) return null;
  return {
    slug: row.slug,
    title: row.title,
    category: row.category,
    excerpt: row.excerpt,
    content: row.content,
    status: row.status,
    date: (row.published_at || row.created_at || "").slice(0, 10),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at
  };
}

export async function listPosts(env, { status = "published" } = {}) {
  await ensurePostsSchema(env);

  let query = `SELECT slug, title, category, excerpt, content, status, created_at, updated_at, published_at FROM posts`;
  const binds = [];

  if (status !== "all") {
    query += ` WHERE status = ?`;
    binds.push(status);
  }

  query += ` ORDER BY COALESCE(published_at, created_at) DESC LIMIT 200`;

  const result = await env.DB.prepare(query).bind(...binds).all();
  const rows = Array.isArray(result?.results) ? result.results : [];
  return rows.map(serializePost);
}

export async function getPostBySlug(env, slug, { includeDraft = false } = {}) {
  await ensurePostsSchema(env);

  const row = await env.DB.prepare(`
    SELECT slug, title, category, excerpt, content, status, created_at, updated_at, published_at
    FROM posts
    WHERE slug = ?
  `).bind(slug).first();

  if (!row) return null;
  if (row.status !== "published" && !includeDraft) return null;
  return serializePost(row);
}

export async function createPost(env, data) {
  await ensurePostsSchema(env);

  const title = normalizeText(data?.title, 120);
  if (!title) throw new Error("文章標題不能為空。");

  const category = normalizeText(data?.category, 40, "未分類");
  const excerpt = normalizeText(data?.excerpt, 200, "");
  const content = normalizeText(data?.content, 20000);
  if (!content) throw new Error("文章內容不能為空。");

  const status = data?.status === "published" ? "published" : "draft";
  const now = new Date().toISOString();
  const slug = generateSlug();

  await env.DB.prepare(`
    INSERT INTO posts (slug, title, category, excerpt, content, status, created_at, updated_at, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(slug, title, category, excerpt, content, status, now, now, status === "published" ? now : null).run();

  return getPostBySlug(env, slug, { includeDraft: true });
}

export async function updatePost(env, slug, data) {
  await ensurePostsSchema(env);

  const existing = await getPostBySlug(env, slug, { includeDraft: true });
  if (!existing) throw new Error("找不到這篇文章。");

  const title = normalizeText(data?.title, 120, existing.title);
  const category = normalizeText(data?.category, 40, existing.category);
  const excerpt = normalizeText(data?.excerpt, 200, existing.excerpt);
  const content = normalizeText(data?.content, 20000, existing.content);
  const status = data?.status === "published" ? "published" : data?.status === "draft" ? "draft" : existing.status;

  const now = new Date().toISOString();
  const publishedAt = status === "published" ? (existing.publishedAt || now) : existing.publishedAt;

  await env.DB.prepare(`
    UPDATE posts
    SET title = ?, category = ?, excerpt = ?, content = ?, status = ?, updated_at = ?, published_at = ?
    WHERE slug = ?
  `).bind(title, category, excerpt, content, status, now, publishedAt, slug).run();

  return getPostBySlug(env, slug, { includeDraft: true });
}

export async function deletePost(env, slug) {
  await ensurePostsSchema(env);
  await env.DB.prepare(`DELETE FROM posts WHERE slug = ?`).bind(slug).run();
}

export async function recordUpload(env, { r2Key, kind, originalName, sizeBytes }) {
  await ensurePostsSchema(env);
  const now = new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO uploads (r2_key, kind, original_name, size_bytes, uploaded_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(r2Key, kind, normalizeText(originalName, 200, ""), Number(sizeBytes) || 0, now).run();
}

// 用 uploads 表累計已上傳的檔案大小，當作 R2 用量的估計值──這個 bucket 只拿來放
// 使用者透過後台上傳的檔案，所以這個總和跟實際 R2 用量應該相符（沒有計入舊文章
// 保留的靜態圖片/PDF，那些從來沒有進過 R2）。
export async function getStorageUsageBytes(env) {
  await ensurePostsSchema(env);
  const row = await env.DB.prepare(`
    SELECT COALESCE(SUM(size_bytes), 0) AS total FROM uploads
  `).first();
  return Number(row?.total || 0);
}
