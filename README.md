# personal-website
https://allencreeperqq.github.io/personal-website/
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
- 調整 `blog/post.html`：新增 Markdown 表格語法支援（`| ... |`），修正特定文章無法正常顯示表格的問題。
- 調整 `blog/post.html`：新增 PDF 內嵌預覽支援，可在 Markdown 使用 `!pdf[標題](路徑)` 直接顯示 PDF。
- 調整 `blog/standard.md` 與 `blog/posts/template.md`：補充 PDF 預覽寫法與範例。
- 調整 `blog/post.html`：放大 PDF 預覽框高度，提升單頁 PDF 閱讀可視範圍。
- 調整 `blog/post.html`：新增 Markdown 引用語法（`>`）支援，修正文章內引用段落未轉換顯示的問題。
- 調整 `index.html`：新增進站中央歡迎視窗，顯示「歡迎來到我的部落格」，點擊「開始瀏覽」後關閉。
- 調整 `index.html`：左側個人照片區改為實際載入 `blog/picture/profile pic.PNG` 個人頭像。
- 調整 `index.html`：首頁背景改為 `blog/picture/bg1.JPEG`，並提高主區塊透明度以淡淡顯示後方背景。
- 調整 `index.html`：重構背景渲染為固定背景圖層（含快取版本參數），修正部分瀏覽器看不到背景圖片的問題。
- 調整 `blog/post.html`：文章頁同步套用 `bg1.JPEG` 背景與較高透明度面板，修正文章頁背景未顯示問題。
- 調整 `index.html` 與 `blog/post.html`：改為 `body` 直接載入 `bg1.JPEG`（並保留淡色遮罩），提升背景顯示穩定性。
- 調整 `index.html` 與 `blog/post.html`：移除 `body::before` 疊層，改為單一 `body background` 並進一步降低遮罩濃度，提升背景可見度。
- 調整 `index.html` 與 `blog/post.html`：背景圖改用 PNG 版本 `bg1.png`，提升顯示相容性。
- 調整 `index.html` 與 `blog/post.html`：背景圖改為 `bg2.png`。
- 調整 `index.html` 與 `blog/post.html`：右下角新增固定標註「川崎工業區夜景 攝於2025/6/12 作者: 潘宇綸」。
- 調整 `index.html`：移除「右側區域預留給你持續更新內容。你可以把新作品、開發紀錄、學習心得都放在這裡。」提示文字。
- 調整 `index.html`：將「最新作品」區塊改為「最近在做甚麼」，並更新為四項近況內容。
- 調整 `index.html`：互換「自我介紹」與「最近在做甚麼」兩個區塊內容位置。
- 新增 `content/recent-doing.txt` 與 `content/self-intro.txt`：將「最近在做甚麼」與「自我介紹」改為可由 txt 外部維護。
- 調整 `index.html`：首頁載入時自動讀取上述 txt，修改文字不需再改 HTML。
- 調整 `blog/posts/`：修正文章檔名與 `index.json` 不一致問題（`2026-03-23-homemade NAS.md`），使新貼文可正常顯示於首頁清單。
