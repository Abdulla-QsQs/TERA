PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tera_visitors (
  id TEXT PRIMARY KEY,
  display_name TEXT,
  country_code TEXT NOT NULL CHECK (length(country_code) = 2),
  notice_version TEXT NOT NULL,
  created_at TEXT NOT NULL,
  CHECK (display_name IS NULL OR length(display_name) BETWEEN 2 AND 32)
);

CREATE TABLE IF NOT EXISTS tera_usage_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_id TEXT REFERENCES tera_visitors(id) ON DELETE SET NULL,
  booklet_count INTEGER NOT NULL CHECK (booklet_count BETWEEN 1 AND 100),
  source_pages INTEGER NOT NULL CHECK (source_pages BETWEEN 1 AND 100000),
  output_pages INTEGER NOT NULL CHECK (output_pages BETWEEN 1 AND 100000),
  pages_avoided INTEGER NOT NULL CHECK (pages_avoided >= 0),
  created_at TEXT NOT NULL,
  CHECK (pages_avoided = max(source_pages - output_pages, 0))
);

CREATE TABLE IF NOT EXISTS tera_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tera_rate_limits (
  bucket INTEGER NOT NULL,
  actor_hash TEXT NOT NULL,
  route TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1 CHECK (request_count > 0),
  created_at TEXT NOT NULL,
  PRIMARY KEY (bucket, actor_hash, route)
);

CREATE INDEX IF NOT EXISTS tera_visitors_created_at_idx ON tera_visitors(created_at DESC);
CREATE INDEX IF NOT EXISTS tera_usage_events_created_at_idx ON tera_usage_events(created_at DESC);
CREATE INDEX IF NOT EXISTS tera_usage_events_visitor_id_idx ON tera_usage_events(visitor_id);
CREATE INDEX IF NOT EXISTS tera_rate_limits_created_at_idx ON tera_rate_limits(created_at DESC);

INSERT INTO tera_meta (key, value) VALUES ('last_cleanup', '1970-01-01')
ON CONFLICT(key) DO NOTHING;
