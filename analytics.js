(function startGuixinAnalytics(root, document) {
  const config = root.GUIXIN_ANALYTICS_CONFIG || {};
  const endpoint = String(config.endpoint || "").replace(/\/$/, "");
  const site = String(config.site || "guixin-public");
  const consentVersion = String(config.consentVersion || "1");

  // 留空配置时保持纯静态站行为，不产生任何外部请求。
  if (!endpoint || !/^https:\/\//i.test(endpoint)) {
    const status = document.getElementById("privacy-current-status");
    if (status) status.textContent = "统计暂不可用";
    document.querySelectorAll("#enable-analytics, #disable-analytics").forEach((button) => { button.disabled = true; });
    return;
  }

  const consentKey = `guixin-analytics-consent:${consentVersion}`;
  const visitorKey = "guixin-analytics-visitor";
  const sessionKey = "guixin-analytics-session";
  let consent = readStorage("localStorage", consentKey);
  let visitorId = "";
  let sessionId = "";
  let pageViewSent = false;

  function readStorage(storage, key) {
    try {
      return root[storage].getItem(key);
    } catch {
      return null;
    }
  }

  function writeStorage(storage, key, value) {
    try {
      if (value === null) root[storage].removeItem(key);
      else root[storage].setItem(key, value);
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
    if (!visitorId) {
      visitorId = readStorage("localStorage", visitorKey) || createId("v");
      writeStorage("localStorage", visitorKey, visitorId);
    }
    return visitorId;
  }

  function getSessionId() {
    if (!sessionId) {
      sessionId = readStorage("sessionStorage", sessionKey) || createId("s");
      writeStorage("sessionStorage", sessionKey, sessionId);
    }
    return sessionId;
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
    if (consent !== "granted") return;
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
      if (consent !== "granted") return;
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
    bar.setAttribute("aria-label", "访问统计设置");
    bar.innerHTML = `
      <span>允许记录访问和模块点击？</span>
      <button type="button" data-consent="declined">暂不</button>
      <button type="button" class="is-primary" data-consent="granted">同意统计</button>
    `;

    bar.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-consent]");
      if (!button) return;
      chooseConsent(button.dataset.consent);
    });

    document.body.append(bar);
    document.body.classList.add("has-consent");
  }

  function startTracking() {
    if (pageViewSent) return;
    send(createEvent("page_view"));
    pageViewSent = true;
  }

  function updateSettings() {
    const status = document.getElementById("privacy-current-status");
    if (status) status.textContent = consent === "granted" ? "统计已开启" : "统计未开启";
  }

  function chooseConsent(value) {
    consent = value;
    writeStorage("localStorage", consentKey, value);
    document.querySelector(".analytics-consent")?.remove();
    document.body.classList.remove("has-consent");
    if (value === "granted") startTracking();
    else {
      visitorId = "";
      sessionId = "";
      pageViewSent = false;
      writeStorage("localStorage", visitorKey, null);
      writeStorage("sessionStorage", sessionKey, null);
    }
    updateSettings();
  }

  document.getElementById("enable-analytics")?.addEventListener("click", () => {
    chooseConsent("granted");
    document.dispatchEvent(new CustomEvent("guixin:close-dialog"));
  });
  document.getElementById("disable-analytics")?.addEventListener("click", () => {
    chooseConsent("declined");
    document.dispatchEvent(new CustomEvent("guixin:close-dialog"));
  });
  // 负责人目录中的入口也计入模块点击，共用一个委托监听器。
  document.addEventListener("click", (event) => {
    const entry = event.target.closest?.("[data-tool-id]");
    if (entry && consent === "granted") send(createEvent("tool_click", entry.dataset.toolId));
  });
  updateSettings();
  root.addEventListener("storage", (event) => {
    if (event.key !== consentKey) return;
    consent = event.newValue;
    if (consent !== "granted") { visitorId = ""; sessionId = ""; pageViewSent = false; }
    else startTracking();
    document.querySelector(".analytics-consent")?.remove();
    document.body.classList.remove("has-consent");
    updateSettings();
  });

  if (consent === "granted") {
    startTracking();
  } else if (consent !== "declined") {
    addConsentBar();
  }
})(typeof globalThis !== "undefined" ? globalThis : window, document);
