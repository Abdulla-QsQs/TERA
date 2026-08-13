# Architecture

TERA is intentionally small:

1. `TERA.html` provides the established UI and runs all PDF inspection, blank-page detection, composition, threshold rendering, and downloads in the browser.
2. `core.js` contains deterministic parsing and impact calculations covered by unit tests.
3. `server.js` serves an explicit public-file allowlist, a restricted streaming relay for approved PDF hosts, and same-origin visitor/usage endpoints.
4. `visitor-store.js` validates the welcome-wall data and uses Supabase for production persistence, with an intentionally temporary in-memory fallback for local previews.
5. `vendor/` contains pinned browser bundles produced from the locked npm dependencies.

Local PDFs never cross the application server. Remote PDFs are streamed through the relay so browsers are not dependent on anonymous CORS proxies. TERA has no account system and no third-party analytics. Its first-party counter stores a display name, country code, random visitor identifier, and successful compilation totals; it never stores PDF contents, paper titles, or source URLs. Production persistence is enabled only when the server has Supabase credentials.

Exam-board support is adapter-based. Cambridge catalog URL generation is enabled. Other boards remain visible but disabled until exact manifests, representative testing, and content-rights review are complete.
