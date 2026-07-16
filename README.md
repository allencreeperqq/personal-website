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
