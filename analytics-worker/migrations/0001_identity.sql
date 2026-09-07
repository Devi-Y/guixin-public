ALTER TABLE events ADD COLUMN member_id TEXT;

CREATE INDEX IF NOT EXISTS idx_events_site_member
  ON events (site, member_id, created_at DESC);

CREATE TABLE IF NOT EXISTS members (
  member_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('wecom')),
  display_name TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_members_last_seen
  ON members (last_seen_at DESC);

CREATE TABLE IF NOT EXISTS auth_states (
  state TEXT PRIMARY KEY,
  return_to TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_states_expires
  ON auth_states (expires_at);
