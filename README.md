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

1. 本機測試：

```powershell
wrangler dev
```

> **這是 Cloudflare Workers（含靜態資產）專案，用 Workers Builds（Git 整合的自動建置）部署，不是 Cloudflare Pages。** 證據來自 Cloudflare 自動觸發的建置紀錄，裡面實際執行的是 `npx wrangler versions upload`——這是純 Workers 指令，Pages 專案不會跑這個。所以所有指令都用**不帶 `pages`** 的版本：`wrangler secret put`、`wrangler deploy`、`wrangler dev`。`wrangler.json` 用 `"main": "worker.js"` + `"assets": { "directory": "." }`；`worker.js` 是路由進入點，透過 `env.ASSETS.fetch(request)` 讀取靜態檔案。這個判斷中途來回改了兩次方向（詳見下方版本歷程），這次是根據 Cloudflare 實際的建置紀錄確認的，不是憑錯誤訊息片段推測。

### 前端設定

- [index.html](index.html) 與 [blog/post.html](blog/post.html) 內的 `data-turnstile-site-key` 目前先保留空字串；若要正式啟用 Turnstile，請把 site key 填進去。
- 留言內容只以純文字儲存與顯示，前端以 `textContent` 呈現，避免 XSS。

## Admin 後台（發文 / 上傳圖片與 PDF / 留言管理）

從 `feature/admin-forum-cms` 分支開始，網站多了一個純後台系統，讓你不用再手動加 `.md` 檔就能發文。這一套只在 Cloudflare Pages 部署上運作（GitHub Pages 沒有 serverless 後端，行為跟現有留言/按讚功能一樣）。

### 這是什麼

- `blog/admin/login.html`：admin 登入頁。
- `blog/admin/editor.html`：發文 / 編輯文章 / 上傳圖片與 PDF / 留言管理，都在同一頁，右上角還會顯示目前 R2 用量。
- **所有文章（含舊文章）都已經搬進 Cloudflare D1 的 `posts` 資料表**，首頁「全部貼文列表」單純從 D1 讀取；`blog/posts/*.md` 這種本地檔案的發文方式已經完全停用，不再需要手動加檔案、改 `index.json`。
- 舊文章裡的圖片／PDF 仍然是靜態檔案（保留在 `blog/posts/` 底下的子資料夾裡），內文的相對路徑已經改寫成從網站根目錄開始的絕對路徑，所以透過 D1 渲染時一樣能正確載入；新文章上傳的圖片/PDF 則存在 Cloudflare R2，透過 `/api/files/...` 對外提供讀取。
- 上傳功能內建 R2 免費額度（10GB）保護：用量達 90% 會在上傳成功的回應裡夾帶警示、後台也會顯示提醒，達 98% 會直接擋下新的上傳（避免真的超額被收費），細節見下方「R2 儲存空間保護」。

### 你需要做的事（第一次設定）

以下步驟只有你能做（需要你的 Cloudflare 帳號權限），每一步都附原因：

1. **建立 R2 bucket**（已完成 ✅，你建立的 bucket 叫 `personal-website`）

   ```powershell
   wrangler r2 bucket create personal-website
   ```

   為什麼：R2 是 Cloudflare 的物件儲存（類似 S3），適合放圖片/PDF 這種二進位檔案；D1 是關聯式資料庫，不適合塞大量檔案內容。`wrangler.json` 的 `r2_buckets` 綁定（`UPLOADS`）已經對應到 `personal-website` 這個 bucket 名稱。

2. **套用新的 D1 migration**

   ```powershell
   wrangler d1 migrations apply personal_website
   ```

   為什麼：套用 `migrations/0002_admin_cms.sql`（新增 `posts`／`uploads` 兩張表；就算忘記跑，程式在第一次請求時也會自動 `CREATE TABLE IF NOT EXISTS` 補齊）以及 `migrations/0003_seed_legacy_posts.sql`（把原本 `blog/posts/*.md` 的 10 篇舊文章一次性寫進 `posts` 表——這一個沒有自動補齊機制，一定要手動跑一次，不然首頁會看不到舊文章）。

3. **設定兩個 secret（帳號、密碼都是明文，你自己決定內容）**

   ```powershell
   wrangler secret put ADMIN_USERNAME
   wrangler secret put ADMIN_PASSWORD
   ```

   為什麼：Cloudflare secret 是加密保存、不會出現在 `wrangler.json` 或 git repo 裡的敏感資料存放方式；帳號密碼一樣不會進 git，但這裡是直接存明文比對，不做雜湊，設定起來最簡單，代價是安全性比雜湊版本低（見下方安全性摘要）。

4. **重新部署**

   ```powershell
   wrangler deploy
   ```

   為什麼：新的 R2 綁定與兩個 secret 都要部署後才會生效。這個專案接了 **Workers Builds**（Git 整合自動建置），push 到有連接的分支也會自動觸發建置部署，不一定要手動下這行；但剛設定完 secret 想立刻確認效果的話，手動跑一次最快。

### 安全性摘要（已簡化版本）

- 為了簡化設定，帳號密碼**直接以明文**存成 Cloudflare secret（`ADMIN_USERNAME` / `ADMIN_PASSWORD`），不做密碼雜湊；登入時純比對字串相等。secret 本身仍然加密存在 Cloudflare、不會進 git，但如果有人拿到你 Cloudflare 帳號的 secret 讀取權限，會直接看到明文密碼（雜湊版本則只會看到雜湊值）。
- 登入 cookie 直接使用密碼本身當作憑證值（`HttpOnly; Secure; SameSite=Strict`，效期 12 小時），不做額外簽章；要讓所有裝置一次登出，換掉 `ADMIN_PASSWORD` 即可（同時也代表登入密碼變了）。
- **沒有 CSRF token 保護**、**沒有登入失敗次數限制**，這兩項防護已依需求拿掉；`SameSite=Strict` cookie 本身仍能擋掉大部分瀏覽器的跨站請求偽造情境，但保護力比原本的 double-submit CSRF 弱。
- 上傳檔案的驗證沒有變：仍會檢查實際檔案內容的 magic bytes（不是只看副檔名），只接受 PNG/JPG/GIF/WEBP/PDF，圖片上限 5MB、PDF 上限 20MB，檔名一律換成隨機字串存進 R2。
- 公開的 `GET /api/posts`、`GET /api/posts/:slug` 一律不會回傳草稿（`status = 'draft'`），只有帶正確登入 cookie 的後台請求看得到草稿，這一項沒有變。
- 文章 markdown 渲染沿用既有 `blog/post.html` 「先跳脫 HTML 再套版型」的邏輯（`assets/markdown-render.js`），本來就會擋掉 `<script>`／HTML 注入，這一項也沒有變。
- 這是你主動選擇的簡化（拿掉密碼雜湊、CSRF、登入速率限制），適合單人使用的個人網站；如果之後想要更高的安全性，隨時可以再加回來。

### R2 儲存空間保護

- [server/uploads.js](server/uploads.js) 的 `handleUpload` 每次上傳前，會先用 [server/posts.js](server/posts.js) 的 `getStorageUsageBytes()`（`SELECT SUM(size_bytes) FROM uploads`）估算目前用量，這個估算只涵蓋透過後台上傳、真的存進 R2 的檔案，不含舊文章保留的靜態圖片/PDF（那些從來沒有進過 R2，不佔用額度）。
- **90%（9GB）**：上傳仍會成功，但回應會多帶一個 `warning` 訊息，後台編輯器會把它顯示在儲存/上傳的提示區；右上角的「R2 用量」也會變成黃色。
- **98%（約 9.8GB）**：新的上傳會直接被擋下（回傳 503 + 清楚的錯誤訊息），保留 2% 安全緩衝，避免真的衝到 10GB 上限被 Cloudflare 收費；已經上傳成功的檔案、既有文章、留言、按讚等其他功能完全不受影響，只有「上傳新檔案」這個動作被鎖住。
- 新增 `GET /api/admin/storage`（需要登入）回傳 `{ usedBytes, totalBytes, percent, isWarning, isStopped }`，後台頁面載入時與每次上傳完成後都會呼叫，即時更新右上角的用量顯示。
- 如果之後想調整門檻，改 [server/uploads.js](server/uploads.js) 裡的 `WARN_THRESHOLD_BYTES` / `STOP_THRESHOLD_BYTES` 兩個常數即可。

