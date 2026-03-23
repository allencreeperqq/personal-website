# personal-website

## 常見問題

### 出現 "Failed to fetch"

- 原因：用 `file://` 直接開啟 `index.html` 時，瀏覽器會阻擋 `fetch()` 讀取本機檔案。
- 解法 1：用 GitHub Pages 網址開啟（正式部署）。
- 解法 2：本機用伺服器啟動後再開啟。
- Python 範例：在專案根目錄執行 `py -m http.server 5500`，再進入 `http://localhost:5500/`。

### GitHub Pages 顯示 Blog 404

- 確認 `blog/posts/index.json` 列出的檔名，和 `blog/posts/` 內實際檔案完全一致。
- 專案根目錄已加入 `.nojekyll`，避免 GitHub Pages 的 Jekyll 處理導致 `.md` 原檔路徑失效。
- 若剛部署完成，請等 1~3 分鐘後重新整理頁面。

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
- 調整錯誤提示：針對 `file://` 直開情境提供清楚訊息，避免僅顯示 "Failed to fetch"。
- 調整 `index.html`：Blog 載入改為容錯模式，單篇 404 不會中斷整體顯示。
- 新增 `.nojekyll`：提升 GitHub Pages 對 Markdown 文章原始檔路徑的相容性。
- 調整 `index.html`：移除頁面中顯示的固定模板區塊。
- 新增 `blog/standard.md`：集中保存 Blog Markdown 固定模板與欄位規範。
- 調整 `blog/post.html`：新增 Markdown 圖片語法 `![alt](url)` 支援與圖片顯示樣式。
- 調整 `blog/posts/template.md` 與 `blog/standard.md`：補上圖片插入範例與使用規範。
- 調整 `blog/post.html`：修正圖片相對路徑解析基準，避免文章可讀但圖片載入失敗。
- 調整 `index.html`：在原模板區域新增「全部貼文列表」，以列表式顯示所有貼文。
- 調整 `index.html`：將「全部貼文列表」改為 issue 風格卡片條列，含摘要、日期與分類標籤。
- 調整 `index.html` 與 `blog/post.html`：升級為更有層次的暗色多彩主題（藍青綠與靛色漸層）。
- 調整 `index.html`：首頁貼文列表優先顯示文章 title（front matter 或內文標題），避免顯示 `.md` 檔名。
- 調整 `blog/post.html`：強化 front matter 解析，避免文章頁顯示 `--- ... ---` 內的 title/date 等欄位文字。
