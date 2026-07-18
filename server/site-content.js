import { normalizeText } from "./http.js";

let siteContentSchemaReady;

// 首頁可編輯文字區塊：目前只有「最近在做甚麼」與「自我介紹」兩塊，
// 用白名單限制 key，避免 API 被拿來塞任意資料。
export const SITE_CONTENT_KEYS = ["recent-doing", "self-intro"];

const MAX_CONTENT_LENGTH = 4000;

export async function ensureSiteContentSchema(env) {
  if (!siteContentSchemaReady) {
    siteContentSchemaReady = (async () => {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS site_content (
          key TEXT PRIMARY KEY,
          content TEXT NOT NULL DEFAULT '',
          updated_at TEXT NOT NULL
        )
      `).run();
    })().catch((error) => {
      // 跟 posts schema 一樣：失敗時清掉快取，讓下一次請求可以重試。
      siteContentSchemaReady = undefined;
      throw error;
    });
  }

  await siteContentSchemaReady;
}

// 一次回傳所有區塊，首頁一個請求就能拿齊；沒設定過的 key 回傳空字串，
// 讓前端 fallback 到頁面內建的預設文字。
export async function getAllSiteContent(env) {
  await ensureSiteContentSchema(env);

  const result = await env.DB.prepare(`
    SELECT key, content FROM site_content
  `).all();

  const rows = Array.isArray(result?.results) ? result.results : [];
  const content = {};
  for (const key of SITE_CONTENT_KEYS) {
    content[key] = "";
  }
  for (const row of rows) {
    if (SITE_CONTENT_KEYS.includes(row.key)) {
      content[row.key] = String(row.content || "");
    }
  }
  return content;
}

export async function setSiteContent(env, key, rawContent) {
  if (!SITE_CONTENT_KEYS.includes(key)) {
    throw new Error("不支援的內容區塊 key。");
  }

  await ensureSiteContentSchema(env);

  // 允許存空字串：代表「清掉自訂內容、改用頁面預設文字」。
  const content = normalizeText(rawContent, MAX_CONTENT_LENGTH, "");
  const now = new Date().toISOString();

  await env.DB.prepare(`
    INSERT INTO site_content (key, content, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      content = excluded.content,
      updated_at = excluded.updated_at
  `).bind(key, content, now).run();

  return { key, content };
}
