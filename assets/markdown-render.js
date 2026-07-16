(function () {
  function escapeHtml(input) {
    return String(input)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function parseFrontMatter(text) {
    const normalized = String(text)
      .replace(/^﻿/, "")
      .replace(/\r\n/g, "\n")
      .replace(/^\s+/, "");

    const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!match) return { meta: {}, body: normalized };

    const meta = {};
    const lines = match[1].split(/\r?\n/);
    for (const line of lines) {
      const idx = line.indexOf(":");
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      if (key) meta[key] = value;
    }

    return { meta, body: match[2] };
  }

  function resolveContentUrl(rawUrl, currentFile) {
    const url = String(rawUrl || "").trim();
    if (!url) return "";

    if (/^(https?:|data:|mailto:|tel:|#|\/)/i.test(url)) {
      return url;
    }

    const encodedFile = encodeURI(currentFile || "").replace(/#/g, "%23");
    const baseUrl = new URL(`posts/${encodedFile}`, window.location.href);
    return new URL(url, baseUrl).href;
  }

  function renderInlineMarkdown(text, currentFile) {
    const imageTokens = [];
    const mathTokens = [];
    let raw = String(text);

    raw = raw.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
      const tokenId = imageTokens.length;
      imageTokens.push({
        alt: String(alt),
        src: resolveContentUrl(src, currentFile)
      });
      return `__MD_IMAGE_TOKEN_${tokenId}__`;
    });

    raw = raw.replace(/\$\$([\s\S]+?)\$\$/g, (match, expr) => {
      const tokenId = mathTokens.length;
      mathTokens.push(`$$${expr}$$`);
      return `__MD_MATH_TOKEN_${tokenId}__`;
    });

    raw = raw.replace(/(^|[^\\$])\$([^$\n]+?)\$/g, (match, prefix, expr) => {
      const tokenId = mathTokens.length;
      mathTokens.push(`$${expr}$`);
      return `${prefix}__MD_MATH_TOKEN_${tokenId}__`;
    });

    let rendered = escapeHtml(raw)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    rendered = rendered.replace(/__MD_MATH_TOKEN_(\d+)__/g, (match, idx) => {
      const token = mathTokens[Number(idx)];
      return token ? escapeHtml(token) : "";
    });

    rendered = rendered.replace(/__MD_IMAGE_TOKEN_(\d+)__/g, (match, idx) => {
      const token = imageTokens[Number(idx)];
      if (!token || !token.src) return "";
      const safeAlt = escapeHtml(token.alt);
      const safeSrc = escapeHtml(token.src);
      return `<img class="md-image" src="${safeSrc}" alt="${safeAlt}" loading="lazy" />`;
    });

    return rendered;
  }

  function renderPdfEmbedLine(rawLine, currentFile) {
    const line = String(rawLine || "").trim();

    const customMatch = line.match(/^!pdf(?:\[([^\]]*)\])?\(([^)]+)\)$/i);
    const linkMatch = line.match(/^\[([^\]]+)\]\(([^)]+\.pdf(?:[#?][^)]+)?)\)$/i);
    let title = "";
    let url = "";

    if (customMatch) {
      title = String(customMatch[1] || "PDF 預覽").trim() || "PDF 預覽";
      url = customMatch[2];
    } else if (linkMatch) {
      title = String(linkMatch[1] || "PDF 預覽").trim() || "PDF 預覽";
      url = linkMatch[2];
    } else {
      return "";
    }

    const resolved = resolveContentUrl(url, currentFile);
    if (!resolved) return "";

    const safeTitle = escapeHtml(title);
    const safeUrl = escapeHtml(resolved);

    return [
      '<section class="md-pdf">',
      `  <div class="md-pdf-title">${safeTitle}</div>`,
      `  <iframe class="md-pdf-frame" src="${safeUrl}" title="${safeTitle}" loading="lazy"></iframe>`,
      '  <p class="md-pdf-fallback">',
      `    若無法預覽，請改用<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">新分頁開啟 PDF</a>。`,
      "  </p>",
      "</section>"
    ].join("\n");
  }

  function isTableRowLine(rawLine) {
    const line = String(rawLine || "").trim();
    if (!line.startsWith("|")) return false;
    const pipeCount = (line.match(/\|/g) || []).length;
    return pipeCount >= 2;
  }

  function splitTableCells(rawLine) {
    const line = String(rawLine || "").trim();
    return line
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());
  }

  function isTableSeparatorLine(rawLine) {
    if (!isTableRowLine(rawLine)) return false;
    const cells = splitTableCells(rawLine);
    if (!cells.length) return false;
    return cells.every((cell) => {
      const marker = cell.replace(/\s+/g, "");
      return /^:?-{3,}:?$/.test(marker);
    });
  }

  function buildTableHtml(tableLines, currentFile) {
    if (!tableLines.length) return "";

    let headerCells = null;
    let bodyRows = [];

    if (tableLines.length >= 2 && isTableSeparatorLine(tableLines[1])) {
      headerCells = splitTableCells(tableLines[0]);
      bodyRows = tableLines.slice(2).map(splitTableCells);
    } else {
      bodyRows = tableLines.map(splitTableCells);
    }

    let colCount = 0;
    if (headerCells) colCount = Math.max(colCount, headerCells.length);
    for (const row of bodyRows) colCount = Math.max(colCount, row.length);
    if (colCount === 0) return "";

    const normalizeRow = (row) => {
      const next = row.slice();
      while (next.length < colCount) next.push("");
      return next;
    };

    let html = '<div class="md-table-wrap"><table class="md-table">';

    if (headerCells) {
      const header = normalizeRow(headerCells)
        .map((cell) => `<th>${renderInlineMarkdown(cell, currentFile)}</th>`)
        .join("");
      html += `<thead><tr>${header}</tr></thead>`;
    }

    if (bodyRows.length) {
      const rows = bodyRows
        .map((row) => {
          const cells = normalizeRow(row)
            .map((cell) => `<td>${renderInlineMarkdown(cell, currentFile)}</td>`)
            .join("");
          return `<tr>${cells}</tr>`;
        })
        .join("");
      html += `<tbody>${rows}</tbody>`;
    }

    html += "</table></div>";
    return html;
  }

  function markdownToHtml(markdown, currentFile) {
    const lines = markdown.replace(/\r\n/g, "\n").split("\n");
    const html = [];
    let inList = false;
    let inQuote = false;
    let quoteLines = [];

    const flushQuote = () => {
      if (!inQuote) return;
      const content = quoteLines
        .map((entry) => renderInlineMarkdown(entry, currentFile))
        .join("<br>");
      html.push(`<blockquote>${content}</blockquote>`);
      inQuote = false;
      quoteLines = [];
    };

    for (let i = 0; i < lines.length; i += 1) {
      const rawLine = lines[i];
      const line = rawLine.trim();

      if (line.startsWith("$$")) {
        if (inList) {
          html.push("</ul>");
          inList = false;
        }
        flushQuote();

        const mathLines = [rawLine];

        if (!(line.endsWith("$$") && line.length > 2)) {
          i += 1;
          while (i < lines.length) {
            mathLines.push(lines[i]);
            if (lines[i].trim().endsWith("$$")) break;
            i += 1;
          }
        }

        const mathContent = escapeHtml(mathLines.join("\n"));
        html.push(`<div class="md-math-block">${mathContent}</div>`);
        continue;
      }

      if (line.startsWith("```")) {
        if (inList) {
          html.push("</ul>");
          inList = false;
        }
        flushQuote();

        const lang = line.slice(3).trim().split(/\s+/)[0] || "";
        const codeLines = [];
        i += 1;

        while (i < lines.length && !lines[i].trim().startsWith("```")) {
          codeLines.push(lines[i]);
          i += 1;
        }

        const codeContent = escapeHtml(codeLines.join("\n"));
        const safeLang = lang ? ` language-${escapeHtml(lang)}` : "";
        html.push(`<pre class="md-code-block"><code class="md-code${safeLang}">${codeContent}</code></pre>`);
        continue;
      }

      if (!line) {
        if (inList) {
          html.push("</ul>");
          inList = false;
        }
        flushQuote();
        continue;
      }

      const quoteMatch = rawLine.match(/^\s*>\s?(.*)$/);
      if (quoteMatch) {
        if (inList) {
          html.push("</ul>");
          inList = false;
        }
        if (!inQuote) {
          inQuote = true;
          quoteLines = [];
        }
        quoteLines.push(quoteMatch[1]);
        continue;
      }

      flushQuote();

      if (isTableRowLine(rawLine)) {
        if (inList) {
          html.push("</ul>");
          inList = false;
        }

        const tableLines = [];
        while (i < lines.length && isTableRowLine(lines[i])) {
          tableLines.push(lines[i].trim());
          i += 1;
        }

        const tableHtml = buildTableHtml(tableLines, currentFile);
        if (tableHtml) html.push(tableHtml);
        i -= 1;
        continue;
      }

      const pdfEmbedHtml = renderPdfEmbedLine(rawLine, currentFile);
      if (pdfEmbedHtml) {
        if (inList) {
          html.push("</ul>");
          inList = false;
        }
        html.push(pdfEmbedHtml);
        continue;
      }

      if (line.startsWith("### ")) {
        if (inList) {
          html.push("</ul>");
          inList = false;
        }
        html.push(`<h3>${renderInlineMarkdown(line.slice(4), currentFile)}</h3>`);
        continue;
      }

      if (line.startsWith("## ")) {
        if (inList) {
          html.push("</ul>");
          inList = false;
        }
        html.push(`<h2>${renderInlineMarkdown(line.slice(3), currentFile)}</h2>`);
        continue;
      }

      if (line.startsWith("# ")) {
        if (inList) {
          html.push("</ul>");
          inList = false;
        }
        html.push(`<h1>${renderInlineMarkdown(line.slice(2), currentFile)}</h1>`);
        continue;
      }

      if (line.startsWith("- ")) {
        if (!inList) {
          html.push("<ul>");
          inList = true;
        }
        html.push(`<li>${renderInlineMarkdown(line.slice(2), currentFile)}</li>`);
        continue;
      }

      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      html.push(`<p>${renderInlineMarkdown(line, currentFile)}</p>`);
    }

    if (inList) html.push("</ul>");
    flushQuote();
    return html.join("\n");
  }

  window.MarkdownRender = {
    escapeHtml,
    parseFrontMatter,
    resolveContentUrl,
    renderInlineMarkdown,
    markdownToHtml
  };
})();
