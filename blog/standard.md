# Blog Markdown Standard

使用方式：

1. 在 `blog/posts/` 新增一個 `.md` 檔案。
2. 將檔名加入 `blog/posts/index.json` 的 `posts` 陣列。
3. 文章會自動顯示在首頁，並可點進文章頁。

## 固定模板

```md
---
title: 文章標題
date: 2026-03-23
category: 分類
excerpt: 摘要（1~2句）
---

# 文章內容

這裡開始寫內文。

## 小節標題

- 條列 1
- 條列 2

[外部連結文字](https://example.com)
```

## 欄位規範

- `title`：文章標題。
- `date`：日期，格式建議 `YYYY-MM-DD`。
- `category`：文章分類。
- `excerpt`：首頁摘要內容。

## 圖片語法

- 支援 Markdown 圖片：`![圖片說明](圖片網址或相對路徑)`。
- 建議把圖片放在 `blog/posts/` 或其子資料夾，並使用相對路徑。
- 範例：`![首頁截圖](hero.png)` 或 `![流程圖](images/flow-1.png)`。
- 相對路徑會以「該篇 Markdown 檔案所在位置」為基準解析。

## PDF 預覽語法

- 支援自訂 PDF 內嵌：`!pdf[顯示標題](PDF網址或相對路徑)`。
- 也支援單行 PDF 連結自動轉預覽：`[顯示標題](檔案.pdf)`。
- 建議把 PDF 放在 `blog/posts/` 或其子資料夾，並使用相對路徑。
- 範例：`!pdf[日本旅遊計畫書](pdf/japan-trip.pdf)`。
- 若使用者瀏覽器不支援內嵌，頁面會自動顯示「新分頁開啟 PDF」備援連結。

## 顯示規則

- 首頁依 `date` 新到舊排序。
- 固定輸出：日期｜分類｜標題｜摘要｜閱讀全文。
- 單篇文章由 `blog/post.html` 渲染。
