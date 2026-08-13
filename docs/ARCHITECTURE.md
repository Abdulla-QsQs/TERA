# Architecture

TERA is intentionally small:

1. `TERA.html` provides the established UI and runs all PDF inspection, blank-page detection, composition, threshold rendering, and downloads in the browser.
2. `core.js` contains deterministic parsing and impact calculations covered by unit tests.
3. `functions/` provides Cloudflare Pages Functions for the restricted PDF stream, aggregate welcome-wall endpoints, and health checks.
4. Cloudflare D1 stores production visitor/usage records. The Cloudflare rate-limiter binding protects mutations and PDF requests without writing IP addresses to D1.
5. `server.js` and `visitor-store.js` provide the equivalent restricted local/Docker workflow, with an intentionally temporary in-memory fallback unless an operator supplies Supabase credentials.
6. `runtime-manifest.js` is the single static-file allowlist used by both the Node server and the Cloudflare build.
5. `vendor/` contains pinned browser bundles produced from the locked npm dependencies.

Local PDFs never cross the application server. Remote PDFs are streamed through the relay so browsers are not dependent on anonymous CORS proxies. TERA has no account system and no third-party analytics. Its first-party counter stores a display name, country code, random visitor identifier, and successful compilation totals; it never stores PDF contents, paper titles, or source URLs. Production retention clears display names after 90 days and visitor/usage rows after 24 months.

Exam-board support is adapter-based. Cambridge catalog URL generation is enabled. Other boards remain visible but disabled until exact manifests, representative testing, and content-rights review are complete.
