-- D1 資料表初始化：把瀏覽量、按讚數與留言資料集中保存。
CREATE TABLE IF NOT EXISTS page_stats (
  page_key TEXT PRIMARY KEY,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

-- 留言表只保存必要欄位，前端顯示時會用 textContent 避免 XSS。
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_key TEXT NOT NULL,
  nickname TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  visible INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_comments_page_id ON comments(page_key, id DESC);