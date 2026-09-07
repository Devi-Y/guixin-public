(function startGuixinAnalyticsDashboard(root, document) {
  const config = root.GUIXIN_ANALYTICS_CONFIG || {};
  const endpoint = String(config.endpoint || "").replace(/\/$/, "");
  const tokenStorageKey = "guixin-analytics-admin-token";
  const setupState = document.getElementById("setup-state");
  const loginState = document.getElementById("login-state");
  const dashboard = document.getElementById("dashboard");
  const loginForm = document.getElementById("login-form");
  const tokenInput = document.getElementById("token-input");
  const loginError = document.getElementById("login-error");
  const rangeSelect = document.getElementById("range-select");
  const refreshButton = document.getElementById("refresh-button");
  const signOutButton = document.getElementById("sign-out-button");
  const summaryGrid = document.getElementById("summary-grid");
  const toolBars = document.getElementById("tool-bars");
  const dailyList = document.getElementById("daily-list");
  const visitorList = document.getElementById("visitor-list");
  const eventList = document.getElementById("event-list");
  const refreshStatus = document.getElementById("refresh-status");
  const tools = Array.isArray(root.GUIXIN_TOOLS) ? root.GUIXIN_TOOLS : [];
  const toolNames = new Map(tools.map((tool) => [tool.id, tool.title]));

  let adminToken = readSessionToken();

  function readSessionToken() {
    try {
      return sessionStorage.getItem(tokenStorageKey) || "";
    } catch {
      return "";
    }
  }

  function writeSessionToken(value) {
    try {
      if (value) sessionStorage.setItem(tokenStorageKey, value);
      else sessionStorage.removeItem(tokenStorageKey);
    } catch {
      // 存储不可用时仍允许本次页面会话查看数据。
    }
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>\"]/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
    })[char]);
  }

  function formatTime(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("zh-CN", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  }

  function formatDate(value) {
    const text = String(value || "");
    return text.length >= 10 ? text.slice(5, 10).replace("-", "/") : text;
  }

  function deviceName(value) {
    return ({ mobile: "手机", tablet: "平板", desktop: "电脑" })[value] || "其他设备";
  }

  function toolName(value) {
    return toolNames.get(value) || (value ? value : "其他模块");
  }

  function showState(state) {
    setupState.hidden = state !== "setup";
    loginState.hidden = state !== "login";
    dashboard.hidden = state !== "dashboard";
    if (state === "login") setTimeout(() => tokenInput.focus(), 0);
  }

  function showError(message) {
    refreshStatus.textContent = message;
    refreshStatus.classList.add("is-error");
  }

  function clearError() {
    refreshStatus.textContent = "";
    refreshStatus.classList.remove("is-error");
  }

  function renderSummary(summary) {
    const cards = [
      ["访问次数", summary.pageViews],
      ["独立访客", summary.uniqueVisitors],
      ["模块点击", summary.toolClicks],
      ["最近访问", formatTime(summary.lastSeen)],
    ];
    summaryGrid.innerHTML = cards.map(([label, value]) => `
      <div class="panel summary-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value ?? "0")}</strong></div>
    `).join("");
  }

  function renderToolBars(items) {
    if (!items.length) {
      toolBars.innerHTML = '<p class="empty">还没有模块点击</p>';
      return;
    }
    const max = Math.max(...items.map((item) => Number(item.clicks) || 0), 1);
    toolBars.innerHTML = items.map((item) => `
      <div class="bar-row">
        <span class="bar-label" title="${escapeHtml(toolName(item.toolId))}">${escapeHtml(toolName(item.toolId))}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${Math.max(4, (Number(item.clicks) / max) * 100)}%"></span></span>
        <span class="bar-count">${escapeHtml(item.clicks)}</span>
      </div>
    `).join("");
  }

  function renderDaily(items) {
    if (!items.length) {
      dailyList.innerHTML = '<p class="empty">还没有访问数据</p>';
      return;
    }
    dailyList.innerHTML = items.slice(-14).reverse().map((item) => `
      <div class="daily-row"><strong>${escapeHtml(formatDate(item.day))}</strong><span>访问 ${escapeHtml(item.pageViews)}</span><span>点击 ${escapeHtml(item.toolClicks)}</span></div>
    `).join("");
  }

  function renderVisitors(items) {
    if (!items.length) {
      visitorList.innerHTML = '<p class="empty">还没有访客</p>';
      return;
    }
    visitorList.innerHTML = items.map((item) => {
      const visitor = String(item.visitorId || "");
      const shortId = visitor.length > 8 ? visitor.slice(-8) : visitor;
      const clicks = Number(item.clicks) || 0;
      return `
        <div class="visitor-row">
          <div class="visitor-main"><strong>访客 ${escapeHtml(shortId)}</strong><span>${escapeHtml(item.events)} 条记录 · 点击 ${escapeHtml(clicks)} 次</span></div>
          <span>${escapeHtml(deviceName(item.device))}</span>
          <span class="visitor-time">${escapeHtml(formatTime(item.lastSeen))}</span>
          <span>${escapeHtml(item.lastToolId ? toolName(item.lastToolId) : "仅访问")}</span>
        </div>
      `;
    }).join("");
  }

  function renderEvents(items) {
    if (!items.length) {
      eventList.innerHTML = '<p class="empty">还没有活动</p>';
      return;
    }
    eventList.innerHTML = items.map((item) => {
      const visitor = String(item.visitorId || "");
      const shortId = visitor.length > 8 ? visitor.slice(-8) : visitor;
      const isClick = item.eventType === "tool_click";
      return `
        <div class="event-row">
          <div class="event-main"><strong>访客 ${escapeHtml(shortId)}</strong><span>${escapeHtml(deviceName(item.device))} · ${escapeHtml(item.referrerOrigin || "直接进入")}</span></div>
          <span class="event-type">${isClick ? `点击 ${escapeHtml(toolName(item.toolId))}` : "进入网站"}</span>
          <span class="event-time">${escapeHtml(formatTime(item.createdAt))}</span>
        </div>
      `;
    }).join("");
  }

  async function loadSummary() {
    if (!adminToken) {
      showState("login");
      return;
    }
    clearError();
    refreshButton.disabled = true;
    refreshButton.textContent = "加载中";
    try {
      const response = await fetch(`${endpoint}/api/summary?days=${rangeSelect.value}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        credentials: "omit",
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        adminToken = "";
        writeSessionToken("");
        loginError.textContent = "口令不正确，请重新输入。";
        showState("login");
        return;
      }
      if (!response.ok) throw new Error(payload.error || "统计服务暂时不可用");
      renderSummary(payload.summary || {});
      renderToolBars(payload.topTools || []);
      renderDaily(payload.daily || []);
      renderVisitors(payload.recentVisitors || []);
      renderEvents(payload.recentEvents || []);
      refreshStatus.textContent = `更新于 ${formatTime(new Date().toISOString())}`;
    } catch (error) {
      showError(error.message || "暂时无法连接统计服务，请稍后重试。");
    } finally {
      refreshButton.disabled = false;
      refreshButton.textContent = "刷新";
    }
  }

  if (!endpoint || !/^https:\/\//i.test(endpoint)) {
    showState("setup");
    return;
  }

  showState(adminToken ? "dashboard" : "login");
  if (adminToken) loadSummary();

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    loginError.textContent = "";
    adminToken = tokenInput.value.trim();
    if (!adminToken) return;
    writeSessionToken(adminToken);
    showState("dashboard");
    loadSummary();
  });

  rangeSelect.addEventListener("change", loadSummary);
  refreshButton.addEventListener("click", loadSummary);
  signOutButton.addEventListener("click", () => {
    adminToken = "";
    writeSessionToken("");
    tokenInput.value = "";
    showState("login");
  });
})(typeof globalThis !== "undefined" ? globalThis : window, document);
