'use strict';

const http = require('node:http');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { Readable, Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const visitorStore = require('./visitor-store.js');

const ROOT = __dirname;
const IS_MANAGED_HOST = Boolean(process.env.PORT);
const CONFIGURED_PUBLIC_URL = normalizePublicUrl(process.env.TERA_PUBLIC_URL || '');
const REQUESTED_PORT = Number(process.env.PORT || process.env.TERA_PORT || 4173);
const REQUESTED_HOST = process.env.TERA_HOST || (IS_MANAGED_HOST ? '0.0.0.0' : '127.0.0.1');
const MAX_PDF_BYTES = 25 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 60000;
const RATE_WINDOW_MS = 60000;
const RATE_MAX_REQUESTS = 60;
const ALLOWED_PDF_HOSTS = csvSet(process.env.TERA_ALLOWED_PDF_HOSTS || 'pastpapers.papacambridge.com');
const ALLOWED_ORIGINS = csvSet(process.env.TERA_ALLOWED_ORIGINS || '');
const PUBLIC_FILES = new Map([
  ['/', { file:'index.html', type:'text/html; charset=utf-8', template:true }],
  ['/index.html', { file:'index.html', type:'text/html; charset=utf-8', template:true }],
  ['/TERA.html', { file:'TERA.html', type:'text/html; charset=utf-8', template:true }],
  ['/NOTICE.html', { file:'NOTICE.html', type:'text/html; charset=utf-8' }],
  ['/robots.txt', { file:'robots.txt', type:'text/plain; charset=utf-8', template:true }],
  ['/sitemap.xml', { file:'sitemap.xml', type:'application/xml; charset=utf-8', template:true }],
  ['/core.js', { file:'core.js', type:'text/javascript; charset=utf-8' }],
  ['/wall.css', { file:'wall.css', type:'text/css; charset=utf-8' }],
  ['/wall.js', { file:'wall.js', type:'text/javascript; charset=utf-8' }],
  ['/docs/IMPACT_METHOD.md', { file:'docs/IMPACT_METHOD.md', type:'text/markdown; charset=utf-8' }],
  ['/THIRD_PARTY_NOTICES.md', { file:'THIRD_PARTY_NOTICES.md', type:'text/markdown; charset=utf-8' }],
  ['/LICENSE', { file:'LICENSE', type:'text/plain; charset=utf-8' }],
  ['/LICENSES/README.md', { file:'LICENSES/README.md', type:'text/markdown; charset=utf-8' }],
  ['/SUPPORT.md', { file:'SUPPORT.md', type:'text/markdown; charset=utf-8' }],
  ['/assets/student-study.jpg', { file:'assets/student-study.jpg', type:'image/jpeg', immutable:true }],
  ['/assets/paper-waste.jpg', { file:'assets/paper-waste.jpg', type:'image/jpeg', immutable:true }],
  ['/assets/forest-sunlight.jpg', { file:'assets/forest-sunlight.jpg', type:'image/jpeg', immutable:true }],
  ['/assets/leaf-emblem.jpg', { file:'assets/leaf-emblem.jpg', type:'image/jpeg', immutable:true }],
  ['/assets/circle-check-big.svg', { file:'assets/circle-check-big.svg', type:'image/svg+xml', immutable:true }],
  ['/assets/file-check.svg', { file:'assets/file-check.svg', type:'image/svg+xml', immutable:true }],
  ['/assets/chevron-down.svg', { file:'assets/chevron-down.svg', type:'image/svg+xml', immutable:true }],
  ['/assets/external-link.svg', { file:'assets/external-link.svg', type:'image/svg+xml', immutable:true }],
  ['/vendor/pdf-lib/pdf-lib.min.js', { file:'vendor/pdf-lib/pdf-lib.min.js', type:'text/javascript; charset=utf-8', immutable:true }],
  ['/vendor/pdfjs/pdf.min.js', { file:'vendor/pdfjs/pdf.min.js', type:'text/javascript; charset=utf-8', immutable:true }],
  ['/vendor/pdfjs/pdf.worker.min.mjs', { file:'vendor/pdfjs/pdf.worker.min.mjs', type:'text/javascript; charset=utf-8', immutable:true }],
]);
const rateBuckets = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of rateBuckets) {
    if (bucket.resetAt <= now) rateBuckets.delete(ip);
  }
}, RATE_WINDOW_MS).unref();

function csvSet(value) {
  return new Set(value.split(',').map(item => item.trim().toLowerCase()).filter(Boolean));
}

function normalizePublicUrl(value) {
  if (!value) return '';
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) return '';
    return parsed.origin;
  } catch (_) {
    return '';
  }
}

