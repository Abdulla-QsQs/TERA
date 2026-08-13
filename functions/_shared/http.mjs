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

export async function withinRateLimit(context) {
  if (!context.env?.RATE_LIMITER?.limit) return true;
  const client = context.request.headers.get('cf-connecting-ip') || 'unknown';
  const result = await context.env.RATE_LIMITER.limit({ key:client });
  return Boolean(result?.success);
}

export function methodNotAllowed(allow) {
  return textResponse('Method not allowed.', 405, { Allow:allow });
}
