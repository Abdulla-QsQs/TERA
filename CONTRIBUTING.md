# Contributing

Keep the compact original TERA interface unless a change is required for correctness, accessibility, privacy, or security.

Before submitting a change:

1. Run `npm ci` and `npm run test:all`.
2. Compile at least one lawful local QP/MS test pair.
3. Visually inspect the question-paper boundaries, every retained content page, mark-scheme order and legibility, cover handling, thresholds, and page counts.
4. Do not commit source exam PDFs, generated booklets, user data, credentials, or analytics identifiers.
5. Add or update tests for parsing, catalog, impact, or server behavior.

Catalog additions need a documented URL rule or manifest, representative samples across years/sessions/variants, and a rights/terms review. Do not enable an exam board merely because a guessed URL works once.

Unless clearly stated otherwise, a contribution intentionally submitted for
inclusion in TERA is provided under the project's MIT License. Contributors
must have the right to submit their code, documentation, and assets and must
identify any third-party material and its license.
