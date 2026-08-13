const test = require('node:test');
const assert = require('node:assert/strict');

class MemoryD1 {
  constructor() {
    this.visitors = [];
    this.events = [];
    this.meta = new Map([['last_cleanup', '1970-01-01']]);
  }

  prepare(sql) {
    const database = this;
    const normalized = sql.replace(/\s+/g, ' ').trim();
    return {
      values:[],
      bind(...values) { this.values = values; return this; },
      async run() {
        if (normalized.startsWith('INSERT INTO tera_visitors')) {
          const [id, display_name, country_code, notice_version, created_at] = this.values;
          database.visitors.push({ id, display_name, country_code, notice_version, created_at });
        } else if (normalized.startsWith('INSERT INTO tera_usage_events')) {
          const [visitor_id, booklet_count, source_pages, output_pages, pages_avoided, created_at] = this.values;
          database.events.push({ visitor_id, booklet_count, source_pages, output_pages, pages_avoided, created_at });
        } else if (normalized.startsWith('INSERT INTO tera_meta')) {
          database.meta.set('last_cleanup', this.values[0]);
        }
        return { success:true };
      },
      async first() {
        if (normalized.startsWith("SELECT value FROM tera_meta")) {
          return { value:database.meta.get('last_cleanup') };
        }
        if (normalized.includes('AS visitor_count')) {
          return {
            visitor_count:database.visitors.length,
            compilation_count:database.events.reduce((sum, event) => sum + event.booklet_count, 0),
            pages_avoided:database.events.reduce((sum, event) => sum + event.pages_avoided, 0),
            country_count:new Set(database.visitors.filter(visitor => visitor.country_code !== 'ZZ').map(visitor => visitor.country_code)).size,
          };
        }
        return null;
      },
    };
  }

  async batch(statements) {
    for (const statement of statements) await statement.run();
    return statements.map(() => ({ success:true }));
  }
}

let validation;
let wallHandlers;
let pdfHandler;

test.before(async () => {
  validation = await import('../functions/_shared/validation.mjs');
  wallHandlers = await import('../functions/_handlers/wall.mjs');
  pdfHandler = await import('../functions/_handlers/pdf.mjs');
});

function context(pathname, method = 'GET', body, headers = {}) {
  const origin = 'https://tera-paper-compiler.pages.dev';
  return {
    request:new Request(`${origin}${pathname}`, {
      method,
      headers:{ ...(body === undefined ? {} : { 'Content-Type':'application/json' }), ...headers },
      body:body === undefined ? undefined : JSON.stringify(body),
    }),
    env:{ DB:new MemoryD1(), RATE_LIMITER:{ limit:async () => ({ success:true }) } },
  };
}

test('Cloudflare validation matches the local visitor rules', () => {
  assert.equal(validation.cleanDisplayName('  Student   One  '), 'Student One');
  assert.equal(validation.cleanCountryCode('pk'), 'PK');
  assert.throws(() => validation.cleanDisplayName('A'), /at least 2/);
  assert.throws(() => validation.cleanCountryCode('XX'), /valid country/);
  assert.throws(() => validation.boundedInteger(0, 'Output', 1, 100), /outside/);
});

test('Cloudflare wall handlers persist aggregate-only statistics', async () => {
  const shared = context('/api/wall/join', 'POST', { displayName:'Student One', countryCode:'PK' });
  const joinedResponse = await wallHandlers.onJoinRequest(shared);
  assert.equal(joinedResponse.status, 201);
  const joined = await joinedResponse.json();
  assert.match(joined.visitor.id, /^[0-9a-f-]{36}$/);
  assert.equal(joined.stats.persistent, true);

  shared.request = new Request('https://tera-paper-compiler.pages.dev/api/wall/compile', {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body:JSON.stringify({ visitorId:joined.visitor.id, bookletCount:3, sourcePages:60, outputPages:48 }),
  });
  const compiledResponse = await wallHandlers.onCompileRequest(shared);
  assert.equal(compiledResponse.status, 201);
  const compiled = await compiledResponse.json();
  assert.equal(compiled.pagesAvoided, 12);
  assert.deepEqual(compiled.stats, {
    visitorCount:1,
    compilationCount:3,
    pagesAvoided:12,
    countryCount:1,
    persistent:true,
  });
  assert.doesNotMatch(JSON.stringify(compiled.stats), /Student One/);
});

test('Cloudflare handlers reject foreign origins and invalid relay targets', async () => {
  const foreign = context('/api/wall/join', 'POST', { displayName:'Student One', countryCode:'PK' }, { Origin:'https://evil.example' });
  assert.equal((await wallHandlers.onJoinRequest(foreign)).status, 403);

  const invalidHost = context('/api/pdf', 'POST', { url:'https://example.com/file.pdf' });
  assert.equal((await pdfHandler.onPdfRequest(invalidHost)).status, 403);
  const credentials = context('/api/pdf', 'POST', { url:'https://user:pass@pastpapers.papacambridge.com/file.pdf' });
  assert.equal((await pdfHandler.onPdfRequest(credentials)).status, 403);
  const nonPdf = context('/api/pdf', 'POST', { url:'https://pastpapers.papacambridge.com/file.html' });
  assert.equal((await pdfHandler.onPdfRequest(nonPdf)).status, 400);
  assert.equal((await pdfHandler.onPdfRequest(context('/api/pdf'))).status, 405);
});

test('Cloudflare API responses retain the release security headers', async () => {
  const response = await wallHandlers.onStatsRequest(context('/api/wall'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.match(response.headers.get('content-security-policy'), /default-src 'self'/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
