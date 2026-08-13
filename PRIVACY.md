# Privacy notice

Last updated: 14 August 2026

TERA does not require an account and does not use advertising cookies, cross-site trackers, or third-party analytics.

Before first use, the welcome wall asks for a short display name and a country or region. Use a first name, nickname, or initials rather than a full legal name; "Prefer not to say" is available for country. TERA stores the display name, country code, a random visitor identifier, notice version, and submission time. Names are not shown in public totals. Production retention removes display names after 90 days and removes visitor and compilation records after 24 months.

When you use **Local Files**, the selected PDFs are processed in your browser. TERA does not upload those files to its application server.

When you use **Catalog** or **From Links**, TERA sends the requested source URL in the body of a request to its same-origin PDF relay, rather than exposing it in the request path. The relay streams the remote PDF to your browser and does not intentionally store the URL or PDF. Ordinary network metadata, including IP address and request time, may still be processed or temporarily logged by the hosting and source providers. Your browser may cache downloaded data under its own settings.

Generated booklets remain in browser memory until downloaded or the page is closed. When a compilation succeeds, TERA submits only the random visitor identifier, number of booklets, source-page total, output-page total, calculated pages avoided, and time. It does not submit PDF contents, filenames, paper titles, subject selections, source URLs, or generated files. Public counters expose aggregate visitor, booklet, page-avoidance, and country totals only.

The public beta is hosted by Cloudflare Pages, Functions, and D1. Cloudflare processes ordinary network metadata, including IP addresses, under its own policies. TERA does not store raw IP addresses. To protect its public APIs, it stores only a keyed, non-public hash derived from the connecting IP, route, and one-minute time bucket; those short-lived rate-limit rows are removed after ten minutes by the application retention pass. The same address produces a different value in each time bucket. The application-level D1 retention process removes display names after 90 days and visitor/compilation records after 24 months.

Do not process personal, confidential, or student-identifiable documents with the public beta. Privacy and deletion requests can be sent to `abdullahazam1077@gmail.com` with the subject `TERA privacy request`. Cloudflare's privacy and data-processing terms also apply to its hosting infrastructure.