### 已知限制 / 之後可以做的事

- `functions/api/engagement.js` 這份舊留言 API 邏輯已經確認是死碼（正式環境走的是 [worker.js](worker.js) 的 Workers Advanced Mode 路由，`functions/` 目錄根本不會被執行），已經整個刪除，不用再擔心混淆。
- 目前只做了「單一 admin 帳號」，沒有多使用者資料表；如果之後想開放多人共同管理，需要另外設計。
- 本機的自動化測試是用假的 D1/R2/KV 模擬物件跑的（見下方版本歷程），還沒有連到你真實的 Cloudflare 資源；上面 4 個步驟做完後，還是建議用 `wrangler dev`（wrangler 支援本機模擬 D1/R2）跑一次登入 → 發文 → 上傳圖片/PDF → 留言管理的完整流程，確認跟真實 D1/R2 接起來也正常。

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

- 調整 [index.html](index.html)：全部貼文列表新增分類下拉選單，可先選擇要預覽的文章分類。
- 調整 [index.html](index.html)：全部貼文列表改為分頁顯示，每頁最多 8 篇文章，超過後可切換到下一頁，不會讓單一頁面超過 8 篇。
- 調整 [index.html](index.html)：分頁與分類篩選會同步重算目前列表，避免切換分類後仍停留在超出範圍的頁碼。
- 調整 [index.html](index.html)：歡迎視窗文字補上 Cloudflare 正常運作說明，並確認首頁與文章頁維持純前端、相對路徑 fetch 與 `.nojekyll` 的靜態部署相容方式，可正常部署到 Cloudflare Pages。

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

### 2026-07-16（追加）

- 修正 [index.html](index.html)：`.page-layout` 原本 `margin: 0`，在寬螢幕（超過 1280px）下內容會整塊貼齊左側，無法置中。改為 `margin: 0 auto` 後，主要內容會依視窗寬度置中顯示，不同裝置螢幕大小切換時體驗更一致。（`blog/post.html` 的 `.post-wrap` 原本就已是 `margin: 0 auto`，本次未調整。）
- 調整 [assets/engagement.css](assets/engagement.css)：留言互動區 `.cf-engagement__body` 原本是「表單在左、留言列表在右」的雙欄扁平版面（`minmax(280px, 360px) minmax(0, 1fr)`），改為單欄堆疊（表單在上、留言列表在下），並限制寬度為 `min(640px, 100%)` 置中顯示，讓整體區塊改為向 y 軸延伸的長版面，不再是左右扁胖的排列。
- 調整 [assets/engagement.css](assets/engagement.css)：`.cf-comments__list` 新增 `min-height: 200px`、`max-height: 640px` 與 `overflow-y: auto`，留言列表本身也會隨內容向下延伸並在超過高度上限時可捲動，強化「向下延伸較長」的視覺效果。
- 調整 [assets/engagement.css](assets/engagement.css)：移除原本在 `max-width: 820px` 媒體查詢中把雙欄改單欄的規則（`grid-template-columns: 1fr`），因為版面已預設為單欄，該規則已無作用，僅保留該媒體查詢下的按鈕/狀態列對齊調整。
- 說明：本次為純 CSS 版面調整，未變更留言、按讚、瀏覽量相關的 API 邏輯（[assets/engagement.js](assets/engagement.js)、[functions/api/engagement.js](functions/api/engagement.js)）。因本機環境沒有可用的瀏覽器截圖工具，已用 `py -m http.server 5500` 啟動本機伺服器確認頁面可正常載入（HTTP 200），但未能實際用瀏覽器肉眼核對置中與留言區版面在各種螢幕寬度下的呈現，建議部署後在實機/瀏覽器開發者工具的裝置模擬器下再次確認。

### 2026-07-16（第二次追加：留言區改為橫向延伸、左側大格補上互動小工具）

- 調整 [assets/engagement.css](assets/engagement.css)：依需求把留言區從「單欄向下延伸」改回「向 x 軸延伸」的版面。`.cf-engagement__body` 改回雙欄（左窄欄放留言表單、右側寬欄放留言列表），並移除先前限制寬度 `min(640px, 100%)` 置中的設定，改用 `width: 100%` 撐滿卡片可用寬度。
- 調整 [assets/engagement.css](assets/engagement.css)：`.cf-comments__list` 從原本的「垂直清單 + 向下捲動（`overflow-y: auto`）」改為「水平排列 + 向右捲動（`display: flex; overflow-x: auto;`）」，並加上 `scroll-snap-type: x proximity` 讓橫向捲動時會自然停在每一則留言卡片上；同時補上符合暗色主題的自訂捲軸樣式（`::-webkit-scrollbar` 系列 + `scrollbar-color`）。
- 調整 [assets/engagement.css](assets/engagement.css)：`.cf-comment` / `.cf-empty` 改為固定寬度（`width: min(280px, 78vw)`）、`flex: 0 0 auto` 的橫向卡片，並讓每張卡片可以 `scroll-snap-align: start` 對齊；`.cf-comment__content` 加上 `max-height: 220px; overflow-y: auto;`，避免單則過長留言把卡片撐得過高、破壞橫向排版的一致性。
- 調整 [assets/engagement.css](assets/engagement.css)：`max-width: 820px` 的媒體查詢中補回 `.cf-engagement__body { grid-template-columns: 1fr; }`，讓手機等窄螢幕下留言表單與留言列表改回上下堆疊，橫向捲動的留言卡片機制在窄螢幕仍保留、體驗更自然。
- 調整 [index.html](index.html)：`.intro-card`（左側「最近在做甚麼」大格）改為 `display: flex; flex-direction: column;`，讓卡片內容可以用 flex 版面控制留白分佈，為新增小工具鋪路。
- 新增 [index.html](index.html)：在左側大格的社群連結區塊（`.social-box`）與「回到主選單」按鈕之間，新增 `.fun-box`「今日抽籤」小工具（`flex: 1` 吃掉卡片下方原本空曠的留白，並讓文字垂直置中），內容是點擊「再抽一次」按鈕後，隨機顯示一句與吉他、K-ON!、貓咪、義大利文學習、vibe coding 等個人興趣相關的趣味語錄/運勢小語，並用 `localStorage` 記住「已抽次數」，讓左側大格不再只是空白區域，同時也讓網站多一點互動性與個人特色。
- 說明：本次同樣是純前端 CSS／少量 JS 調整，`.fun-box` 抽籤功能完全在瀏覽器端運作（陣列隨機挑選 + `localStorage` 計數），不會呼叫 `/api/engagement`，也不影響既有留言、按讚、瀏覽量的 D1 資料流程。已用 `py -m http.server 5500` 確認 `index.html` 可正常回應（HTTP 200）且新按鈕 `#fun-quote-roll` 有正確輸出在 HTML 中，但同樣受限於本機沒有瀏覽器截圖工具，未能實際在瀏覽器中點擊測試抽籤動畫與留言區橫向捲動的視覺效果，建議之後實機確認。

### 2026-07-16（第三次追加：留言互動區改為橫跨整個版面）

- 調整 [index.html](index.html)：原本「留言互動區」是 `content-card` 內 `content-grid` 底下的一個 `.content-block.full-width`，所以最多只會撐滿 `content-card` 自己那一欄（`page-layout` 兩欄式版面裡的右欄），左側「最近在做甚麼」大格的寬度並沒有被留言區用到。這次把留言區從 `content-grid` 裡抽出來，改成 `page-layout`（`<main>`）底下的第三個獨立區塊 `<section class="content-card engagement-card">`，直接橫跨左右兩欄。
- 調整 [index.html](index.html)：新增 `.engagement-card { grid-column: 1 / -1; min-height: 0; }`，讓這個新區塊在 `page-layout` 的 grid 版面中強制跨滿所有欄（目前是左右兩欄），呈現在「最近在做甚麼」與「作品與 Blog」兩個大格下方、橫跨整個版面寬度的獨立留言互動區；在 `max-width: 980px` 的版面（`page-layout` 變成單欄）下，`grid-column: 1 / -1` 仍然成立，效果等同於原本的滿版寬度，不會有額外相容性問題。
- 說明：留言互動區的 API 串接（`data-page-key="page:index"` 等）與版面內部樣式（雙欄表單/留言列表、留言卡片橫向捲動）完全沒有變動，這次純粹是調整它在整個頁面 grid 版面中的擺放位置與跨欄範圍。已用 `py -m http.server 5500` 確認 `index.html` 可正常回應（HTTP 200）且 `.engagement-card` 有正確輸出在 HTML 中，但受限於本機沒有瀏覽器截圖工具，未能實際在瀏覽器中核對橫跨版面後的視覺呈現，建議之後實機/不同螢幕寬度下再次確認。

