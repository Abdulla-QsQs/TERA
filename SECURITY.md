# Security policy

## Supported version

Only the latest commit on the default branch is supported during the pilot.

## Reporting a vulnerability

Do not open a public issue for a security weakness. Use the repository's **Security → Report a vulnerability** flow. If that flow is unavailable, email `abdullahazam1077@gmail.com` with the subject `TERA security report`.

Include the affected URL or version, reproduction steps, impact, and a safe proof of concept. Do not include exam PDFs, student data, credentials, or destructive payloads. Expect acknowledgement within five working days during the pilot.

## Current boundaries

The same-origin PDF relay accepts targets only in a JSON POST body, accepts only HTTPS `.pdf` URLs on an explicit host allowlist, rejects redirects and credentials, limits responses to 25 MB, applies Cloudflare rate limiting, and does not persist PDF content. Uploaded local files are processed inside the browser. Static assets do not invoke Pages Functions, and dynamic routes fail closed when the Workers Free daily request allowance is exhausted.
