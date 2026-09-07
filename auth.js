(function startGuixinAuth(root, document) {
  const config = root.GUIXIN_ANALYTICS_CONFIG || {};
  const endpoint = String(config.endpoint || "").replace(/\/$/, "");
  const returnUrl = String(config.authReturnUrl || "https://devi-y.github.io/guixin-public/");
  const control = document.getElementById("account-control");
  const label = document.getElementById("account-label");
  const login = document.getElementById("account-login");
  const logout = document.getElementById("account-logout");

  if (!control || !login || !logout || !endpoint || !/^https:\/\//i.test(endpoint)) return;

  login.href = `${endpoint}/api/auth/wecom/start?return_to=${encodeURIComponent(returnUrl)}`;

  const authError = new URLSearchParams(root.location.search).get("auth_error");
  if (authError) {
    try {
      const cleanUrl = new URL(root.location.href);
      cleanUrl.searchParams.delete("auth_error");
      root.history.replaceState(null, "", cleanUrl.toString());
    } catch {
      // 当前环境不支持清理地址时，不影响后续登录。
    }
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
    const response = await fetch(`${endpoint}${path}`, {
      ...options,
      credentials: "include",
      mode: "cors",
      headers: { Accept: "application/json", ...(options.headers || {}) },
    });
    return { response, payload: await response.json().catch(() => ({})) };
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
      await request("/api/auth/logout", { method: "POST" });
    } finally {
      logout.disabled = false;
      showSignedOut();
    }
  });

  loadIdentity();
})(typeof globalThis !== "undefined" ? globalThis : window, document);
