# personal-website

## 版本歷程

### 2026-03-23
- 新增 `self.html`：建立個人介紹頁面，版型與 `sort_report/self.html` 相同。
- 調整 `self.html`：版面改為左側 1/3 個人介紹、右側 2/3 作品與 Blog 欄位。
- 調整 `self.html`：左側頂部改為正方形照片框預留區，取代「個人資料」文字標題。
- 調整檔名：將 `self.html` 更名為 `index.html`。
- 調整 `index.html`：將基本資料條列與自我介紹段落拆成不同格子，提升閱讀區隔。
- 調整 `index.html`：將「主推 AMANE KANATA」移至自我介紹格子最下方。
- 調整 `index.html`：新增 Blog 資料模板 `BLOG_POSTS` 與固定格式渲染，便於後續更新與統一輸出。
- 新增 `blog/posts/` Markdown 文章資料夾與 `blog/posts/index.json` 索引，首頁改為自動讀取 Markdown metadata。
- 新增 `blog/post.html`：以純前端方式渲染 Markdown 文章，確保可在 GitHub Pages 直接運作。