### 2026-07-16（第四次追加：留言互動區改為扁平、降低整體高度）

- 調整 [index.html](index.html)：`.engagement-card` 補上較小的 `padding: 16px 22px`（原本沿用 `.content-card` 的 `padding: 28px`），並把區塊標題字級縮小為 `1.15rem`，讓橫跨版面的留言互動區不再佔用過多的上下留白。
- 調整 [assets/engagement.css](assets/engagement.css)：`.cf-engagement` 的外距與內距從 `margin-top: 18px; padding: 18px; gap: 14px;` 收斂為 `margin-top: 12px; padding: 14px; gap: 10px;`；`.cf-engagement__form` 與 `.cf-comments` 的內距從 `14px` 收斂為 `10px`，整體卡片高度變得更緊湊、更扁平。
- 調整 [assets/engagement.css](assets/engagement.css)：`.cf-field textarea` 從 `min-height: 110px` 改為明確的 `height: 60px; min-height: 44px;`，讓留言輸入框不再是預設偏高的大方塊，同時搭配 [assets/engagement.js](assets/engagement.js) 把 `<textarea>` 的 `rows` 從 `5` 降為 `2`，避免瀏覽器依 `rows` 撐出比 CSS 設定還高的輸入框。
- 調整 [assets/engagement.css](assets/engagement.css)：留言卡片 `.cf-comment` / `.cf-empty` 寬度從 `min(280px, 78vw)` 收斂為 `min(240px, 74vw)`、內距從 `12px` 降為 `10px`；卡片內文字 `.cf-comment__content` 的 `max-height` 從 `220px` 大幅降到 `110px`（同時字級微調為 `0.92rem`），讓每張橫向留言卡片變矮，不再像原本一樣是又高又占版面的一大塊。
- 說明：本次是純粹的高度／間距收斂調整，沒有更動留言互動區既有的橫跨版面位置、雙欄表單＋橫向捲動留言列表的版面邏輯，也沒有更動 API 邏輯。已用 `py -m http.server 5500` 確認 `index.html` 仍可正常回應（HTTP 200），但同樣受限於本機沒有瀏覽器截圖工具，未能實際核對扁平化後的視覺高度是否符合預期，建議之後實機瀏覽確認。

### 2026-07-16（第五次追加：移除「今日抽籤」下方的回到主選單按鈕，保留留白）

- 調整 [index.html](index.html)：移除 `.fun-box`（今日抽籤）下方原本的 `<div class="actions"><a class="back-link" href="index.html">回到主選單</a></div>`。這顆按鈕的連結原本就是指回 `index.html` 自己（首頁連回首頁），已無實際作用；移除後 `.fun-box` 仍維持 `flex: 1` 撐滿左側大格下方空間，按鈕原本佔用的位置直接變成留白，不再另外放東西。
- 調整 [index.html](index.html)：一併移除因此變成沒有任何元素使用的 `.actions`、`.back-link`、`.back-link:hover` 三個 CSS 規則，以及 `max-width: 560px` 手機版媒體查詢裡專屬於 `.back-link` 的寬度調整規則，避免留下用不到的死樣式。
- 說明：純刪除操作，未新增任何元素或邏輯。已用 `py -m http.server 5500` 確認 `index.html` 仍可正常回應（HTTP 200），且輸出的 HTML 中已完全找不到 `back-link` / 「回到主選單」字樣，確認移除乾淨；同樣受限於本機沒有瀏覽器截圖工具，未能實際檢視移除後左側大格留白的視覺比例，建議之後實機瀏覽確認。

### 2026-07-16（第六次追加：把 kanatachan 吉祥物做進「今日抽籤」小工具）

- 參考本機另一份專案 `D:\coding\cpp_2026 CYEE\0309\sort_report\index.html` 右下角的浮動吉祥物元件（`.mascot-widget` / `.mascot-bubble` / `.mascot-image`，點擊或按 Enter/空白鍵會切換歡迎訊息），把同一套「吉祥物 + 對話泡泡」互動模式移植進本專案 [index.html](index.html) 的「今日抽籤」小工具（`.fun-box`）裡。
- 新增 [assets/kanatasochan.png](assets/kanatasochan.png)：從上述參考專案複製過來的 kanatachan 吉祥物圖片（該專案原始檔為 `kanatasochan_6.png`），兩份專案皆為潘宇綸本人的個人作品，圖片由本人重複使用於自己的專案之間。
- 調整 [index.html](index.html)：新增 `@keyframes mascotFloat`（吉祥物上下漂浮動畫），並新增 `.fun-mascot`、`.fun-mascot-image` 兩個 CSS 類別；把原本單純的 `.fun-quote` 文字段落，改造成吉祥物頭上的「對話泡泡」樣式（邊框、底色、陰影），吉祥物圖片本身則套用漂浮動畫與 `drop-shadow`。
- 調整 [index.html](index.html)：`.fun-box` 內部原本只有一段文字，現在改為「對話泡泡文字＋kanatachan 圖片」的 `.fun-mascot` 區塊（`role="button" tabindex="0"`，可滑鼠點擊也可用 Tab 鍵移到吉祥物身上後按 Enter / 空白鍵觸發），下方仍保留原本的「再抽一次」按鈕，兩種操作方式共用同一組抽籤邏輯。
- 調整 [index.html](index.html)：JS 端把原本寫在按鈕點擊事件裡的抽籤邏輯抽成獨立的 `rollQuote()` 函式，並加上 `rolling` 旗標避免連續快速點擊時動畫互相打斷；`rollQuote()` 同時綁定到「再抽一次」按鈕與吉祥物本身（`click` 與 `keydown`），點吉祥物或按按鈕效果一致，都會更新對話泡泡文字、已抽次數與 `localStorage` 計數。
- 說明：吉祥物互動同樣完全在瀏覽器端運作，不會呼叫任何後端 API。已用 `py -m http.server 5500` 確認 `index.html`（HTTP 200）與新圖片 `assets/kanatasochan.png`（HTTP 200）都能正常載入，且 `.fun-mascot` 相關元素有正確輸出在 HTML 中；受限於本機沒有瀏覽器截圖工具，未能實際點擊測試漂浮動畫與對話泡泡切換效果，建議之後實機瀏覽確認。

### 2026-07-16（第七次追加：首頁瀏覽器分頁標題改名）

- 調整 [index.html](index.html)：`<title>` 從「自我介紹」改為「艾倫の發糧倉」，瀏覽器分頁 / 書籤上顯示的網站名稱會跟著更新，頁面內容與其他版面、功能均未變動。

### 2026-07-16（第八次追加：Admin 論壇化 —— 後台發文、上傳、留言管理）

依照 `todo.txt` 的需求，這次在新分支 `feature/admin-forum-cms`（從既有的 `後端匿名留言功能api建置` 分支切出，`main` 完全未受影響）上，把網站從「純靜態 .md 文章」擴充成「有 admin 帳號可以直接在網站上發文、管理留言」的系統。詳細設定步驟與安全性摘要見上方新增的「Admin 後台」章節，這裡只記錄實際的檔案異動：

