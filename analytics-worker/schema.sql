CREATE TABLE IF NOT EXISTS events (
  event_id TEXT PRIMARY KEY,
  site TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'tool_click')),
  tool_id TEXT,
  device TEXT NOT NULL CHECK (device IN ('mobile', 'tablet', 'desktop')),
  referrer_origin TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_site_created_at
  ON events (site, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_site_visitor
  ON events (site, visitor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_site_tool
  ON events (site, tool_id, created_at DESC);
