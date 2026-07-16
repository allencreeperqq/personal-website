(function () {
  const API_PATH = "/api/engagement";
  const initializedWidgets = new WeakSet();
  const turnstilePromiseCache = new Map();

  function requestJson(url, options = {}) {
    return fetch(url, {
      cache: "no-store",
      headers: {
        "content-type": "application/json"
      },
      ...options
    }).then(async (response) => {
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || `請求失敗（HTTP ${response.status}）`);
      }
      return data;
    });
  }

  function formatTime(value) {
    if (!value) return "剛剛";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("zh-Hant-TW", { hour12: false });
  }

  function getPageKey(container) {
    return String(container.dataset.pageKey || "").trim();
  }

  function getTurnstileSiteKey(container) {
    return String(container.dataset.turnstileSiteKey || "").trim();
  }

  function renderShell(container) {
    if (container.dataset.engagementReady === "1") return;

    container.innerHTML = [
      '<div class="cf-engagement__header">',
      '  <div>',
      '    <h2 class="cf-engagement__title">匿名留言 / 按讚 / 瀏覽量</h2>',
      '    <p class="cf-engagement__subtitle">資料會寫入 Cloudflare D1；前端只負責送出與顯示，留言內容會以純文字方式渲染。</p>',
      '  </div>',
      '  <div class="cf-engagement__meter">',
      '    <span class="cf-pill">瀏覽 <strong data-role="views">0</strong></span>',
      '    <button type="button" class="cf-like-button" data-role="like-button">按讚 <strong data-role="likes">0</strong></button>',
      '  </div>',
      '</div>',
      '<div class="cf-engagement__body">',
      '  <form class="cf-engagement__form" data-role="comment-form">',
      '    <label class="cf-field">',
      '      <span>暱稱</span>',
      '      <input type="text" name="nickname" maxlength="24" placeholder="匿名" autocomplete="nickname" />',
      '    </label>',
      '    <label class="cf-field">',
      '      <span>留言內容</span>',
      '      <textarea name="content" maxlength="500" rows="5" placeholder="留下你的想法，支援換行。" required></textarea>',
      '    </label>',
      '    <div class="cf-turnstile-slot" data-role="turnstile"></div>',
      '    <button type="submit" class="cf-submit-button">送出留言</button>',
      '    <p class="cf-feedback" data-role="message"></p>',
      '  </form>',
      '  <section class="cf-comments" aria-live="polite">',
      '    <h3 class="cf-comments__title">最新留言</h3>',
      '    <div class="cf-comments__list" data-role="comments"></div>',
      '  </section>',
      '</div>'
    ].join("");

    container.dataset.engagementReady = "1";
  }

  function setFeedback(container, message, isError = false) {
    const node = container.querySelector('[data-role="message"]');
    if (!node) return;
    node.textContent = message || "";
    node.classList.toggle("is-error", isError);
  }

  function renderComments(container, comments) {
    const list = container.querySelector('[data-role="comments"]');
    if (!list) return;

    list.innerHTML = "";

    if (!Array.isArray(comments) || comments.length === 0) {
      const empty = document.createElement("p");
      empty.className = "cf-empty";
      empty.textContent = "暫時還沒有留言，第一則留言會顯示在這裡。";
      list.appendChild(empty);
      return;
    }

    for (const comment of comments) {
      const item = document.createElement("article");
      item.className = "cf-comment";

      const meta = document.createElement("div");
      meta.className = "cf-comment__meta";

      const name = document.createElement("span");
      name.className = "cf-comment__name";
      name.textContent = comment.nickname || "匿名";

      const time = document.createElement("span");
      time.className = "cf-comment__time";
      time.textContent = formatTime(comment.created_at);

      const content = document.createElement("div");
      content.className = "cf-comment__content";
      content.textContent = comment.content || "";

      meta.appendChild(name);
      meta.appendChild(time);
      item.appendChild(meta);
      item.appendChild(content);
      list.appendChild(item);
    }
  }

  function updateStats(container, stats) {
    const viewsNode = container.querySelector('[data-role="views"]');
    const likesNode = container.querySelector('[data-role="likes"]');
    if (viewsNode) viewsNode.textContent = String(Number(stats?.views || 0));
    if (likesNode) likesNode.textContent = String(Number(stats?.likes || 0));
  }

  function readSessionFlag(key) {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function writeSessionFlag(key, value) {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // 瀏覽器若禁止 sessionStorage，瀏覽量統計仍會正常送出，只是無法去重。
    }
  }

  function readLocalFlag(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function writeLocalFlag(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // 如果 localStorage 不可用，只會失去「同瀏覽器只按一次讚」的防重覆保護。
    }
  }

  async function loadTurnstile(container) {
    const siteKey = getTurnstileSiteKey(container);
    const slot = container.querySelector('[data-role="turnstile"]');
    if (!slot) return null;
    if (!siteKey) {
      slot.innerHTML = '<p class="cf-empty">Turnstile 尚未設定，留言仍可在開發模式下測試。</p>';
      return null;
    }

    if (window.turnstile) {
      return window.turnstile.render(slot, { sitekey: siteKey, theme: "dark" });
    }

    if (!turnstilePromiseCache.has(siteKey)) {
      turnstilePromiseCache.set(siteKey, new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.onload = () => resolve(window.turnstile);
        script.onerror = () => reject(new Error("Turnstile 載入失敗。"));
        document.head.appendChild(script);
      }));
    }

    await turnstilePromiseCache.get(siteKey);
    return window.turnstile.render(slot, { sitekey: siteKey, theme: "dark" });
  }

  async function refreshWidget(container) {
    const pageKey = getPageKey(container);
    if (!pageKey) return;

    // 先抓取目前統計與留言，讓首屏直接顯示伺服器上的最新狀態。
    const data = await requestJson(`${API_PATH}?key=${encodeURIComponent(pageKey)}`);
    updateStats(container, data.stats);
    renderComments(container, data.comments);
  }

  async function recordViewOnce(container) {
    const pageKey = getPageKey(container);
    if (!pageKey) return;

    const flagKey = `cf-viewed:${pageKey}`;
    if (readSessionFlag(flagKey)) return;

    writeSessionFlag(flagKey, "1");
    const data = await requestJson(API_PATH, {
      method: "POST",
      body: JSON.stringify({ key: pageKey, action: "view" })
    });
    updateStats(container, data.stats);
  }

  function bindLikeButton(container) {
    const pageKey = getPageKey(container);
    const button = container.querySelector('[data-role="like-button"]');
    if (!pageKey || !button) return;

    const flagKey = `cf-liked:${pageKey}`;
    if (readLocalFlag(flagKey)) {
      button.disabled = true;
      button.textContent = "你已按過讚";
      return;
    }

    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        const data = await requestJson(API_PATH, {
          method: "POST",
          body: JSON.stringify({ key: pageKey, action: "like" })
        });

        writeLocalFlag(flagKey, "1");
        updateStats(container, data.stats);
        button.textContent = "已完成按讚";
        setFeedback(container, "感謝按讚，統計已更新。", false);
      } catch (error) {
        button.disabled = false;
        setFeedback(container, error.message, true);
      }
    });
  }

  function bindCommentForm(container, turnstileWidgetId) {
    const pageKey = getPageKey(container);
    const form = container.querySelector('[data-role="comment-form"]');
    if (!pageKey || !form) return;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitButton = form.querySelector('button[type="submit"]');
      const nickname = form.nickname?.value || "";
      const content = form.content?.value || "";

      if (!String(content).trim()) {
        setFeedback(container, "留言內容不能為空。", true);
        return;
      }

      if (submitButton) submitButton.disabled = true;
      setFeedback(container, "留言送出中...", false);

      try {
        const payload = {
          key: pageKey,
          action: "comment",
          nickname,
          content
        };

        if (turnstileWidgetId && window.turnstile) {
          payload.turnstileToken = window.turnstile.getResponse(turnstileWidgetId) || "";
        }

        const data = await requestJson(API_PATH, {
          method: "POST",
          body: JSON.stringify(payload)
        });

        form.reset();
        if (turnstileWidgetId && window.turnstile) {
          window.turnstile.reset(turnstileWidgetId);
        }

        updateStats(container, data.stats);
        renderComments(container, data.comments);
        setFeedback(container, "留言已送出。", false);
      } catch (error) {
        setFeedback(container, error.message, true);
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });
  }

  async function initWidget(container) {
    const pageKey = getPageKey(container);
    if (!pageKey || initializedWidgets.has(container)) return;

    initializedWidgets.add(container);
    renderShell(container);

    // 瀏覽統計先寫入，再重抓一次資料，讓頁面上的數字與 D1 保持一致。
    try {
      await recordViewOnce(container);
    } catch (error) {
      setFeedback(container, error.message, true);
    }

    bindLikeButton(container);

    let turnstileWidgetId = null;
    try {
      turnstileWidgetId = await loadTurnstile(container);
    } catch (error) {
      setFeedback(container, error.message, true);
    }

    bindCommentForm(container, turnstileWidgetId);

    try {
      await refreshWidget(container);
    } catch (error) {
      setFeedback(container, `互動區載入失敗：${error.message}`, true);
    }
  }

  function boot() {
    document.querySelectorAll(".cf-engagement[data-page-key]").forEach((container) => {
      initWidget(container);
    });
  }

  window.CloudflareEngagement = {
    boot,
    initWidget
  };

  window.addEventListener("DOMContentLoaded", boot);
})();