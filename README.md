# TERA

[![CI](https://github.com/Abdulla-QsQs/TERA/actions/workflows/ci.yml/badge.svg)](https://github.com/Abdulla-QsQs/TERA/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-dff47e.svg)](LICENSE)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-43853d.svg)](https://nodejs.org/)

**Live public beta:** [tera-paper-compiler.pages.dev](https://tera-paper-compiler.pages.dev/)

TERA turns lawfully acquired question papers and mark schemes into print-efficient practice booklets. It preserves non-blank question-paper pages, removes mark-scheme cover/generic-guidance pages, and places two real marking pages on adaptive portrait/landscape A4 sheets while keeping the original compact interface.

TERA is available as a public beta. Generated booklets must still be reviewed before printing, and institutions should complete the human, rights, accessibility, and printer checks in [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) before broad supervised use.

## Run locally

Requirements: Node.js 20 or newer.

```powershell
npm ci
npm start
```

Open the address printed in the terminal. On Windows, after dependencies have been installed once, `Start TERA.bat` starts the same restricted local server.

The root address opens the public landing page. Select **Open the compiler** to enter the unchanged compact TERA interface at `/TERA.html`.

## Workflow

1. Choose a supported catalog selection, paste QP/MS links, or select correctly named local PDFs.
2. Compile the detected pairs. Review the output before printing.
3. Save individual booklets or build one Mega PDF from at least two successful booklets.
4. Read the activity-log impact line for the exact source/output page comparison. Successful compilation totals are also sent to TERA's first-party aggregate counter; PDF contents, titles, and URLs are not included.

Local files are processed inside the browser. Catalog/link downloads use TERA's same-origin relay, which accepts only configured HTTPS PDF hosts; anonymous public CORS proxies are not used. No exam PDFs or generated outputs belong in this repository.

The default relay allowlist contains only `pastpapers.papacambridge.com`. Other parsed link hosts will not download unless the operator deliberately reviews them and changes `TERA_ALLOWED_PDF_HOSTS`; use Local Files for lawfully acquired documents from other sources.

## Supported catalog status

Cambridge International AS & A Level, IGCSE, and O Level URL generation is enabled for the current PapaCambridge adapter. Pearson Edexcel, OxfordAQA, AQA, OCR, and WJEC/Eduqas are visible but intentionally disabled until exact historical manifests, representative tests, and rights/terms review are complete. A visible subject name is not a promise that its files exist at every generated URL.

## Verification

```powershell
npm run test:all
npm audit --omit=dev --audit-level=high
docker build --tag tera .
```

CI installs locked maintainer dependencies with lifecycle scripts disabled, verifies committed vendor checksums, runs the same checks, audits the full dependency tree, and builds the production container. The container itself contains no npm packages. The app exposes `/healthz`; the public server serves only an explicit runtime-file allowlist.

Maintainers only: `npm run vendor` intentionally regenerates the pinned browser bundles. Review the diff, update `scripts/check-vendor.js` checksums, run the full browser/PDF test matrix, and include upstream notices before accepting it.

## Production deployment

The public deployment targets the Cloudflare Free plan. `npm run build:pages` creates an explicit static allowlist in `dist/`; Pages serves those files without invoking a Function. Only `/api/*` and `/healthz` invoke Pages Functions. The restricted relay streams approved PDFs, the welcome wall stores aggregate activity in D1, and short-lived D1 rate counters use rotating keyed hashes without storing raw IP addresses.

See [Cloudflare deployment](docs/CLOUDFLARE_DEPLOYMENT.md) for the exact project, D1, migration, binding, and fail-closed settings. Do not attach a payment method or upgrade the Workers plan for the free deployment. At the Free-plan limits, dynamic requests fail until the allowance resets rather than becoming paid usage.

`Dockerfile` and the local Node server remain provider-neutral fallback artifacts. A non-Cloudflare operator can optionally configure Supabase using [`docs/supabase-schema.sql`](docs/supabase-schema.sql); without those credentials, local preview counters intentionally reset when the process restarts.

Treat deployments as public-beta pilots until the remaining rights, accessibility, and supervised-school checks in the P0 checklist are signed off.

## Project policies

- [Privacy](PRIVACY.md)
- [Content and acceptable use](CONTENT_POLICY.md)
- [Security](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Impact methodology](docs/IMPACT_METHOD.md)
- [School pilot](docs/PILOT_PLAN.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)
- [License map](LICENSES/README.md)
- [Support](SUPPORT.md)

## License

TERA's original source code and documentation are released under the
[MIT License](LICENSE), copyright 2026 ZEROCTRL. Bundled libraries, icons, and
photographs retain their separate terms in [LICENSES](LICENSES/README.md) and
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). This repository license does
not grant rights to exam papers, mark schemes, thresholds, board names, or
documents processed with TERA.

TERA is independent and is not affiliated with or endorsed by any examination board or source website.