- 新增 [migrations/0002_admin_cms.sql](migrations/0002_admin_cms.sql)：新增 `posts`（文章）與 `uploads`（上傳紀錄）兩張 D1 資料表；同樣邏輯也內建在執行期自動 `CREATE TABLE IF NOT EXISTS`（見 `server/posts.js`），跟現有留言功能的 schema 建置方式一致。
- 調整 [wrangler.json](wrangler.json)：新增 `r2_buckets` 綁定（`UPLOADS` → `personal-website-uploads`），供圖片/PDF 上傳使用；bucket 需使用者自行用 `wrangler r2 bucket create` 建立。
- 新增共用後端模組（`worker.js` 用 ES module import 方式載入，不需要額外建置流程）：
  - [server/http.js](server/http.js)：`jsonResponse`／`readJson`／`normalizeText`／cookie 讀寫／base64url／hex 編碼等共用工具（部分從 `worker.js` 原本的邏輯抽出）。
  - [server/auth.js](server/auth.js)：PBKDF2 密碼驗證、HMAC 簽名 session token 簽發/驗證、CSRF 雙重送出 token 檢查、`requireAdmin`、登入速率限制（沿用既有 `COMMENT_CACHE` KV，未設定時自動略過不擋）。
  - [server/posts.js](server/posts.js)：文章 CRUD（`listPosts`／`getPostBySlug`／`createPost`／`updatePost`／`deletePost`），slug 由伺服器產生（`YYYYMMDD-隨機6碼`），不從中文標題轉寫。
  - [server/uploads.js](server/uploads.js)：上傳檔案處理，檢查檔案 magic bytes（PNG/JPG/GIF/WEBP/PDF）、大小上限（圖片 5MB、PDF 20MB），寫入 R2 時用隨機檔名；另外提供 `/api/files/:key` 讀取端點。
  - [server/comments-admin.js](server/comments-admin.js)：留言管理用的查詢（含隱藏留言）與可見度切換。
- 調整 [worker.js](worker.js)：新增一個小型路由比對函式，掛上以下新端點（全部維持既有 `jsonResponse`／`cache-control: no-store`／`x-content-type-options: nosniff` 慣例）：
  `POST /api/admin/login`、`POST /api/admin/logout`、`GET /api/admin/me`、
  `GET /api/posts`、`GET /api/posts/:slug`、
  `POST /api/admin/posts`、`PUT /api/admin/posts/:slug`、`DELETE /api/admin/posts/:slug`、
  `POST /api/admin/uploads`、`GET /api/files/:key`、
  `GET /api/admin/comments`、`POST /api/admin/comments/:id/visibility`。
  既有的 `/api/engagement` 邏輯完全沒有更動，只是被搬到同一個路由函式裡統一分派。
- 新增 [assets/markdown-render.js](assets/markdown-render.js)：把原本寫死在 `blog/post.html` inline `<script>` 裡的 markdown 解析邏輯（front matter、行內語法、表格、PDF 內嵌、程式碼區塊等，約 300 行）抽成共用模組（`window.MarkdownRender`），供文章頁與後台編輯器共用同一套渲染規則，避免預覽跟正式顯示結果不一致。
- 調整 [blog/post.html](blog/post.html)：改為呼叫 `assets/markdown-render.js`；新增 `?source=db&slug=...` 讀取模式（呼叫 `GET /api/posts/:slug`），原本的 `?file=xxx.md` 靜態檔模式維持不變；後台文章的留言/瀏覽/按讚 page key 改用 `post:db:{slug}`，靜態文章維持原本的 `post:posts/{檔名}`，兩者不會互相衝突。
- 新增 [blog/admin/login.html](blog/admin/login.html)：admin 登入頁，成功後導向 `editor.html`。
- 新增 [blog/admin/editor.html](blog/admin/editor.html)：後台主頁面，整合「發文/編輯表單＋即時 markdown 預覽」「插入圖片/PDF 按鈕（上傳後自動插入游標位置）」「文章管理列表（編輯／刪除）」「留言管理（依頁面 key 顯示留言並可切換隱藏/顯示）」與「登出」。
- 調整 [index.html](index.html)：`loadMarkdownPosts()` 新增一段容錯的 `fetch('/api/posts?status=published')`，成功時把 D1 文章併入既有的靜態文章清單一起排序顯示；抓不到（非 Cloudflare 環境、D1 尚未設定等）時安靜忽略、只顯示靜態文章，不影響現有行為。
- 新增 [scripts/hash-password.mjs](scripts/hash-password.mjs)：本機用的密碼雜湊小工具（純 Node 內建 `crypto`，無外部套件），用來產生 `ADMIN_PASSWORD_HASH` secret 的值，密碼明文完全不會離開執行者自己的電腦。
- 說明：這次沒有 Cloudflare 帳號權限可以直接操作 D1/R2/secrets，所有新程式碼都只在本機做過語法層面的檢查與手動走查（本機沒有安裝 Node.js，無法執行 `node --check`，改以人工覆核 import/export、括號配對與路由邏輯）；沒有安裝瀏覽器自動化工具，也沒辦法端對端啟動 `wrangler pages dev` 實際測試登入/發文/上傳流程。上方「Admin 後台」章節列出的 5 個設定步驟與驗證流程，需要你本機依序執行後才能確認整套功能真的可用，這點如實告知。

### 2026-07-16（第九次追加：安裝 Node.js 後補做完整測試，並修正一個真的測出來的 bug）

使用者安裝好 Node.js、建立好 R2 bucket（實際名稱是 `personal-website`，不是先前假設的 `personal-website-uploads`）並已有既有 D1 之後，回頭把上一輪「沒辦法測試」的部分實際補測了一次：

- 調整 [wrangler.json](wrangler.json)：`r2_buckets` 的 `bucket_name` 從 `personal-website-uploads` 改成使用者實際建立的 `personal-website`，並同步修正 [README.md](README.md) 裡對應的建立指令與說明。
- 用 `node --check` 對 `server/*.js`、`worker.js`、`assets/markdown-render.js`、`scripts/hash-password.mjs` 全部重新做語法檢查，全數通過。
- 在 scratchpad 寫了一組不進 repo 的測試腳本，用假的 D1／R2／KV 物件模擬 Cloudflare 環境，實際呼叫（而不只是讀程式碼猜測）：
  - `server/auth.js`：PBKDF2 密碼雜湊正確/錯誤密碼判斷、session token 簽發與驗證（含被竄改、換了 `SESSION_SECRET` 這兩種偽造情境都會被拒絕）、CSRF token 比對。
  - `server/posts.js`：建立/更新/發佈/刪除文章、草稿不會被公開查詢看到、admin 查詢看得到草稿。
  - `worker.js` 整條路由：模擬「沒設定 admin secret → 503」「密碼錯 → 401」「登入成功 → 拿到 session + CSRF 兩個 cookie」「帶 cookie 但沒帶 CSRF header 建立文章 → 403」「登入後成功建立文章 → 公開 `/api/posts` 看得到」「沒登入呼叫 DELETE → 401」，共 28 項全部通過。
  - `assets/markdown-render.js`：確認標題／清單／表格／程式碼區塊／圖片／PDF 內嵌／引用都能正確轉換，特別驗證了 `<script>alert(1)</script>` 這種嘗試注入的文字會被跳脫成純文字而不是被當成 HTML 執行。
  - `server/uploads.js`：確認合法 PNG 會通過並存成隨機檔名、把純文字檔改副檔名偽裝成 `.png` 會被 magic bytes 檢查擋下、沒有 R2 綁定時回 503、`../../etc/passwd` 這種路徑穿越的檔案 key 會被拒絕。
  - 以上總共 44 項測試全部通過。
- **在補測 `scripts/hash-password.mjs` 時，真的測出一個 bug 並修好了**：原本的寫法是每次詢問密碼都重新 `createInterface()` 開一個新的 readline 介面，結果在（測試用的）非互動輸入情境下，第二次詢問「再輸入一次確認」永遠讀不到輸入、卡住不會印出結果。改成整支腳本只建立一個 readline 介面、用 `rl[Symbol.asyncIterator]()` 依序讀兩行輸入之後，重新測試「密碼相符」「密碼不相符」「密碼留空」三種情境都能正確印出訊息或產生 hash，並且額外驗證了產生出來的 hash 字串丟進 `server/auth.js` 的 `verifyPassword()` 真的能正確判斷密碼對錯。
- 說明：因為工具限制，這次的測試都是用模擬物件（假的 D1/R2/KV）跑的，還沒有連到你真實的 Cloudflare 資源，也還沒有實際打開瀏覽器點過登入頁/後台頁面；`README.md`「已知限制」段落已同步更新，建議你依序做完設定步驟後，用 `wrangler pages dev .` 接上真實模擬環境跑一次完整流程。

