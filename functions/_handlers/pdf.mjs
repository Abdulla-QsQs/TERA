import { jsonResponse, methodNotAllowed, originAllowed, readJson, responseHeaders, textResponse, withinRateLimit } from '../_shared/http.mjs';

const MAX_PDF_BYTES = 25 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 60000;
const PDF_REQUESTS_PER_MINUTE = 60;

function retryAfterHeader(value, fallback = 15) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return String(Math.min(300, Math.ceil(numeric)));
  const date = Date.parse(String(value || ''));
  if (Number.isFinite(date)) return String(Math.min(300, Math.max(1, Math.ceil((date - Date.now()) / 1000))));
  return String(fallback);
}

function allowedHosts(env) {
  return new Set(String(env?.TERA_ALLOWED_PDF_HOSTS || 'pastpapers.papacambridge.com')
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean));
}

export async function onPdfRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') return methodNotAllowed('POST');
  if (!originAllowed(request, env)) return textResponse('Origin not allowed.', 403);
  if (!await withinRateLimit(context, { limit:PDF_REQUESTS_PER_MINUTE, periodSeconds:60 })) {
    return textResponse('TERA is receiving too many PDF requests from this connection. Try again shortly.', 429, {
      'Retry-After':'60',
      'X-TERA-Rate-Limit-Source':'tera',
    });
  }

  let input;
  try {
    input = await readJson(request);
  } catch (error) {
    return textResponse(error.message, error.statusCode || 400);
  }

  let target;
  try {
    target = new URL(input.url);
  } catch (_) {
    return textResponse('A valid PDF URL is required.', 400);
  }
  if (target.protocol !== 'https:' || target.username || target.password || !allowedHosts(env).has(target.hostname.toLowerCase())) {
    return textResponse('This PDF host is not allowed.', 403);
  }
  if (!/\.pdf$/i.test(target.pathname)) return textResponse('The target must be a PDF file.', 400);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const upstream = await fetch(target.toString(), {
      redirect:'manual',
      signal:controller.signal,
      headers:{ Accept:'application/pdf' },
    });
    if (upstream.status >= 300 && upstream.status < 400) return textResponse('Upstream redirects are not accepted.', 502);
    if (!upstream.ok) {
      const rateLimitHeaders = upstream.status === 429 ? {
        'Retry-After':retryAfterHeader(upstream.headers.get('retry-after')),
        'X-TERA-Rate-Limit-Source':'upstream',
      } : {};
      return textResponse(`Paper archive HTTP ${upstream.status}`, upstream.status, rateLimitHeaders);
    }
    const contentType = upstream.headers.get('content-type') || '';
    const length = Number(upstream.headers.get('content-length') || 0);
    if (!/^application\/pdf(?:;|$)/i.test(contentType)) return textResponse('Upstream response is not a PDF.', 415);
    if (length > MAX_PDF_BYTES) return textResponse('PDF is larger than 25 MB.', 413);
    if (!upstream.body) return textResponse('The PDF response was empty.', 502);

    let received = 0;
    const limiter = new TransformStream({
      transform(chunk, streamController) {
        received += chunk.byteLength;
        if (received > MAX_PDF_BYTES) streamController.error(new Error('PDF is larger than 25 MB.'));
        else streamController.enqueue(chunk);
      },
    });
    const headers = responseHeaders('application/pdf', {
      'Cache-Control':'private, max-age=86400',
      'Content-Disposition':'inline',
      ...(length ? { 'Content-Length':String(length) } : {}),
    });
    return new Response(upstream.body.pipeThrough(limiter), { status:200, headers });
  } catch (error) {
    return textResponse(
      error.name === 'AbortError' ? 'PDF request timed out.' : 'The source PDF could not be retrieved.',
      error.name === 'AbortError' ? 504 : 502,
    );
  } finally {
    clearTimeout(timeout);
  }
}
