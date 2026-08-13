import {
  NOTICE_VERSION,
  boundedInteger,
  cleanCountryCode,
  cleanDisplayName,
  cleanVisitorId,
} from './validation.mjs';

function requireDatabase(env) {
  if (!env?.DB?.prepare) {
    const error = new Error('The usage database is unavailable.');
    error.statusCode = 503;
    throw error;
  }
  return env.DB;
}

export async function joinVisitor(env, input = {}) {
  const db = requireDatabase(env);
  const visitor = {
    id:crypto.randomUUID(),
    display_name:cleanDisplayName(input.displayName) || null,
    country_code:cleanCountryCode(input.countryCode),
    notice_version:NOTICE_VERSION,
    created_at:new Date().toISOString(),
  };
  await db.prepare(`
    INSERT INTO tera_visitors (id, display_name, country_code, notice_version, created_at)
    VALUES (?1, ?2, ?3, ?4, ?5)
  `).bind(visitor.id, visitor.display_name, visitor.country_code, visitor.notice_version, visitor.created_at).run();
  return visitor;
}

export async function recordCompilation(env, input = {}) {
  const db = requireDatabase(env);
  const visitorId = cleanVisitorId(input.visitorId);
  const bookletCount = boundedInteger(input.bookletCount, 'Booklet count', 1, 100);
  const sourcePages = boundedInteger(input.sourcePages, 'Source-page count', 1, 100000);
  const outputPages = boundedInteger(input.outputPages, 'Output-page count', 1, 100000);
  const event = {
    visitor_id:visitorId,
    booklet_count:bookletCount,
    source_pages:sourcePages,
    output_pages:outputPages,
    pages_avoided:Math.max(0, sourcePages - outputPages),
    created_at:new Date().toISOString(),
  };
  await db.prepare(`
    INSERT INTO tera_usage_events
      (visitor_id, booklet_count, source_pages, output_pages, pages_avoided, created_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6)
  `).bind(
    event.visitor_id,
    event.booklet_count,
    event.source_pages,
    event.output_pages,
    event.pages_avoided,
    event.created_at,
  ).run();
  return event;
}

async function applyRetention(db) {
  const today = new Date().toISOString().slice(0, 10);
  const marker = await db.prepare("SELECT value FROM tera_meta WHERE key = 'last_cleanup'").first();
  if (marker?.value === today) return;
  await db.batch([
    db.prepare("UPDATE tera_visitors SET display_name = NULL WHERE display_name IS NOT NULL AND created_at < datetime('now', '-90 days')"),
    db.prepare("DELETE FROM tera_usage_events WHERE created_at < datetime('now', '-24 months')"),
    db.prepare("DELETE FROM tera_visitors WHERE created_at < datetime('now', '-24 months')"),
    db.prepare("DELETE FROM tera_rate_limits WHERE created_at < datetime('now', '-10 minutes')"),
    db.prepare("INSERT INTO tera_meta (key, value) VALUES ('last_cleanup', ?1) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(today),
  ]);
}

export async function getPublicStats(env) {
  const db = requireDatabase(env);
  await applyRetention(db);
  const row = await db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM tera_visitors) AS visitor_count,
      (SELECT COALESCE(SUM(booklet_count), 0) FROM tera_usage_events) AS compilation_count,
      (SELECT COALESCE(SUM(pages_avoided), 0) FROM tera_usage_events) AS pages_avoided,
      (SELECT COUNT(DISTINCT country_code) FROM tera_visitors WHERE country_code <> 'ZZ') AS country_count
  `).first();
  return {
    visitorCount:Number(row?.visitor_count || 0),
    compilationCount:Number(row?.compilation_count || 0),
    pagesAvoided:Number(row?.pages_avoided || 0),
    countryCount:Number(row?.country_count || 0),
    persistent:true,
  };
}