### 2026-07-17（第十次追加：首頁加一個 Admin 登入按鈕，不用再記後台網址）

原本要登入後台得直接手動輸入 `blog/admin/login.html` 網址，使用者覺得這樣「登入跟密碼用得太複雜」，希望改成首頁直接有一個按鈕、按下去就能簡單輸入帳號密碼登入。後端的密碼雜湊／session／CSRF 機制本身沒有變動（這些是一次性設定好就不用再管的部分），這次只調整「怎麼進到登入畫面」這件事：

- 調整 [index.html](index.html)：右上角新增一顆小小的「🔑 Admin 登入」按鈕（`.admin-login-button`），樣式走低調的膠囊按鈕，不會搶走一般訪客的注意力。
- 調整 [index.html](index.html)：新增一個登入用的彈出視窗（`#adminLoginModal`），沿用既有歡迎視窗（`.welcome-modal`）的樣式與開關邏輯，裡面就是帳號／密碼兩個欄位＋登入按鈕，點右上角按鈕就會直接彈出，不用跳頁。
- 調整 [index.html](index.html)：新增 `initAdminLogin()`，處理開窗／關窗（含點擊背景關閉）、表單送出時呼叫既有的 `POST /api/admin/login`（`credentials: "include"`，帳密驗證、session/CSRF cookie 簽發都還是原本 `worker.js` 那一套），登入成功會直接導到 `blog/admin/editor.html`；失敗會在視窗內顯示錯誤訊息（例如密碼錯誤、登入太頻繁被擋等）。
- 說明：`blog/admin/login.html` 這個獨立頁面沒有刪除，直接用網址進去一樣可以登入；這次只是在首頁多開一個更順手的入口。純前端調整，沒有動到 `worker.js`／`server/*` 任何後端邏輯，已用 `py -m http.server` 確認頁面能正常載入、新按鈕與視窗元素都有正確輸出在 HTML 中；受限於本機沒有瀏覽器工具，還沒有實際點擊測試登入視窗的彈出與登入流程，建議之後在瀏覽器裡點一次確認。

### 2026-07-17（第十一次追加：依需求拿掉密碼雜湊配置，登入機制整個改回從簡）

使用者表示不需要密碼雜湊那一整套設定，帳號密碼要改回最簡單的方式；確認過後選擇「整個登入機制都簡化」（拿掉密碼雜湊、session 簽章、CSRF、登入速率限制），不是只拿掉雜湊而已。這是一次會降低安全性、但换來設定與程式碼都更少的主動選擇，取捨已經寫進 README 的「安全性摘要」段落，這裡記錄實際改了什麼：

- 改寫 [server/auth.js](server/auth.js)：整個檔案從「PBKDF2 密碼驗證＋HMAC 簽名 session token＋CSRF token 簽發/驗證＋登入速率限制」（原本約 140 行）簡化成「`checkCredentials()` 直接比對 `env.ADMIN_USERNAME`／`env.ADMIN_PASSWORD` 明文字串、`requireAdmin()` 檢查 `admin_session` cookie 是否等於 `env.ADMIN_PASSWORD`」（約 25 行）。不再需要 `SESSION_SECRET`，也拿掉了 `verifyPassword`、`createSessionToken`、`verifySessionToken`、`issueCsrfToken`、`requireCsrf`、`checkLoginRateLimit` 等函式。
- 調整 [worker.js](worker.js)：`handleAdminLogin` 改成直接呼叫 `checkCredentials()`；登入成功只簽發一個 `admin_session` cookie（值就是密碼本身），不再簽發 `admin_csrf` cookie；`handleAdminMutation`（保護所有會寫入資料的後台 API）拿掉 `requireCsrf` 檢查，只保留登入 cookie 驗證。
- 調整 [blog/admin/editor.html](blog/admin/editor.html)：拿掉 `getCookie()`／`refreshCsrfToken()`／`csrfToken` 變數，`apiFetch()` 不再附加 `x-csrf-token` header，改回單純的「帶 cookie 打 API」。
- 刪除 `scripts/hash-password.mjs`：不再需要產生密碼 hash，帳號密碼現在直接透過 `wrangler secret put ADMIN_USERNAME` / `wrangler secret put ADMIN_PASSWORD` 設定明文即可。
- 調整 [README.md](README.md)：「Admin 後台」章節的設定步驟從 5 步簡化為 4 步（拿掉「產生密碼 hash」那一步，`ADMIN_PASSWORD_HASH` + `SESSION_SECRET` 兩個 secret 合併成一個 `ADMIN_PASSWORD`），「安全性摘要」改寫成如實反映簡化後的安全性（明文密碼 secret、cookie 不簽章、沒有 CSRF、沒有登入速率限制），並說明這是使用者主動選擇的取捨。
- 說明：改完之後重新在本機用假的 D1 環境跑過一輪測試（`checkCredentials`／`requireAdmin` 各種正確/錯誤帳密與 cookie 情境、`worker.js` 完整路由的登入→拿 cookie→免 CSRF header 直接建立文章→登出流程），共 15 項測試全部通過，確認拿掉 CSRF 之後既有的建立文章流程不會被誤擋、拿掉密碼雜湊後帳密比對邏輯依然正確。同樣受限於本機沒有瀏覽器工具，還沒有實際在瀏覽器裡點過新的登入流程，建議之後用 `wrangler dev` 搭配上方設定步驟實際測一次。

### 2026-07-17（第十二次追加：修正 wrangler.json 設定衝突，指令改回不帶 `pages` 的版本）

使用者依照上一輪的指示執行 `wrangler secret put ADMIN_USERNAME`，跳出「It looks like you've run a Workers-specific command in a Pages project」錯誤，於是我當時判斷（錯誤地）這是 Pages 專案，把 README 全部改成 `wrangler pages secret put` / `wrangler pages deploy .`。使用者照做後，`wrangler pages secret put` 直接跳出更根本的錯誤：

```text
Configuration file cannot contain both "main" and "pages_build_output_dir" configuration keys.
Configuration file for Pages projects does not support "main"
Configuration file for Pages projects does not support "assets"
```

這才發現真正的問題：[wrangler.json](wrangler.json) 同時存在 `"main": "worker.js"`、`"assets": { "directory": "." }`（Workers 靜態資產專案的標準寫法）跟 `"pages_build_output_dir": "."`（Pages 專案專用），這兩組設定互斥，新版 wrangler（4.112.0）會直接擋下來拒絕執行。回頭看 `worker.js` 的實作（`export default { fetch(request, env) { ...; return env.ASSETS.fetch(request); } }`，透過 `main` + `assets` 綁定讀取靜態檔案），這其實從頭到尾就是一個 **Cloudflare Workers（含靜態資產）專案**，不是 Pages 專案；`pages_build_output_dir` 是設定檔裡多餘、衝突的欄位。

- 調整 [wrangler.json](wrangler.json)：移除 `"pages_build_output_dir": "."`，只保留 `"main"` + `"assets"` 的 Workers 靜態資產寫法，設定檔不再自相矛盾。
- 調整 [README.md](README.md)：把上一輪誤改成 `wrangler pages secret put` / `wrangler pages deploy .` / `wrangler pages dev .` 的地方全部改回不帶 `pages` 的原版指令（`wrangler secret put`、`wrangler deploy`、`wrangler dev`），並在「初始化指令」段落加註說明這是 Workers 專案、以及這次設定衝突的來龍去脈，避免以後又被同樣的錯誤訊息誤導。歷史版本歷程裡舊的 `wrangler pages dev .` 記錄予以保留（如實反映當時的操作紀錄），不回頭竄改。
- 說明：這次沒有辦法讓我自己重現 wrangler CLI 的驗證錯誤（本機沒有登入 Cloudflare 帳號、也沒有安裝 wrangler），完全是根據使用者貼的錯誤截圖與訊息文字判斷根因；`wrangler.json` 本身是純 JSON，已確認格式正確（沒有多餘逗號、引號配對正確）。麻煩使用者這次先執行 `wrangler secret put ADMIN_USERNAME` 確認不會再跳出設定檔驗證錯誤，如果還有問題請把新的錯誤訊息貼給我。