function publicUrlFor(req) {
  if (CONFIGURED_PUBLIC_URL) return CONFIGURED_PUBLIC_URL;
  const rawHost = String(req.headers.host || 'localhost').trim();
  const host = /^[a-z0-9.:[\]-]+$/i.test(rawHost) ? rawHost : 'localhost';
  const forwarded = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
  const protocol = IS_MANAGED_HOST && forwarded === 'https' ? 'https' : 'http';
  return `${protocol}://${host}`;
}

function securityHeaders(contentType = 'text/plain; charset=utf-8') {
  return {
    'Content-Type': contentType,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; worker-src 'self' blob:; img-src 'self' blob: data:; connect-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
  };
}

function send(res, status, body, headers = {}) {
  if (res.headersSent) return res.end();
  res.writeHead(status, { ...securityHeaders(), ...headers });
  res.end(body);
}

function sendJson(res, status, value) {
  send(res, status, JSON.stringify(value), {
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store',
  });
}

async function readJson(req, maximumBytes = 4096) {
  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) {
    const error = new Error('JSON is required.');
    error.statusCode = 415;
    throw error;
  }
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maximumBytes) {
      const error = new Error('Request is too large.');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (_) {
    const error = new Error('A valid JSON request is required.');
    error.statusCode = 400;
    throw error;
  }
}

function requestIp(req) {
  if (IS_MANAGED_HOST) {
    const raw = req.headers['x-forwarded-for'];
    const forwarded = Array.isArray(raw) ? raw[raw.length - 1] : raw;
    const nearest = forwarded?.split(',').at(-1)?.trim();
    if (nearest && net.isIP(nearest)) return nearest;
  }
  return req.socket.remoteAddress || 'unknown';
}

function withinRateLimit(req) {
  const now = Date.now();
  const ip = requestIp(req);
  const current = rateBuckets.get(ip);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(ip, { count:1, resetAt:now + RATE_WINDOW_MS });
    return true;
  }
  current.count += 1;
  return current.count <= RATE_MAX_REQUESTS;
}

function originAllowed(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    if (ALLOWED_ORIGINS.has(origin.toLowerCase())) return true;
    const host = req.headers.host;
    return host && parsed.host.toLowerCase() === host.toLowerCase();
  } catch (_) {
    return false;
  }
}

async function proxyPdf(req, res) {
  if (req.method !== 'POST') return send(res, 405, 'Method not allowed.', { Allow:'POST' });
  if (!originAllowed(req)) return send(res, 403, 'Origin not allowed.');
  if (!withinRateLimit(req)) return send(res, 429, 'Too many PDF requests. Try again shortly.', { 'Retry-After':'60' });

  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) return send(res, 415, 'JSON is required.');
  let raw;
  try {
    let size = 0;
    const chunks = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 4096) return send(res, 413, 'Request is too large.');
      chunks.push(chunk);
    }
    raw = JSON.parse(Buffer.concat(chunks).toString('utf8')).url;
  } catch (_) {
    return send(res, 400, 'A valid JSON request is required.');
  }
  let target;
  try {
    target = new URL(raw);
  } catch (_) {
    return send(res, 400, 'A valid PDF URL is required.');
  }
  if (target.protocol !== 'https:' || target.username || target.password || !ALLOWED_PDF_HOSTS.has(target.hostname.toLowerCase())) {
    return send(res, 403, 'This PDF host is not allowed.');
  }
  if (!/\.pdf$/i.test(target.pathname)) return send(res, 400, 'The target must be a PDF file.');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const abortIfIncomplete = () => {
    if (!res.writableEnded) controller.abort();
  };
  res.once('close', abortIfIncomplete);
  try {
    const upstream = await fetch(target, {
      redirect: 'error',
      signal: controller.signal,
      headers: { Accept:'application/pdf', 'User-Agent':'TERA/0.1' },
    });
    if (!upstream.ok) return send(res, upstream.status, `Upstream HTTP ${upstream.status}`);
    const contentType = upstream.headers.get('content-type') || '';
    const length = Number(upstream.headers.get('content-length') || 0);
    if (!/^application\/pdf(?:;|$)/i.test(contentType)) return send(res, 415, 'Upstream response is not a PDF.');
    if (length > MAX_PDF_BYTES) return send(res, 413, 'PDF is larger than 25 MB.');
    if (!upstream.body) return send(res, 502, 'The PDF response was empty.');

    res.writeHead(200, {
      ...securityHeaders('application/pdf'),
      ...(length ? { 'Content-Length':String(length) } : {}),
      'Cache-Control':'private, max-age=86400',
      'Content-Disposition':'inline',
    });
    let received = 0;
    const limiter = new Transform({
      transform(chunk, encoding, callback) {
        received += chunk.length;
        callback(received > MAX_PDF_BYTES ? new Error('PDF is larger than 25 MB.') : null, chunk);
      },
    });
    await pipeline(Readable.fromWeb(upstream.body), limiter, res);
  } catch (error) {
    const status = error.name === 'AbortError' ? 504 : 502;
    if (res.headersSent) res.destroy(error);
    else send(res, status, error.name === 'AbortError' ? 'PDF request timed out.' : 'The source PDF could not be retrieved.');
  } finally {
    res.off('close', abortIfIncomplete);
    clearTimeout(timeout);
  }
}

