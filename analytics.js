(function startGuixinAnalytics(root, document) {
  const config = root.GUIXIN_ANALYTICS_CONFIG || {};
  const endpoint = String(config.endpoint || "").replace(/\/$/, "");
  const site = String(config.site || "guixin-public");
  const consentVersion = String(config.consentVersion || "1");

  // 留空配置时保持纯静态站行为，不产生任何外部请求。
  if (!endpoint || !/^https:\/\//i.test(endpoint)) return;

  const consentKey = `guixin-analytics-consent:${consentVersion}`;
  const visitorKey = "guixin-analytics-visitor";
  const sessionKey = "guixin-analytics-session";
  const consent = readStorage(window.localStorage, consentKey);

  function readStorage(storage, key) {
    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  }

  function writeStorage(storage, key, value) {
    try {
      storage.setItem(key, value);
    } catch {
      // 隐私模式或存储被禁用时，统计自动降级，不影响页面使用。
    }
  }

  function createId(prefix) {
    if (root.crypto && typeof root.crypto.randomUUID === "function") {
      return `${prefix}-${root.crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }

  function getVisitorId() {
    const existing = readStorage(window.localStorage, visitorKey);
    if (existing) return existing;
    const next = createId("v");
    writeStorage(window.localStorage, visitorKey, next);
    return next;
  }

  function getSessionId() {
    const existing = readStorage(window.sessionStorage, sessionKey);
    if (existing) return existing;
    const next = createId("s");
    writeStorage(window.sessionStorage, sessionKey, next);
    return next;
  }

  function getDevice() {
    if (root.innerWidth <= 600) return "mobile";
    if (root.innerWidth <= 1024) return "tablet";
    return "desktop";
  }

  function getReferrerOrigin() {
    if (!document.referrer) return "";
    try {
      const origin = new URL(document.referrer).origin;
      return origin === root.location.origin ? "" : origin.slice(0, 160);
    } catch {
      return "";
    }
  }

  function createEvent(eventType, toolId = "") {
    return {
      event_id: createId("e"),
      site,
      visitor_id: getVisitorId(),
      session_id: getSessionId(),
      event_type: eventType,
      tool_id: toolId,
      device: getDevice(),
      referrer_origin: getReferrerOrigin(),
    };
  }

  function send(event) {
    const body = JSON.stringify({ events: [event] });
    const eventsUrl = `${endpoint}/api/events`;

    fetch(eventsUrl, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      mode: "cors",
      credentials: "include",
    }).catch(() => {
      if (typeof navigator.sendBeacon !== "function") return;
      try {
        navigator.sendBeacon(eventsUrl, new Blob([body], { type: "application/json" }));
      } catch {
        // 统计失败不能阻塞主页面，也不向用户展示错误。
      }
    });
  }

  function addConsentBar() {
    const bar = document.createElement("aside");
    bar.className = "analytics-consent";
    bar.setAttribute("role", "dialog");
    bar.setAttribute("aria-label", "访问统计设置");
    bar.innerHTML = `
      <span>为优化入口，记录匿名访问和模块点击</span>
      <button type="button" data-consent="declined">暂不</button>
      <button type="button" class="is-primary" data-consent="granted">同意统计</button>
    `;

    bar.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-consent]");
      if (!button) return;
      writeStorage(window.localStorage, consentKey, button.dataset.consent);
      bar.remove();
      if (button.dataset.consent === "granted") startTracking();
    });

    document.body.append(bar);
  }

  function startTracking() {
    send(createEvent("page_view"));
    document.addEventListener("click", (event) => {
      const card = event.target.closest?.(".tool-card[data-tool-id]");
      if (!card) return;
      send(createEvent("tool_click", card.dataset.toolId));
    });
  }

  if (consent === "granted") {
    startTracking();
  } else if (consent !== "declined") {
    addConsentBar();
  }
})(typeof globalThis !== "undefined" ? globalThis : window, document);
