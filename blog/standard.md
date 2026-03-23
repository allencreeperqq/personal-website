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

## 顯示規則

- 首頁依 `date` 新到舊排序。
- 固定輸出：日期｜分類｜標題｜摘要｜閱讀全文。
- 單篇文章由 `blog/post.html` 渲染。