### 2026-07-17（第十三次追加：上一輪判斷錯了，改回 Pages 專案，`worker.js` 更名為 `_worker.js`）

上一輪拿掉 `pages_build_output_dir`、把 README 全部改成不帶 `pages` 的指令之後，使用者照做執行 `wrangler secret put ADMIN_USERNAME`，這次 wrangler 跳出的訊息是：

```text
WARNING  Pages now has wrangler.json support.
We detected a configuration file at ...\wrangler.json but it is missing the "pages_build_output_dir" field, required by Pages.
If you would like to use this configuration file for your project, please use "pages_build_output_dir" to specify the directory of static files to upload.
Ignoring configuration file for now.

X  ERROR  Missing Pages project name. Use --project-name <name> to specify which project to manage secrets for.
```

這則訊息才是真正決定性的證據：wrangler 會先去查 Cloudflare 帳號上、跟 `wrangler.json` 裡 `name` 對應的專案**實際登記成什麼類型**，而不是只看本機檔案內容；「Missing Pages project name」代表 wrangler 認定帳號上這個專案本來就是 **Pages 專案**。回頭看最一開始（第一次执行 `wrangler secret put ADMIN_USERNAME`）跳出的「run a Workers-specific command in a Pages project」，其實就已經是同一個結論，只是上一輪我看到「跟 `main`/`assets` 衝突」的錯誤訊息，就倒推成「這是 Workers 專案、要拿掉 `pages_build_output_dir`」，方向反了——衝突確實存在，但該拿掉的是 `main`/`assets`，不是 `pages_build_output_dir`。

- 調整 [wrangler.json](wrangler.json)：拿掉上一輪加的 `"main": "worker.js"` 與 `"assets": { "directory": "." }`，改回 `"pages_build_output_dir": "."`。Pages 專案本來就不吃 `main`/`assets` 這兩個 Workers 專用欄位（跟上上一輪那則錯誤訊息「Configuration file for Pages projects does not support "main"/"assets"」完全對得上）。
- 檔案更名 `worker.js` → [_worker.js](_worker.js)（用 `git mv` 保留版本紀錄）：Cloudflare Pages 的 Advanced Mode 是靠**檔名**（放在輸出目錄根目錄、檔名固定叫 `_worker.js`）讓 Pages 接管所有路由，不是像 Workers 專案那樣靠 `wrangler.json` 的 `main` 欄位指定進入點；改成 Pages 模式後，`env.ASSETS` 由 Pages 自動注入，程式碼本身完全不用改。
- 調整 [README.md](README.md)：所有 wrangler 指令改回帶 `pages` 的版本（`wrangler pages secret put`、`wrangler pages deploy .`、`wrangler pages dev .`），並把「初始化指令」段落的說明改成如實反映「這是帳號上已經登記好的 Pages 專案」這個結論的來源（wrangler 實際查詢結果，不是憑本機檔案猜的）。
- 新增 [.gitignore](.gitignore) 規則 `.wrangler/`：使用者本機執行 wrangler 指令後會產生 `.wrangler/` 快取資料夾，不需要進版控。
- 說明：這是這幾輪來回裡第二次因為誤判 Workers／Pages 而改錯方向，老實記錄下來；這次的判斷依據是使用者提供的第二則錯誤訊息裡「Missing Pages project name」這句話，比上一輪單看「main/pages_build_output_dir 衝突」的訊息更直接地指向帳號端的實際專案類型，理論上這次是正確方向，但因為本機沒有 Cloudflare 帳號權限、無法自己跑 `wrangler pages secret put` 驗證，還是需要使用者實際執行一次確認。

### 2026-07-17（第十四次追加：拿到確切證據，改回 Workers 專案——這次是 Cloudflare 自動建置紀錄，不是猜的）

使用者依照上一輪指示執行 `wrangler pages project list`，結果是空的（帳號裡沒有任何 Pages 專案）；照理說接下來要先 `wrangler pages project create` 建立一個新的 Pages 專案。但使用者接著貼出的，其實是 **Cloudflare 自動觸發的建置紀錄**（push code 上去之後系統自己跑的，不是使用者手動執行的指令），內容是：

```text
Executing user deploy command: npx wrangler versions upload
✘ [ERROR] Missing entry-point to Worker script or to assets directory
```

`wrangler versions upload` 是 **Workers Gradual Deployments 專用指令**，Pages 專案完全不會執行到這個指令。這代表帳號上其實接的是 **Workers Builds**（Cloudflare 針對 Workers 的 Git 整合自動建置功能，跟 Pages 的 Git 整合是兩套不同系統），每次 push 到有連接的分支就會自動觸發建置——這解釋了為什麼 `wrangler pages project list` 是空的（因為從頭到尾就沒有 Pages 專案），也解釋了為什麼上一輪的 `pages_build_output_dir` 設定會讓這個自動建置直接失敗（找不到 Workers 需要的 `main`/`assets` 進入點）。這是比先前兩次都更直接的證據（實際執行紀錄，不是錯誤訊息片段），因此照這個修正回去：

- 調整 [wrangler.json](wrangler.json)：拿掉 `"pages_build_output_dir"`，改回 `"main": "worker.js"` + `"assets": { "directory": "." }`。
- 檔案更名 [_worker.js](_worker.js) → `worker.js`（用 `git mv` 保留版本紀錄，跟上一輪的更名方向相反）。
- 調整 [README.md](README.md)：所有指令改回**不帶 `pages`** 的版本（`wrangler secret put`、`wrangler deploy`、`wrangler dev`），「初始化指令」段落的說明改成引用這次的建置紀錄證據，並補充「這個專案接了 Workers Builds，push 到有連接的分支會自動觸發部署」這件事——代表接下來只要 `git push`，不一定需要手動 `wrangler deploy`。
- 重新對改回 `worker.js` 的內容跑一次完整測試（`checkCredentials`／`requireAdmin`／完整登入路由流程），15 項全部通過，確認改檔名跟改回 `main`/`assets` 設定沒有影響任何邏輯。
- 說明：這是這幾輪來回裡第三次調整 Workers／Pages 的判斷方向；前兩次都是根據錯誤訊息的字面意思推測，這次是根據 Cloudflare 實際自動執行的建置指令內容（`npx wrangler versions upload`）確認，證據力比前兩次都強，之後除非又出現矛盾的新證據，應該不會再變。麻煩使用者重新執行 `wrangler secret put ADMIN_USERNAME` / `wrangler secret put ADMIN_PASSWORD`，並 push 這次的修正讓 Workers Builds 自動重新建置一次，確認網站上的「Admin 帳密尚未設定完成」訊息是否消失。

### 2026-07-17（第十五次追加：後台編輯器改成彈出視窗，修好「文章管理」「留言管理」空白的 bug）

使用者在儀表板上直接用「變數與機密」設定好 `ADMIN_USERNAME`／`ADMIN_PASSWORD` 之後回報三個問題：發文表單希望改成彈出框、「文章管理」列表沒有顯示、「留言管理」的頁面下拉選單選不到東西。前兩項是真正的功能調整，後兩項追出來是同一個 bug：

