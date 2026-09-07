const SITE = "guixin-public";
const MAX_BODY_BYTES = 32 * 1024;
const MAX_BATCH_SIZE = 10;
const RETENTION_DAYS = 90;
const AUTH_COOKIE = "GUIXIN_SESSION";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const AUTH_STATE_TTL_SECONDS = 10 * 60;
const DEFAULT_RETURN_URL = "https://devi-y.github.io/guixin-public/";
const ALLOWED_RETURN_URLS = new Set([
  DEFAULT_RETURN_URL,
  "http://127.0.0.1:4173/",
  "http://localhost:4173/",
]);
const ALLOWED_ORIGINS = new Set([
  "https://devi-y.github.io",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
]);
const TOOL_IDS = new Set([
  "jury",
  "governance",
  "supervision",
  "credit-penalty",
  "complaint-dashboard",
  "beilian-quality",
  "coin-guide",
  "contacts",
  "learning",
]);

function isAllowedOrigin(origin) {
  return !origin || ALLOWED_ORIGINS.has(origin);
}

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const headers = {
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
  if (ALLOWED_ORIGINS.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(request, value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function text(request, value, status = 200) {
  return new Response(value, {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

function isWeComConfigured(env) {
  return Boolean(
    env.WECOM_CORP_ID
      && env.WECOM_AGENT_ID
      && env.WECOM_SECRET
      && env.SESSION_SECRET,
  );
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  const base64 = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function signValue(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(String(secret)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

async function memberIdFor(env, userId) {
  const digest = await signValue(
    env.SESSION_SECRET,
    `member:${env.WECOM_CORP_ID}:${String(userId).toLowerCase()}`,
  );
  return `m_${bytesToHex(digest).slice(0, 48)}`;
}

async function createSession(env, memberId) {
  const payload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify({
    memberId,
    expiresAt: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  })));
  const signature = bytesToBase64Url(await signValue(env.SESSION_SECRET, payload));
  return `${payload}.${signature}`;
}

function readCookie(request, name) {
  const cookieHeader = request.headers.get("Cookie") || "";
  for (const part of cookieHeader.split(";")) {
    const [key, ...valueParts] = part.trim().split("=");
    if (key === name) return valueParts.join("=");
  }
  return "";
}

async function readSessionMemberId(request, env) {
  if (!env.SESSION_SECRET) return "";
  const token = readCookie(request, AUTH_COOKIE);
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return "";

  try {
    const expected = await signValue(env.SESSION_SECRET, payload);
    const received = base64UrlToBytes(signature);
    if (expected.length !== received.length) return "";
    let difference = 0;
    expected.forEach((byte, index) => { difference |= byte ^ received[index]; });
    if (difference !== 0) return "";

    const parsed = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload)));
    if (!parsed?.memberId || Number(parsed.expiresAt) <= Math.floor(Date.now() / 1000)) return "";
    return String(parsed.memberId);
  } catch {
    return "";
  }
}

function sessionCookie(value, maxAge = SESSION_TTL_SECONDS) {
  return `${AUTH_COOKIE}=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=None`;
}

function redirect(location, cookies = []) {
  const headers = new Headers({
    Location: location,
    "Cache-Control": "no-store",
  });
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 302, headers });
}

function configuredReturnUrls(env) {
  const values = new Set(ALLOWED_RETURN_URLS);
  if (env.PUBLIC_RETURN_URL) values.add(String(env.PUBLIC_RETURN_URL));
  return values;
}

function safeReturnUrl(env, value) {
  const candidate = String(value || "");
  return configuredReturnUrls(env).has(candidate) ? candidate : DEFAULT_RETURN_URL;
}

function addAuthError(returnTo, code) {
  const url = new URL(returnTo);
  url.searchParams.set("auth_error", code);
  return url.toString();
}

function authCallbackUrl(request, env) {
  if (env.AUTH_CALLBACK_URL) return String(env.AUTH_CALLBACK_URL);
  return `${new URL(request.url).origin}/api/auth/wecom/callback`;
}

function isWeComWebview(request) {
  const userAgent = request.headers.get("User-Agent") || "";
  return /wxwork|wecom/i.test(userAgent);
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { "Accept": "application/json" } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || Number(payload.errcode || 0) !== 0) {
    throw new Error("wecom_api_failed");
  }
  return payload;
}

async function startWeComAuth(request, env) {
  if (!env.DB) return json(request, { error: "database_not_configured" }, 503);
  if (!isWeComConfigured(env)) return json(request, { error: "wecom_auth_not_configured" }, 503);

  const url = new URL(request.url);
  const returnTo = safeReturnUrl(env, url.searchParams.get("return_to"));
  const state = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(24)));
  const expiresAt = new Date(Date.now() + AUTH_STATE_TTL_SECONDS * 1000).toISOString();

  try {
    await env.DB.prepare(
      "INSERT INTO auth_states (state, return_to, expires_at) VALUES (?, ?, ?)",
    ).bind(state, returnTo, expiresAt).run();
  } catch {
    return json(request, { error: "database_write_failed" }, 503);
  }

  if (isWeComWebview(request)) {
    const authUrl = new URL("https://open.weixin.qq.com/connect/oauth2/authorize");
    authUrl.searchParams.set("appid", env.WECOM_CORP_ID);
    authUrl.searchParams.set("redirect_uri", authCallbackUrl(request, env));
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "snsapi_base");
    authUrl.searchParams.set("state", state);
    return redirect(`${authUrl.toString()}#wechat_redirect`);
  }

  const authUrl = new URL("https://login.work.weixin.qq.com/wwlogin/sso/login");
  authUrl.searchParams.set("login_type", "CorpApp");
  authUrl.searchParams.set("appid", env.WECOM_CORP_ID);
  authUrl.searchParams.set("agentid", env.WECOM_AGENT_ID);
  authUrl.searchParams.set("redirect_uri", authCallbackUrl(request, env));
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("lang", "zh");
  return redirect(authUrl.toString());
}

