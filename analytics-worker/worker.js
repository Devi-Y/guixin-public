const SITE = "guixin-public";
const MAX_BODY_BYTES = 32 * 1024;
const MAX_BATCH_SIZE = 10;
const RETENTION_DAYS = 90;
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
  const statements = events.map((event) => env.DB.prepare(`
    INSERT OR IGNORE INTO events
      (event_id, site, visitor_id, session_id, event_type, tool_id, device, referrer_origin, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          ) AS lastToolId
        FROM events e
        WHERE ${where}
        GROUP BY e.visitor_id
        ORDER BY lastSeen DESC
        LIMIT 100
      `).bind(SITE, since, SITE, since, SITE, since).all(),
      env.DB.prepare(`
        SELECT visitor_id AS visitorId, event_type AS eventType, tool_id AS toolId,
          device, referrer_origin AS referrerOrigin, created_at AS createdAt
        FROM events
        WHERE ${where}
        ORDER BY created_at DESC
        LIMIT 100
      `).bind(SITE, since).all(),
    ]);

    return json(request, {
      days,
      summary: {
        pageViews: Number(summary?.pageViews || 0),
        uniqueVisitors: Number(summary?.uniqueVisitors || 0),
        toolClicks: Number(summary?.toolClicks || 0),
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
    if (request.method === "GET" && url.pathname === "/api/health") {
      return json(request, { ok: true, database: Boolean(env.DB) });
    }
    if (request.method === "POST" && url.pathname === "/api/events") {
      return insertEvents(request, env, ctx);
    }
    if (request.method === "GET" && url.pathname === "/api/summary") {
      return readSummary(request, env);
    }
    if (request.method === "GET" && url.pathname === "/") {
      return text(request, "归心访问统计服务正常");
    }
    return text(request, "Not found", 404);
  },
};
