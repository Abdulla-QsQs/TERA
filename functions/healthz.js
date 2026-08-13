import { jsonResponse, methodNotAllowed } from './_shared/http.mjs';

export function onRequest(context) {
  if (context.request.method !== 'GET' && context.request.method !== 'HEAD') return methodNotAllowed('GET, HEAD');
  return jsonResponse({ status:'ok' });
}
