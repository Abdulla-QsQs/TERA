# Public release checklist

## P0 — must be complete before general public launch

- [x] License TERA's original source under MIT, add ZEROCTRL as copyright owner, and preserve separate dependency/media licenses.
- [x] Add the responsible operator identity plus privacy, security, support, and rights/takedown contact paths.
- [ ] Record the chosen host and update the privacy notice with its actual logging/retention terms.
- [ ] Run `docs/supabase-schema.sql`, configure the server-only secret, verify retention, and confirm the public totals survive a clean redeploy.
- [ ] Obtain and archive the permissions/terms assessment for every enabled source and transformation. A third-party host is not evidence of republication permission.
- [ ] Enable GitHub private vulnerability reporting, branch protection, required CI, secret scanning, and Dependabot alerts.
- [ ] Complete the 100-paper stratified visual validation with zero missing/duplicated/reordered/clipped content pages.
- [ ] Complete keyboard, 200% zoom, contrast, and screen-reader human tests.
- [ ] Run a limited staff-supervised pilot and close every high-severity finding.
- [ ] Publish a support path, incident response owner, takedown procedure, and service-status communication path.

## Technical release candidate

- [x] Browser dependencies are version-locked, self-hosted, and checksum-verified; the production container has no npm runtime packages.
- [x] Production dependency audit reports no known high-severity vulnerability.
- [x] The remote-PDF relay uses HTTPS, an exact host allowlist, size/time/rate limits, no redirects, and no credentialed URLs.
- [x] Public server files are explicitly allowlisted and security headers are present.
- [x] Anonymous third-party proxy fallbacks are removed.
- [x] Automated core/server tests and CI exist.
- [x] A minimal, non-root, dependency-free production container and health endpoint exist.
- [x] Test inputs and generated PDFs are excluded from Git.
- [x] The UI reports locally calculated source/output/page-avoidance totals.
- [x] The welcome wall and first-party usage endpoints validate inputs, expose aggregates only, and do not receive PDF contents, titles, or URLs.
- [x] Canonical metadata, structured data, Open Graph tags, robots.txt, and a sitemap are generated from the configured public origin.
- [ ] CI must pass on the eventual GitHub repository, including the container build.
- [ ] A clean deploy must pass live relay, browser, PDF-output, load, and printer tests.

## Release operation

- [ ] Supply every named owner/contact required above and review all public copy.
- [ ] Tag a release candidate and deploy it to a non-production URL.
- [ ] Run the human test matrix in `docs/PILOT_PLAN.md`.
- [ ] Back up the release artifact and rollback instructions.
- [ ] Approve launch in writing with named technical and content owners.
