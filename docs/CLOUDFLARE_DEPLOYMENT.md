# Cloudflare Free deployment

TERA's public deployment uses Cloudflare Pages, Pages Functions, D1, and a rate-limiter binding. Keep the account on **Workers Free**, do not attach a payment method, and do not upgrade to Workers Paid. Free dynamic limits fail closed instead of becoming usage charges.

## Pages project

- Project name: `tera-paper-compiler`
- Production branch: `main`
- Build command: `npm run build:pages`
- Build output: `dist`
- Root directory: repository root

The build copies only the files in `runtime-manifest.js`. `dist/_routes.json` restricts Function invocations to `/api/*` and `/healthz`, keeping all ordinary static requests outside the Workers request allowance.

## D1

Create a D1 database named `tera-production`, bind it to Pages Functions as `DB`, and apply `migrations/0001_tera.sql`. The application stores only welcome-wall records and successful aggregate compilation totals. It clears display names after 90 days and all visitor/usage rows after 24 months.

## Runtime bindings

- D1 binding `DB` -> `tera-production`
- Rate limiting binding `RATE_LIMITER` -> 60 requests per 60 seconds
- Optional text variable `TERA_ALLOWED_PDF_HOSTS` -> `pastpapers.papacambridge.com`
- Optional text variable `TERA_ALLOWED_ORIGINS` -> additional reviewed HTTPS origins only

Set the Pages Functions free-limit behavior to **fail closed**. Never put D1 identifiers, API tokens, secrets, or user data in HTML.

## Verification

Run before deployment:

```powershell
npm ci
npm run test:all
npm audit --audit-level=high
```

After deployment, verify `/healthz`, `/api/wall`, the welcome-wall join, one approved relay request, one local-file compilation, security headers, `robots.txt`, and `sitemap.xml`. Confirm the D1 totals survive a clean redeploy.