async function finishWeComAuth(request, env) {
  const url = new URL(request.url);
  const state = String(url.searchParams.get("state") || "");
  const code = String(url.searchParams.get("code") || "");
  let returnTo = DEFAULT_RETURN_URL;

  if (env.DB && state) {
    const stateRow = await env.DB.prepare(
      "SELECT return_to, expires_at FROM auth_states WHERE state = ?",
    ).bind(state).first();
    await env.DB.prepare("DELETE FROM auth_states WHERE state = ?").bind(state).run();
    if (stateRow?.return_to) returnTo = safeReturnUrl(env, stateRow.return_to);
    if (!stateRow || new Date(stateRow.expires_at).getTime() <= Date.now()) {
      return redirect(addAuthError(returnTo, "invalid_state"));
    }
  } else {
    return redirect(addAuthError(returnTo, "invalid_state"));
  }

  if (!isWeComConfigured(env) || !code || code.length > 512) {
    return redirect(addAuthError(returnTo, "auth_unavailable"));
  }

  try {
    const tokenUrl = new URL("https://qyapi.weixin.qq.com/cgi-bin/gettoken");
    tokenUrl.searchParams.set("corpid", env.WECOM_CORP_ID);
    tokenUrl.searchParams.set("corpsecret", env.WECOM_SECRET);
    const tokenPayload = await fetchJson(tokenUrl.toString());

    const userInfoUrl = new URL("https://qyapi.weixin.qq.com/cgi-bin/auth/getuserinfo");
    userInfoUrl.searchParams.set("access_token", tokenPayload.access_token);
    userInfoUrl.searchParams.set("code", code);
    const userInfo = await fetchJson(userInfoUrl.toString());
    const userId = String(userInfo.UserId || userInfo.userid || "");
    if (!userId) return redirect(addAuthError(returnTo, "not_internal_member"));

    let displayName = String(userInfo.name || "").trim();
    const memberUrl = new URL("https://qyapi.weixin.qq.com/cgi-bin/user/get");
    memberUrl.searchParams.set("access_token", tokenPayload.access_token);
    memberUrl.searchParams.set("userid", userId);
    try {
      const member = await fetchJson(memberUrl.toString());
      displayName = String(member.name || displayName || "企业微信成员").trim();
    } catch {
      displayName = displayName || "企业微信成员";
    }
    displayName = displayName.slice(0, 64) || "企业微信成员";

    const memberId = await memberIdFor(env, userId);
    const now = new Date().toISOString();
    await env.DB.prepare(`
      INSERT INTO members (member_id, provider, display_name, updated_at, last_seen_at)
      VALUES (?, 'wecom', ?, ?, ?)
      ON CONFLICT(member_id) DO UPDATE SET
        display_name = excluded.display_name,
        updated_at = excluded.updated_at,
        last_seen_at = excluded.last_seen_at
    `).bind(memberId, displayName, now, now).run();

    const session = await createSession(env, memberId);
    return redirect(returnTo, [sessionCookie(session)]);
  } catch {
    return redirect(addAuthError(returnTo, "auth_failed"));
  }
}

