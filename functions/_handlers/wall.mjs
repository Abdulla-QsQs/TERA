import { jsonResponse, methodNotAllowed, originAllowed, readJson, withinRateLimit } from '../_shared/http.mjs';
import { getPublicStats, joinVisitor, recordCompilation } from '../_shared/store.mjs';

function errorResponse(error) {
  const isClientError = error.statusCode || /must|choose|invalid|outside|cannot exceed/i.test(error.message);
  return jsonResponse({
    error:isClientError ? error.message : 'The usage counter is temporarily unavailable.',
  }, error.statusCode || (isClientError ? 400 : 503));
}

export async function onStatsRequest(context) {
  if (context.request.method !== 'GET') return methodNotAllowed('GET');
  try {
    return jsonResponse(await getPublicStats(context.env));
  } catch (error) {
    return errorResponse(error);
  }
}

async function onMutation(context, action) {
  if (context.request.method !== 'POST') return methodNotAllowed('POST');
  if (!originAllowed(context.request, context.env)) return jsonResponse({ error:'Origin not allowed.' }, 403);
  if (!await withinRateLimit(context, { limit:20, periodSeconds:60 })) {
    return jsonResponse({ error:'Too many requests. Try again shortly.' }, 429, { 'Retry-After':'60' });
  }
  try {
    const input = await readJson(context.request);
    if (action === 'join') {
      const visitor = await joinVisitor(context.env, input);
      return jsonResponse({
        visitor:{ id:visitor.id, displayName:visitor.display_name || '', countryCode:visitor.country_code },
        stats:await getPublicStats(context.env),
      }, 201);
    }
    const event = await recordCompilation(context.env, input);
    return jsonResponse({ pagesAvoided:event.pages_avoided, stats:await getPublicStats(context.env) }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

export const onJoinRequest = context => onMutation(context, 'join');
export const onCompileRequest = context => onMutation(context, 'compile');