- **根因**：[blog/admin/editor.html](blog/admin/editor.html) 的 `init()` 依序 `await refreshPostList()` → `await refreshCategoryOptions()` → `await loadCommentPageKeys()`，但 `refreshPostList()` 內部沒有自己 catch 錯誤，只要它拋出例外（例如 API 回應非預期格式、或任何暫時性錯誤），整條 `await` 鏈就會直接中斷，後面的 `refreshCategoryOptions()` 跟 `loadCommentPageKeys()` 根本不會執行——這正好對應「文章管理」跟「留言管理」同時掛掉的現象，而且因為沒有任何地方 catch 這個例外，畫面上也不會顯示任何錯誤訊息，只會安靜地空白。
- 調整 [blog/admin/editor.html](blog/admin/editor.html)：`refreshPostList()` 改成自己 try/catch，抓到錯誤就在文章列表區塊顯示紅字錯誤訊息（比照 `loadCommentPageKeys()` 原本就有的寫法），不會再讓例外往外拋、拖垮後面的初始化步驟。
- 調整 [blog/admin/editor.html](blog/admin/editor.html)：把「新增文章／編輯文章」表單從頁面內固定區塊，改成彈出視窗（`#editor-modal`，沿用專案裡既有的 modal 樣式模式）。「文章管理」區塊上方新增「＋ 新增文章」按鈕開啟空白表單；文章列表的「編輯」按鈕改成開啟同一個視窗並帶入該篇文章內容；視窗內新增「關閉」按鈕，點擊視窗外的半透明背景也會關閉。原本表單裡的「新增文章（清空表單）」按鈕保留在視窗內，改名為「清空表單」（單純清空欄位，不關視窗）。
- 說明：沒有實際連到使用者的 D1 資料庫，沒辦法直接重現「文章管理／留言管理空白」的畫面，這個 bug 是透過重新閱讀 `init()` 的 `await` 執行順序推理出來的邏輯漏洞（一個未被捕捉的例外會讓後續所有初始化步驟全部中止），彈窗改版則已用本機伺服器確認 HTML 結構與按鈕綁定都有正確輸出；受限於本機沒有瀏覽器工具，還沒有實際點擊測試彈窗開關與空白畫面是否真的修好，麻煩使用者重新整理後台頁面實際測試一次，如果「文章管理」或「留言管理」還是空白，這次應該至少會顯示紅字的錯誤訊息內容，把訊息貼給我就能繼續往下查。

### 2026-07-17（第十六次追加：抓到「文章管理」500 的真正原因——前後端路徑對不起來）

上一輪修好之後，使用者實測回報：「留言管理」正常了（證實 `init()` 級聯失敗的修正有效），但「文章管理」顯示紅字「文章列表讀取失敗：請求失敗（HTTP 500）」，沒有更多細節。用本機測試腳本模擬同樣的呼叫，才發現真正的問題：

- **根因**：[blog/admin/editor.html](blog/admin/editor.html) 呼叫的是 `GET /api/admin/posts?status=all`，但 [worker.js](worker.js) 的路由表裡從來沒有註冊過這個路徑——只有 `GET /api/posts`（本來就有支援 `?status=all`，帶這個參數時會另外檢查登入狀態）。路徑對不上，請求會直接落到 `router()` 回傳 `null`、掉進 `env.ASSETS.fetch(request)` 的靜態檔案回退邏輯，這才是問題根源，跟 D1／資料庫完全無關。用測試腳本重現：對錯的路徑發請求，回應是 404（掉進靜態資源），不是後端的 API 邏輯在執行。
- 調整 [blog/admin/editor.html](blog/admin/editor.html)：`refreshPostList()` 改呼叫正確、原本就存在且已測試過的 `GET /api/posts?status=all`。
- 調整 [worker.js](worker.js)：`fetch()` 進入點外層加上 try/catch，任何 API handler 裡沒接住的例外，現在都會轉成帶實際錯誤訊息的 JSON（`{ ok: false, error: "..." }` + 500），不會再變成 Cloudflare 的通用 500 頁面、前端只看得到「HTTP 500」四個字卻不知道原因。
- 調整 [server/posts.js](server/posts.js)：`ensurePostsSchema()` 建表若失敗，改成清掉快取的 `postsSchemaReady`，讓下一次呼叫可以重新嘗試，避免同一個 Worker isolate 存活期間永遠卡在同一個失敗的 promise 上。
- 說明：這次用本機測試腳本實際模擬了兩種情境並都通過——(1) 對舊的錯誤路徑 `/api/admin/posts?status=all` 發請求，確認它從路由表裡就沒被接住、掉進靜態資源回退（404），證明路徑不符確實是問題所在；(2) 讓假的 D1 在查詢時丟出例外，確認新的頂層 try/catch 會把實際錯誤文字（例如「no such table: posts」）原封不動地回傳到前端，而不是變成空白的 500。這兩項連同之前的 15 項路由/驗證測試全部通過（共 19 項）。同樣沒有連到使用者的真實 D1，麻煩使用者重新整理後台頁面確認「文章管理」現在能正常顯示；如果還有問題，因為現在錯誤訊息會真的顯示出來，直接把畫面上的文字貼給我就能精準定位。

### 2026-07-17（第十七次追加：修好編輯到一半視窗突然關閉清空的 bug）

使用者回報：編輯文章時,有時候整個編輯視窗會「突然關掉、內容清空」。追查後找到成因，是彈出視窗常見的 UX 陷阱：

- **根因**：[blog/admin/editor.html](blog/admin/editor.html) 的「點擊視窗外的半透明背景關閉編輯視窗」邏輯，只檢查滑鼠放開（`click` 事件）當下的目標元素是不是背景本身。但如果使用者在文章內容的 `textarea` 裡選取文字、或拖曳右下角調整 `textarea` 高度時，滑鼠一路拖出視窗外面，放開滑鼠的位置剛好落在背景上，瀏覽器判定這次的 `click` 事件目標就是背景，於是誤觸「點背景關閉」——編輯視窗被意外關掉（但表單內容其實還在，只是被隱藏）。使用者發現視窗不見了，直覺點「＋ 新增文章」想繼續編輯，但那顆按鈕本來就是設計成「開新文章、清空表單」，於是把剛剛還在但看不到的內容也一起清掉了——兩個動作連在一起，體感就是「突然整個編輯關掉清空」。
- 調整 [blog/admin/editor.html](blog/admin/editor.html)：改成同時追蹤「滑鼠按下（`mousedown`）的位置」與「滑鼠放開（`click`）的位置」，只有兩者都在背景本身時才真的關閉視窗；在文字框裡選字或拖曳調整大小、只是放開位置剛好在背景上的情況，不會再被誤判成點背景。
- 調整 [index.html](index.html)：首頁的 Admin 登入彈出視窗用的是同一種「點背景關閉」寫法，雖然欄位比較小、機率較低，但屬於同一個 bug 模式，一併用同樣的方式修正，避免以後在登入視窗上也遇到一樣的問題。
- 說明：這是純前端的事件處理邏輯修正，沒有動到任何後端 API；已用本機伺服器確認兩個頁面都能正常載入、新的 `mousedown`/`click` 追蹤邏輯有正確輸出在 HTML 中。受限於本機沒有瀏覽器工具，沒辦法實際模擬拖曳滑鼠到視窗外放開這個動作來重現/驗證修復效果，麻煩使用者之後編輯文章時特別注意一下：在 `textarea` 裡選字或拖曳調整大小時，就算滑鼠不小心滑到編輯視窗外面才放開，視窗應該不會再被關閉了；如果還有遇到同樣的狀況，麻煩盡量描述當下具體在做什麼操作（例如是不是在選取文字、拖曳調整框框大小等），能幫助進一步定位。

### 2026-07-18（第十八次追加：一次做完五件事——克隆原始版本、背景輪播、文章全面搬進 D1、專案清理、R2 用量保護）

使用者一次提出五個需求，先用 `AskUserQuestion` 確認了三個有實質取捨的決定（克隆資料夾名稱、舊 `.md` 檔要保留還是刪除、quota 超標要停到什麼程度），再依序執行：

**1. 克隆留言系統導入前的原始版本**

- 發現 `main` 分支從頭到尾都沒有合併過留言/後台系統（那些工作都在 `後端匿名留言功能api建置` 與 `feature/admin-forum-cms` 兩個分支上進行，從未 merge 回 `main`），所以 `main`／`origin/main` 本來就是使用者要的「原始版本」，不需要額外找 commit。
- 用 `git clone --branch main --single-branch` 從 GitHub 遠端複製一份到 `D:\coding\personal-website-original`，已確認裡面完整包含全部 10 篇原始文章、對應的圖片與 PDF。這份 clone 完全獨立於目前工作中的 repo，之後對 `feature/admin-forum-cms` 分支做任何事都不會影響到它。

**2. 新增計時背景圖片輪播功能**

