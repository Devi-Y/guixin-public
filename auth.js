(function startGuixinAuth(root, document) {
  const config = root.GUIXIN_ANALYTICS_CONFIG || {};
  const endpoint = String(config.endpoint || "").replace(/\/$/, "");
  const returnUrl = String(config.authReturnUrl || "https://devi-y.github.io/guixin-public/");
  const control = document.getElementById("account-control");
  const label = document.getElementById("account-label");
  const login = document.getElementById("account-login");
  const logout = document.getElementById("account-logout");
  const notice = document.getElementById("site-notice");
  let noticeTimer;

  if (!control || !login || !logout || !endpoint || !/^https:\/\//i.test(endpoint)) return;

  login.href = `${endpoint}/api/auth/wecom/start?return_to=${encodeURIComponent(returnUrl)}`;

  const authError = new URLSearchParams(root.location.search).get("auth_error");
  if (authError) {
    showNotice(authError === "not_internal_member" ? "此账号没有归心应用权限，可继续使用首页入口。" : "登录未完成，可重试或继续使用首页入口。");
    try {
      const cleanUrl = new URL(root.location.href);
      cleanUrl.searchParams.delete("auth_error");
      root.history.replaceState(null, "", cleanUrl.toString());
    } catch {
      // 当前环境不支持清理地址时，不影响后续登录。
    }
  }

  function showNotice(message) {
    if (!notice) return;
    notice.textContent = message;
    notice.hidden = false;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => { notice.hidden = true; }, 6000);
  }

  function showSignedOut() {
    control.hidden = false;
    control.classList.remove("is-signed-in");
    label.textContent = "";
    login.hidden = false;
    logout.hidden = true;
  }

  function showSignedIn(name) {
    control.hidden = false;
    control.classList.add("is-signed-in");
    label.textContent = `已登录：${name || "企业微信成员"}`;
    login.hidden = true;
    logout.hidden = false;
  }

  async function request(path, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(`${endpoint}${path}`, {
        ...options, signal: controller.signal, credentials: "include", mode: "cors",
        headers: { Accept: "application/json", ...(options.headers || {}) },
      });
      return { response, payload: await response.json().catch(() => ({})) };
    } finally { clearTimeout(timer); }
  }

  async function loadIdentity() {
    try {
      const status = await request("/api/auth/status");
      if (!status.response.ok || !status.payload.available) return;
      const me = await request("/api/me");
      if (!me.response.ok) return;
      if (me.payload.authenticated) showSignedIn(me.payload.displayName);
      else showSignedOut();
    } catch {
      // 未配置或暂时不可用时不增加页面负担。
    }
  }

  logout.addEventListener("click", async () => {
    logout.disabled = true;
    try {
      const result = await request("/api/auth/logout", { method: "POST" });
      if (!result.response.ok) throw new Error("logout_failed");
      showSignedOut();
    } catch {
      showNotice("退出暂未完成，请稍后重试。");
    } finally {
      logout.disabled = false;
    }
  });

  loadIdentity();
})(typeof globalThis !== "undefined" ? globalThis : window, document);