async function wallApi(req, res, pathname) {
  if (pathname === '/api/wall' && req.method === 'GET') {
    try {
      return sendJson(res, 200, await visitorStore.getPublicStats());
    } catch (error) {
      console.error('TERA visitor statistics failed:', error.message);
      return sendJson(res, 503, { error:'Usage totals are temporarily unavailable.' });
    }
  }

  if (req.method !== 'POST') return send(res, 405, 'Method not allowed.', { Allow:'POST' });
  if (!originAllowed(req)) return sendJson(res, 403, { error:'Origin not allowed.' });
  if (!withinRateLimit(req)) return sendJson(res, 429, { error:'Too many requests. Try again shortly.' });

  try {
    const input = await readJson(req);
    if (pathname === '/api/wall/join') {
      const visitor = await visitorStore.joinVisitor(input);
      const stats = await visitorStore.getPublicStats();
      return sendJson(res, 201, {
        visitor:{
          id:visitor.id,
          displayName:visitor.display_name || '',
          countryCode:visitor.country_code,
        },
        stats,
      });
    }
    if (pathname === '/api/wall/compile') {
      const event = await visitorStore.recordCompilation(input);
      const stats = await visitorStore.getPublicStats();
      return sendJson(res, 201, { pagesAvoided:event.pages_avoided, stats });
    }
    return sendJson(res, 404, { error:'Not found.' });
  } catch (error) {
    const isClientError = error.statusCode || /must|choose|invalid|outside|cannot exceed/i.test(error.message);
    if (!isClientError) console.error('TERA visitor store failed:', error.message);
    return sendJson(res, error.statusCode || (isClientError ? 400 : 503), {
      error:isClientError ? error.message : 'The usage counter is temporarily unavailable.',
    });
  }
}

function servePublicFile(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed.', { Allow:'GET, HEAD' });
  const asset = PUBLIC_FILES.get(pathname);
  if (!asset) return send(res, 404, 'Not found.');
  const resolved = path.join(ROOT, asset.file);
  fs.readFile(resolved, (error, data) => {
    if (error) return send(res, error.code === 'ENOENT' ? 404 : 500, 'Not found.');
    const body = asset.template
      ? Buffer.from(data.toString('utf8').replaceAll('%%TERA_PUBLIC_URL%%', publicUrlFor(req)), 'utf8')
      : data;
    const headers = {
      ...securityHeaders(asset.type),
      'Cache-Control':asset.immutable ? 'public, max-age=86400' : 'no-cache',
      'Content-Length':String(body.length),
    };
    res.writeHead(200, headers);
    res.end(req.method === 'HEAD' ? undefined : body);
  });
}

const server = http.createServer(async (req, res) => {
  let requestUrl;
  try {
    requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  } catch (_) {
    return send(res, 400, 'Bad request.');
  }
  if (requestUrl.pathname === '/healthz') return send(res, 200, JSON.stringify({ status:'ok' }), { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' });
  if (requestUrl.pathname === '/api/pdf') return proxyPdf(req, res);
  if (requestUrl.pathname === '/api/wall' || requestUrl.pathname === '/api/wall/join' || requestUrl.pathname === '/api/wall/compile') {
    return wallApi(req, res, requestUrl.pathname);
  }
  return servePublicFile(req, res, requestUrl.pathname);
});

function listen(port = REQUESTED_PORT, attemptsLeft = IS_MANAGED_HOST ? 0 : 20) {
  const onError = error => {
    if (error.code === 'EADDRINUSE' && attemptsLeft > 0) {
      server.off('error', onError);
      listen(port + 1, attemptsLeft - 1);
      return;
    }
    throw error;
  };
  server.once('error', onError);
  server.listen(port, REQUESTED_HOST, () => {
    server.off('error', onError);
    const displayHost = REQUESTED_HOST === '0.0.0.0' ? 'localhost' : REQUESTED_HOST;
    console.log(`TERA is ready at http://${displayHost}:${port}/`);
  });
}

if (require.main === module) {
  listen(REQUESTED_PORT);
  const shutdown = signal => {
    console.log(`${signal} received; closing TERA.`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

module.exports = { server, listen, PUBLIC_FILES, ALLOWED_PDF_HOSTS, visitorStore };
