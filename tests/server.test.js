const test = require('node:test');
const assert = require('node:assert/strict');
const { server, PUBLIC_FILES, ALLOWED_PDF_HOSTS, visitorStore } = require('../server.js');

let baseUrl;

test.before(async () => {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise(resolve => server.close(resolve));
});

test('public allowlist contains only intended runtime assets', () => {
  assert.ok(PUBLIC_FILES.has('/'));
  assert.ok(PUBLIC_FILES.has('/index.html'));
  assert.ok(PUBLIC_FILES.has('/TERA.html'));
  assert.ok(PUBLIC_FILES.has('/NOTICE.html'));
  assert.ok(PUBLIC_FILES.has('/robots.txt'));
  assert.ok(PUBLIC_FILES.has('/sitemap.xml'));
  assert.ok(PUBLIC_FILES.has('/core.js'));
  assert.ok(PUBLIC_FILES.has('/wall.css'));
  assert.ok(PUBLIC_FILES.has('/wall.js'));
  assert.ok(PUBLIC_FILES.has('/docs/IMPACT_METHOD.md'));
  assert.ok(PUBLIC_FILES.has('/THIRD_PARTY_NOTICES.md'));
  assert.ok(PUBLIC_FILES.has('/LICENSE'));
  assert.ok(PUBLIC_FILES.has('/LICENSES/README.md'));
  assert.ok(PUBLIC_FILES.has('/SUPPORT.md'));
  assert.ok(PUBLIC_FILES.has('/assets/student-study.jpg'));
  assert.ok(PUBLIC_FILES.has('/assets/paper-waste.jpg'));
  assert.ok(PUBLIC_FILES.has('/assets/forest-sunlight.jpg'));
  assert.ok(PUBLIC_FILES.has('/assets/leaf-emblem.jpg'));
  assert.ok(!PUBLIC_FILES.has('/README.md'));
  assert.deepEqual([...ALLOWED_PDF_HOSTS], ['pastpapers.papacambridge.com']);
});

test('health endpoint and security headers are present', async () => {
  const response = await fetch(`${baseUrl}/healthz`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status:'ok' });
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.match(response.headers.get('content-security-policy'), /default-src 'self'/);
  assert.doesNotMatch(response.headers.get('content-security-policy'), /allorigins|corsproxy|codetabs/);
});

test('runtime assets are self-hosted with safe content types', async () => {
  const landing = await fetch(`${baseUrl}/`);
  const html = await fetch(`${baseUrl}/TERA.html`);
  const core = await fetch(`${baseUrl}/core.js`);
  const pdfEngine = await fetch(`${baseUrl}/vendor/pdfjs/pdf.min.mjs`);
  const worker = await fetch(`${baseUrl}/vendor/pdfjs/pdf.worker.min.mjs`);
  const photo = await fetch(`${baseUrl}/assets/student-study.jpg`);
  const method = await fetch(`${baseUrl}/docs/IMPACT_METHOD.md`);
  assert.match(landing.headers.get('content-type'), /^text\/html/);
  const landingHtml = await landing.text();
  assert.match(landingHtml, /Free past-paper booklets/);
  assert.match(landingHtml, new RegExp(`<link rel="canonical" href="${baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\/">`));
  assert.doesNotMatch(landingHtml, /%%TERA_PUBLIC_URL%%/);
  assert.match(html.headers.get('content-type'), /^text\/html/);
  assert.match(core.headers.get('content-type'), /^text\/javascript/);
  assert.match(pdfEngine.headers.get('content-type'), /^text\/javascript/);
  assert.match(worker.headers.get('content-type'), /^text\/javascript/);
  assert.equal(photo.headers.get('content-type'), 'image/jpeg');
  assert.match(method.headers.get('content-type'), /^text\/markdown/);
  assert.doesNotMatch(await html.text(), /https?:\/\/[^'"\s>]+\.(?:js|mjs)(?:[?'"\s>]|$)/i);
});

test('search discovery files use the current public origin', async () => {
  const robots = await (await fetch(`${baseUrl}/robots.txt`)).text();
  const sitemap = await (await fetch(`${baseUrl}/sitemap.xml`)).text();
  assert.match(robots, /Allow: \//);
  assert.match(robots, new RegExp(`Sitemap: ${baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\/sitemap.xml`));
  assert.match(sitemap, new RegExp(`<loc>${baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\/TERA.html<\/loc>`));
  assert.doesNotMatch(sitemap, /%%TERA_PUBLIC_URL%%/);
});

test('private project files and traversal paths are not served', async () => {
  for (const pathname of ['/README.md', '/server.js', '/test-fixtures/9700_s23_gt.pdf', '/../package.json']) {
    const response = await fetch(`${baseUrl}${pathname}`);
    assert.equal(response.status, 404, pathname);
  }
});

test('relay rejects non-POST, invalid hosts, credentials, non-PDF targets, and foreign origins', async () => {
  const post = (url, headers = {}) => fetch(`${baseUrl}/api/pdf`, {
    method:'POST',
    headers:{ 'Content-Type':'application/json', ...headers },
    body:JSON.stringify({ url }),
  });
  assert.equal((await post('https://example.com/file.pdf')).status, 403);
  assert.equal((await post('https://user:pass@pastpapers.papacambridge.com/file.pdf')).status, 403);
  assert.equal((await post('https://pastpapers.papacambridge.com/file.html')).status, 400);
  assert.equal((await fetch(`${baseUrl}/api/pdf`)).status, 405);
  assert.equal((await post('https://pastpapers.papacambridge.com/file.pdf', { Origin:'https://evil.example' })).status, 403);
  assert.equal((await fetch(`${baseUrl}/api/pdf`, { method:'POST', body:'{}' })).status, 415);
});

test('welcome wall validates visitors and counts successful compilations without exposing names', async () => {
  visitorStore.resetMemoryStore();
  const post = (pathname, body, headers = {}) => fetch(`${baseUrl}${pathname}`, {
    method:'POST',
    headers:{ 'Content-Type':'application/json', ...headers },
    body:JSON.stringify(body),
  });

  assert.equal((await post('/api/wall/join', { displayName:'A', countryCode:'PK' })).status, 400);
  assert.equal((await post('/api/wall/join', { displayName:'Student One', countryCode:'XX' })).status, 400);
  assert.equal((await post('/api/wall/join', { displayName:'Student One', countryCode:'PK' }, { Origin:'https://evil.example' })).status, 403);

  const joinedResponse = await post('/api/wall/join', { displayName:'Student One', countryCode:'PK' });
  assert.equal(joinedResponse.status, 201);
  const joined = await joinedResponse.json();
  assert.match(joined.visitor.id, /^[0-9a-f-]{36}$/);
  assert.equal(joined.visitor.displayName, 'Student One');
  assert.equal(joined.stats.visitorCount, 1);

  assert.equal((await post('/api/wall/compile', {
    visitorId:joined.visitor.id,
    bookletCount:1,
    sourcePages:10,
    outputPages:0,
  })).status, 400);

  const usageResponse = await post('/api/wall/compile', {
    visitorId:joined.visitor.id,
    bookletCount:3,
    sourcePages:60,
    outputPages:48,
  });
  assert.equal(usageResponse.status, 201);
  const publicStats = await (await fetch(`${baseUrl}/api/wall`)).json();
  assert.deepEqual(publicStats, {
    visitorCount:1,
    compilationCount:3,
    pagesAvoided:12,
    countryCount:1,
    persistent:false,
  });
  assert.doesNotMatch(JSON.stringify(publicStats), /Student One/);
});
