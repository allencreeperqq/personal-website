# personal-website

[https://allencreeperqq.github.io/personal-website/](https://allencreeperqq.github.io/personal-website/)

## Cloudflare 全端版本

這個版本把首頁與文章頁接到 Cloudflare Pages Functions，留言、按讚與瀏覽統計預留給 D1，並保留 KV 與 Turnstile 的擴充點。

### 初始化指令

1. 先完成網站部署；若要啟用留言、按讚與瀏覽統計，再建立 D1 資料庫並套用 migration：

```powershell
wrangler d1 migrations apply personal_website
```

1. 把實際 D1 database id 填回 [wrangler.json](wrangler.json) 的 `DB` 綁定後，再重新部署。

1. KV namespace 目前是選配；如果之後要加留言防刷限流，再把 namespace ID 補進 [wrangler.json](wrangler.json)。
1. 若要啟用留言防機器人，先在 Cloudflare 建立 Turnstile，再執行：

```powershell
wrangler secret put TURNSTILE_SECRET_KEY
```

1. 本機測試 Pages Functions：

```powershell
wrangler pages dev .
```

### 前端設定

- [index.html](index.html) 與 [blog/post.html](blog/post.html) 內的 `data-turnstile-site-key` 目前先保留空字串；若要正式啟用 Turnstile，請把 site key 填進去。
- 留言內容只以純文字儲存與顯示，前端以 `textContent` 呈現，避免 XSS。

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

### 2026-07-16

- 新增 [wrangler.json](wrangler.json)：把 Cloudflare Pages、D1 與 KV 的 IaC 設定集中管理，方便直接用 Wrangler 部署。
- 新增 [functions/api/engagement.js](functions/api/engagement.js)：提供匿名留言、按讚與瀏覽量統一 API，並在伺服器端完成 D1 SQL 綁定、留言長度限制與 Turnstile 驗證。
- 新增 [assets/engagement.js](assets/engagement.js) 與 [assets/engagement.css](assets/engagement.css)：讓首頁與文章頁共用同一套互動面板，瀏覽量只會在同一個分頁內去重一次，留言與按讚則即時回寫 D1。
- 新增 [migrations/0001_init.sql](migrations/0001_init.sql)：把 page stats 與留言資料表納入 migration，避免手動在後台建立表格。
- 調整 [index.html](index.html) 與 [blog/post.html](blog/post.html)：接上 Cloudflare 互動面板，首頁與單篇文章都能顯示瀏覽、按讚與匿名留言。
- 新增 [worker.js](worker.js)：補上 Worker entrypoint，讓 `wrangler deploy` / `wrangler versions upload` 能直接讀取靜態資產並轉發到 `/api/engagement`。
- 調整 [wrangler.json](wrangler.json)：先移除無效的 KV namespace placeholder，避免 Cloudflare 在部署階段因假 ID 阻擋上傳。
- 調整 [wrangler.json](wrangler.json)：補回正式 D1 `database_id`，讓留言與統計功能真的連到 Cloudflare D1。
- 修正 [wrangler.json](wrangler.json)：補齊 JSON 結構與逗號，修掉 `CommaExpected` 的部署前解析錯誤。
- 調整 [worker.js](worker.js)：把 D1 schema 建立改成逐條 `prepare(...).run()`，避免單次 schema 初始化失敗就讓留言 API 整段炸掉。
- 調整 [worker.js](worker.js)：在留言 API 外層加上 `try/catch` 與明確錯誤回應，讓前端可以看到實際失敗原因而不是只剩 HTTP500。
- 調整 [worker.js](worker.js)：在沒有 D1 綁定時回傳 503，讓靜態站與 API 的降級行為更清楚。
- 調整 [README.md](README.md)：補上 `wrangler d1 migrations apply`、`wrangler pages dev .`、Turnstile 設定與 D1 / KV 的操作流程，讓 IaC 部署步驟可以直接照文件執行。
- 調整 [assets/engagement.js](assets/engagement.js)：新增「重新整理」按鈕與最後同步時間，讓使用者能主動拉取最新留言與統計。
- 調整 [worker.js](worker.js)：新增 30 秒內相同留言去重，避免重複送出或網路重試造成雙寫。
- 調整 [assets/engagement.css](assets/engagement.css)：補上同步狀態與重新整理按鈕的樣式，讓互動區的資訊層級更清楚。
- 調整 [README.md](README.md)：把這次留言防重送、同步狀態與互動區可見性提升的細節一併記錄。
- 調整 [assets/engagement.js](assets/engagement.js)：移除互動區說明文案與 Turnstile 未設定提示文字，讓介面更精簡。
- 調整 [index.html](index.html) 與 [blog/post.html](blog/post.html)：把留言互動區改為獨立分區卡片，版面關係與既有內容區塊一致，不再有疊在其他區域上的視覺感。
- 調整 [index.html](index.html) 與 [blog/post.html](blog/post.html)：左下角新增「版本 / 最後更新時間」固定標註。

- 調整 `index.html`：`全部貼文列表` 新增分類下拉選單，可先選擇要預覽的文章分類。
- 調整 `index.html`：`全部貼文列表` 改為分頁顯示，每頁最多 8 篇文章，超過後可切換到下一頁，不會讓單一頁面超過 8 篇。
- 調整 `index.html`：分頁與分類篩選會同步重算目前列表，避免切換分類後仍停留在超出範圍的頁碼。
- 調整 `index.html`：歡迎視窗文字補上 Cloudflare 正常運作說明，並確認首頁與文章頁維持純前端、相對路徑 fetch 與 `.nojekyll` 的靜態部署相容方式，可正常部署到 Cloudflare Pages。

### 2026-05-10

- 調整 `blog/post.html`：新增 Markdown fenced code block（```）語法支援，文章內三反引號包覆的程式碼可正確以區塊樣式顯示。
- 調整 `blog/post.html`：新增程式碼區塊樣式（`pre.md-code-block`），提供獨立背景、邊框與橫向捲動，提升閱讀性。
- 調整 `blog/post.html`：新增 MathJax 設定與 CDN 載入（`tex-mml-chtml.js`），啟用 `$...$` 行內公式與 `$$...$$` 區塊公式渲染。
- 調整 `blog/post.html`：在行內 Markdown 解析加入公式 token 保護流程，避免公式內容被粗體/斜體等規則誤轉換。
- 調整 `blog/post.html`：文章內容插入後新增 MathJax typeset 觸發（含 clear + promise），修正動態載入貼文時公式不會自動顯示的問題。
- 調整 `index.html`：首頁「近期 Blog」改為最多顯示 4 篇，避免貼文區塊過長影響整體頁面高度；「全部貼文列表」仍維持完整顯示。

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