async function readCurrentMember(request, env) {
  const memberId = await readSessionMemberId(request, env);
  if (!memberId || !env.DB) {
    return json(request, {
      authenticated: false,
      loginAvailable: isWeComConfigured(env),
    });
  }

  try {
    const member = await env.DB.prepare(
      "SELECT display_name AS displayName, provider FROM members WHERE member_id = ?",
    ).bind(memberId).first();
    if (!member) return json(request, { authenticated: false, loginAvailable: isWeComConfigured(env) });
    return json(request, {
      authenticated: true,
      loginAvailable: true,
      provider: member.provider,
      displayName: member.displayName,
    });
  } catch {
    return json(request, { error: "database_read_failed" }, 503);
  }
}

function logout(request) {
  const response = json(request, { ok: true });
  const headers = new Headers(response.headers);
  headers.append("Set-Cookie", sessionCookie("", 0));
  return new Response(response.body, { status: response.status, headers });
}

function validId(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{8,96}$/.test(value);
}

function safeReferrerOrigin(value) {
  if (typeof value !== "string" || value.length > 160 || !value) return "";
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol)) return "";
    return url.origin;
  } catch {
    return "";
  }
}

function normalizeEvent(event) {
  if (!event || event.site !== SITE) return null;
  if (!validId(event.event_id) || !validId(event.visitor_id) || !validId(event.session_id)) return null;
  if (!['page_view', 'tool_click'].includes(event.event_type)) return null;
  if (!['mobile', 'tablet', 'desktop'].includes(event.device)) return null;

  const toolId = event.event_type === "tool_click" ? event.tool_id : "";
  if (event.event_type === "tool_click" && !TOOL_IDS.has(toolId)) return null;

  return {
    eventId: event.event_id,
    visitorId: event.visitor_id,
    sessionId: event.session_id,
    eventType: event.event_type,
    toolId: toolId || null,
    device: event.device,
    referrerOrigin: safeReferrerOrigin(event.referrer_origin),
  };
}

