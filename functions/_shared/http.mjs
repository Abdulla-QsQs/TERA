const BASE_SECURITY_HEADERS = Object.freeze({
  'X-Content-Type-Options':'nosniff',
  'X-Frame-Options':'DENY',
  'Referrer-Policy':'no-referrer',
  'Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=()',
  'Cross-Origin-Opener-Policy':'same-origin',
  'Cross-Origin-Resource-Policy':'same-origin',
  'Strict-Transport-Security':'max-age=31536000; includeSubDomains',
  'Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; worker-src 'self' blob:; img-src 'self' blob: data:; connect-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
});

export function responseHeaders(contentType = 'text/plain; charset=utf-8', extra = {}) {
  return new Headers({ 'Content-Type':contentType, ...BASE_SECURITY_HEADERS, ...extra });
}

export function textResponse(body, status = 200, extra = {}) {
  return new Response(body, { status, headers:responseHeaders('text/plain; charset=utf-8', extra) });
}

export function jsonResponse(value, status = 200, extra = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers:responseHeaders('application/json; charset=utf-8', { 'Cache-Control':'no-store', ...extra }),
  });
}

export async function readJson(request, maximumBytes = 4096) {
  if (!/^application\/json(?:;|$)/i.test(request.headers.get('content-type') || '')) {
    throw clientError('JSON is required.', 415);
  }
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > maximumBytes) throw clientError('Request is too large.', 413);
  try {
    return JSON.parse(body);
  } catch (_) {
    throw clientError('A valid JSON request is required.', 400);
  }
}

export function clientError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export function originAllowed(request, env = {}) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    if (parsed.origin === new URL(request.url).origin) return true;
    const configured = String(env.TERA_ALLOWED_ORIGINS || '')
      .split(',')
      .map(value => value.trim().toLowerCase())
      .filter(Boolean);
    return configured.includes(parsed.origin.toLowerCase());
  } catch (_) {
    return false;
  }
}

async function shortLivedActorHash(secret, client, pathname, bucket) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name:'HMAC', hash:'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${client}\0${pathname}\0${bucket}`),
  );
  return Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function withinRateLimit(context, options = {}) {
  const limit = Number(options.limit || 60);
  const periodSeconds = Number(options.periodSeconds || 60);
  const nativeLimiter = context.env?.RATE_LIMITER;
  const client = context.request.headers.get('cf-connecting-ip');

  if (nativeLimiter?.limit && client) {
    try {
      const result = await nativeLimiter.limit({ key:client });
      return Boolean(result?.success);
    } catch (_) {
      // Continue to the D1 fallback when a configured platform binding is unavailable.
    }
  }

  const db = context.env?.DB;
  const secret = String(context.env?.RATE_LIMIT_SALT || '');
  if (!client || !db?.prepare || secret.length < 16) return true;

  try {
    const now = Date.now();
    const bucket = Math.floor(now / (periodSeconds * 1000));
    const pathname = new URL(context.request.url).pathname;
    const actorHash = await shortLivedActorHash(secret, client, pathname, bucket);
    const row = await db.prepare(`
      INSERT INTO tera_rate_limits
        (bucket, actor_hash, route, request_count, created_at)
      VALUES (?1, ?2, ?3, 1, ?4)
      ON CONFLICT(bucket, actor_hash, route)
      DO UPDATE SET request_count = request_count + 1
      RETURNING request_count
    `).bind(bucket, actorHash, pathname, new Date(now).toISOString()).first();
    return Number(row?.request_count || 0) <= limit;
  } catch (_) {
    // A configured production limiter must fail closed if its persistence is unhealthy.
    return false;
  }
}

export function methodNotAllowed(allow) {
  return textResponse('Method not allowed.', 405, { Allow:allow });
}