- 新增 [assets/bg-rotation.js](assets/bg-rotation.js)：共用的背景輪播模組，用兩層 `.bg-photo-layer`（一張顯示中、一張預載下一張）搭配 `opacity` transition 做淡入淡出crossfade，換圖前會先 `Image` 預載，載入失敗會跳過那一輪、下次間隔再試下一張，不會讓畫面卡住或閃現破圖。
- 調整 [index.html](index.html) 與 [blog/post.html](blog/post.html)：原本寫死在 `body` 的單張背景圖，改成 `.bg-photo-layer`（照片，會輪播）+ `.bg-tint-overlay`（原本的深色調性漸層，固定不動，維持既有配色風格）兩層疊加；各自新增 `BG_ROTATION_IMAGES` 陣列（首頁跟文章頁的圖片相對路徑不同，各自維護一份）與 `BG_ROTATION_INTERVAL_MS`（預設 20 秒）。**之後你要提供新的背景圖片時，把檔案放進 `blog/picture/`，再把檔名加進這兩個頁面各自的 `BG_ROTATION_IMAGES` 陣列就會自動輪播進去，不需要改其他程式碼。**

**3～4. 把舊文章全面搬進 D1，`.md` 本地端作業正式退休**

- 寫了一支本機用的一次性 Node 腳本（沒有進 repo），讀取 `blog/posts/index.json` 列出的 10 篇文章，解析 front matter，把內文裡的相對圖片／PDF 路徑（含少數用反斜線 `\` 的 Windows 風格路徑）一律改寫成從網站根目錄開始的絕對路徑（`/blog/posts/...`），slug 用檔名轉寫成乾淨的英數格式（例如 `2026-03-23-homemade NAS.md` → `2026-03-23-homemade-nas`），輸出成新的 [migrations/0003_seed_legacy_posts.sql](migrations/0003_seed_legacy_posts.sql)。
- 用 Node 24 內建的 `node:sqlite` 建立一個記憶體資料庫，實際套用這份 migration SQL 驗證：10 篇文章全部成功寫入、標題裡的單引號（例如 `Ren'py`）正確跳脫、圖片與 PDF 路徑都改寫成絕對路徑、沒有任何 SQL 語法錯誤。
- 調整 [index.html](index.html)：`loadMarkdownPosts()` 整個簡化成只呼叫 `GET /api/posts?status=published`，移除了原本讀取 `blog/posts/index.json` + 逐篇 fetch `.md` 檔的迴圈、以及對應的 `parseFrontMatter`／`getBodyTitle`／`getExcerpt` 三個輔助函式（連同已經永遠不會觸發的 `missingFiles` 警示邏輯一併移除）。
- 調整 [blog/post.html](blog/post.html)：移除 `loadStaticPost()`（讀 `?file=xxx.md` 的路徑）與相關的 `source=db` 判斷，只保留 `loadDbPost()`，網址格式統一簡化成 `blog/post.html?slug=xxx`。
- **刪除** `blog/posts/*.md`（10 篇文章原始檔）與 `blog/posts/index.json`：內容已經完整搬進 D1，且這份備份已經確認存在於 `D:\coding\personal-website-original`。**圖片與 PDF 子資料夾（`2026-03-23-homemade NAS pic/`、`2026-04-11-complexity/`、`.../computer use/`、`pdf file/` 等）完全沒有刪除**，仍然是靜態檔案留在 repo 裡，因為遷移後的文章內文改用絕對路徑繼續引用它們——沒有把它們搬進 R2（R2 是給後台新上傳的檔案用的，舊圖片維持免費的靜態檔案，也不會占用 R2 的 10GB 額度）。

**5. 專案清理**

- 刪除 `functions/api/engagement.js` 與整個 `functions/` 目錄：確認過正式環境是 [worker.js](worker.js) 的 Workers Advanced Mode 在接管所有路由，`functions/` 目錄從來沒被執行過，是純粹的死碼。
- 刪除 `blog/standard.md`、`blog/posts/template.md`：兩份都是舊 `.md` 本地端發文流程的操作說明文件，現在發文流程改成後台編輯器，這兩份文件連同它們描述的流程一起退休。
- 刪除三張沒有被任何程式碼引用的重複圖片：`blog/picture/bg1.JPEG`、`blog/picture/bg2.JPEG`（跟現在實際使用的 `bg1.png`／`bg2.png` 是同張圖的不同格式副本，只有 `.png` 版本真的被引用）、`blog/picture/profile pic.PNG`（跟實際使用的 `profile pic.jpg` 重複，大小寫不同的另一份檔案）。
- 移除 [server/http.js](server/http.js) 裡的 `fromHex`／`base64UrlEncode`／`base64UrlDecode` 三個函式：這些是舊版 PBKDF2 + 簽章 session token 機制留下的，帳密簡化之後完全沒有任何地方呼叫了。
- 移除 [index.html](index.html) 與 [assets/engagement.css](assets/engagement.css) 裡各一個從來沒被任何 HTML 元素用到的 CSS class（`.content-subtitle`、`.hint`、`.cf-engagement__subtitle`）。用寫好的小腳本比對每個 `<style>` 裡定義的 class 是否有出現在對應的 HTML/JS 裡才抓出來的，不是憑印象猜的。
- 沒有動：`migrations/` 底下所有既有的 migration 檔（`0001`／`0002`／舊的）、`server/*.js` 其餘所有 export、`assets/engagement.js`／`markdown-render.js`／`bg-rotation.js`、`content/*.txt`——這些都確認仍在使用中。

**6. R2 儲存空間保護（避免超過 10GB 免費額度）**

- 新增 [server/posts.js](server/posts.js) 的 `getStorageUsageBytes()`：用 `SELECT SUM(size_bytes) FROM uploads` 估算目前 R2 用量（`uploads` 表在每次上傳成功時都會記一筆，這個估算只涵蓋透過後台上傳的檔案，不含舊文章保留的靜態圖片）。
- 調整 [server/uploads.js](server/uploads.js)：`handleUpload` 在真正寫入 R2 之前，先檢查「目前用量 + 這次檔案大小」是否達到 98%（約 9.8GB，留 2% 安全緩衝）——達到就直接回傳 503 並拒絕上傳，不會真的寫進 R2；用量達到 90%（9GB）以上但還沒到硬性上限時，上傳仍會成功，但回應會多帶一個 `warning` 欄位。新增 `getStorageStatus()` 統一組裝 `{ usedBytes, totalBytes, percent, isWarning, isStopped }` 這組狀態。
- 調整 [worker.js](worker.js)：新增 `GET /api/admin/storage`（需要登入）回傳上述用量狀態。
- 調整 [blog/admin/editor.html](blog/admin/editor.html)：右上角新增即時的「R2 用量」顯示，一般時是灰色文字、接近上限時變黃色、真的被擋住時變紅色粗體；頁面載入時與每次上傳圖片/PDF 完成後都會重新抓一次最新用量。
- 用假的 D1 模擬不同用量情境（0GB／9.5GB／9.9GB 已用）寫了 11 項測試，全部通過：確認用量低時上傳正常無警示、90～98% 之間會成功但帶警示訊息、98% 以上會被 503 擋下且不會真的呼叫 R2 的 `put`、`GET /api/admin/storage` 在已登入/未登入時分別回傳正確結果。
- 說明：因為停止上傳只鎖「新增檔案」這一個動作，網站首頁、既有文章、留言、按讚等其他功能完全不受影響，符合使用者確認過的「只停止新的上傳功能」選項。

**整體測試總結**：這一輪新增/修改的邏輯（D1 migration SQL、R2 quota 檢查、`GET /api/admin/storage`）都用本機模擬環境（`node:sqlite` 記憶體資料庫 + 假的 D1/R2 物件）實際跑過，不是只看程式碼推測；連同先前累積的測試，目前總共有 40+ 項自動化測試涵蓋登入、CSRF 拿掉後的行為、文章 CRUD、留言管理、markdown 渲染跳脫、上傳驗證、R2 quota 五大塊。仍然沒有連到使用者真實的 Cloudflare 帳號，`migrations/0003_seed_legacy_posts.sql` 需要使用者手動執行 `wrangler d1 migrations apply personal_website` 才會真的把舊文章寫進正式的 D1 資料庫；在那之前，首頁的「全部貼文列表」會因為 D1 裡還沒有資料而顯示空白，這是預期中的過渡狀態，跑完 migration 就會恢復正常。