async function insertEvents(request, env, ctx) {
  if (!env.DB) return json(request, { error: "database_not_configured" }, 503);
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_BODY_BYTES) return json(request, { error: "request_too_large" }, 413);

  let body;
  try {
    body = await request.json();
  } catch {
    return json(request, { error: "invalid_json" }, 400);
  }

  if (!Array.isArray(body?.events) || body.events.length < 1 || body.events.length > MAX_BATCH_SIZE) {
    return json(request, { error: "invalid_batch" }, 400);
  }

  const events = body.events.map(normalizeEvent);
  if (events.some((event) => !event)) return json(request, { error: "invalid_event" }, 400);

  const createdAt = new Date().toISOString();
  const memberId = await readSessionMemberId(request, env);
  const statements = events.map((event) => env.DB.prepare(`
    INSERT OR IGNORE INTO events
      (event_id, site, visitor_id, session_id, event_type, tool_id, device, referrer_origin, created_at, member_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    event.eventId,
    SITE,
    event.visitorId,
    event.sessionId,
    event.eventType,
    event.toolId,
    event.device,
    event.referrerOrigin,
    createdAt,
    memberId || null,
  ));

  try {
    await env.DB.batch(statements);
    ctx.waitUntil(removeExpiredEvents(env.DB));
    return json(request, { ok: true, accepted: events.length });
  } catch {
    return json(request, { error: "database_write_failed" }, 503);
  }
}

async function removeExpiredEvents(db) {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await db.prepare("DELETE FROM events WHERE site = ? AND created_at < ?").bind(SITE, cutoff).run();
  await db.prepare("DELETE FROM auth_states WHERE expires_at < ?").bind(new Date().toISOString()).run();
}

function isAdmin(request, env) {
  const authorization = request.headers.get("Authorization") || "";
  return Boolean(env.ADMIN_TOKEN) && authorization === `Bearer ${env.ADMIN_TOKEN}`;
}

function clampDays(value) {
  const days = Number.parseInt(value || "30", 10);
  if (!Number.isFinite(days)) return 30;
  return Math.min(90, Math.max(1, days));
}

async function readSummary(request, env) {
  if (!env.DB) return json(request, { error: "database_not_configured" }, 503);
  if (!isAdmin(request, env)) return json(request, { error: "unauthorized" }, 401);

  const url = new URL(request.url);
  const days = clampDays(url.searchParams.get("days"));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const where = "site = ? AND created_at >= ?";

  try {
    const [summary, topTools, daily, recentVisitors, recentEvents] = await Promise.all([
      env.DB.prepare(`
        SELECT
          SUM(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END) AS pageViews,
          COUNT(DISTINCT visitor_id) AS uniqueVisitors,
          SUM(CASE WHEN event_type = 'tool_click' THEN 1 ELSE 0 END) AS toolClicks,
          COUNT(DISTINCT CASE WHEN member_id IS NOT NULL THEN member_id END) AS verifiedVisitors,
          MAX(created_at) AS lastSeen
        FROM events
        WHERE ${where}
      `).bind(SITE, since).first(),
      env.DB.prepare(`
        SELECT tool_id AS toolId, COUNT(*) AS clicks
        FROM events
        WHERE ${where} AND event_type = 'tool_click' AND tool_id IS NOT NULL
        GROUP BY tool_id
        ORDER BY clicks DESC, tool_id ASC
      `).bind(SITE, since).all(),
      env.DB.prepare(`
        SELECT substr(created_at, 1, 10) AS day,
          SUM(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END) AS pageViews,
          SUM(CASE WHEN event_type = 'tool_click' THEN 1 ELSE 0 END) AS toolClicks
        FROM events
        WHERE ${where}
        GROUP BY day
        ORDER BY day ASC
      `).bind(SITE, since).all(),
      env.DB.prepare(`
        SELECT
          e.visitor_id AS visitorId,
          MAX(e.created_at) AS lastSeen,
          COUNT(*) AS events,
          SUM(CASE WHEN e.event_type = 'tool_click' THEN 1 ELSE 0 END) AS clicks,
          (
            SELECT e2.device FROM events e2
            WHERE e2.site = ? AND e2.visitor_id = e.visitor_id AND e2.created_at >= ?
            ORDER BY e2.created_at DESC LIMIT 1
          ) AS device,
          (
            SELECT e3.tool_id FROM events e3
            WHERE e3.site = ? AND e3.visitor_id = e.visitor_id
              AND e3.created_at >= ? AND e3.event_type = 'tool_click'
            ORDER BY e3.created_at DESC LIMIT 1
          ) AS lastToolId,
          MAX(CASE WHEN e.member_id IS NOT NULL THEN 1 ELSE 0 END) AS verified,
          MAX(m.display_name) AS displayName
        FROM events e
        LEFT JOIN members m ON m.member_id = e.member_id
        WHERE ${where}
        GROUP BY e.visitor_id
        ORDER BY lastSeen DESC
        LIMIT 100
      `).bind(SITE, since, SITE, since, SITE, since).all(),
      env.DB.prepare(`
        SELECT e.visitor_id AS visitorId, e.event_type AS eventType, e.tool_id AS toolId,
          e.device, e.referrer_origin AS referrerOrigin, e.created_at AS createdAt,
          m.display_name AS displayName,
          CASE WHEN e.member_id IS NOT NULL THEN 1 ELSE 0 END AS verified
        FROM events e
        LEFT JOIN members m ON m.member_id = e.member_id
        WHERE ${where}
        ORDER BY e.created_at DESC
        LIMIT 100
      `).bind(SITE, since).all(),
    ]);

    return json(request, {
      days,
      summary: {
        pageViews: Number(summary?.pageViews || 0),
        uniqueVisitors: Number(summary?.uniqueVisitors || 0),
        toolClicks: Number(summary?.toolClicks || 0),
        verifiedVisitors: Number(summary?.verifiedVisitors || 0),
        lastSeen: summary?.lastSeen || null,
      },
      topTools: (topTools?.results || []).map((row) => ({
        toolId: row.toolId,
        clicks: Number(row.clicks || 0),
      })),
      daily: (daily?.results || []).map((row) => ({
        day: row.day,
        pageViews: Number(row.pageViews || 0),
        toolClicks: Number(row.toolClicks || 0),
      })),
      recentVisitors: (recentVisitors?.results || []).map((row) => ({
        visitorId: row.visitorId,
        lastSeen: row.lastSeen,
        events: Number(row.events || 0),
        clicks: Number(row.clicks || 0),
        device: row.device,
        lastToolId: row.lastToolId,
        verified: Number(row.verified || 0) === 1,
        displayName: row.displayName || null,
      })),
      recentEvents: recentEvents?.results || [],
    });
  } catch {
    return json(request, { error: "database_read_failed" }, 503);
  }
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin") || "";
    if (!isAllowedOrigin(origin)) return text(request, "Forbidden origin", 403);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const url = new URL(request.url);
    if (["GET", "HEAD"].includes(request.method) && url.pathname === "/api/health") {
      const response = json(request, { ok: true, database: Boolean(env.DB) });
      const headers = new Headers(response.headers);
      headers.delete("Content-Length");
      return request.method === "HEAD"
        ? new Response(null, { status: response.status, headers })
        : response;
    }
    if (request.method === "GET" && url.pathname === "/api/auth/status") {
      return json(request, {
        available: isWeComConfigured(env),
        provider: isWeComConfigured(env) ? "wecom" : null,
      });
    }
    if (request.method === "GET" && url.pathname === "/api/auth/wecom/start") {
      return startWeComAuth(request, env);
    }
    if (request.method === "GET" && url.pathname === "/api/auth/wecom/callback") {
      return finishWeComAuth(request, env);
    }
    if (request.method === "GET" && url.pathname === "/api/me") {
      return readCurrentMember(request, env);
    }
    if (request.method === "POST" && url.pathname === "/api/auth/logout") {
      return logout(request);
    }
    if (request.method === "POST" && url.pathname === "/api/events") {
      return insertEvents(request, env, ctx);
    }
    if (request.method === "GET" && url.pathname === "/api/summary") {
      return readSummary(request, env);
    }
    if (["GET", "HEAD"].includes(request.method) && url.pathname === "/") {
      const response = text(request, "归心访问统计服务正常");
      const headers = new Headers(response.headers);
      headers.delete("Content-Length");
      return request.method === "HEAD"
        ? new Response(null, { status: response.status, headers })
        : response;
    }
    return text(request, "Not found", 404);
  },
};
