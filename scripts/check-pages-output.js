'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { PUBLIC_FILE_DEFINITIONS } = require('../runtime-manifest.js');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'dist');
const expected = new Set(PUBLIC_FILE_DEFINITIONS.map(asset => asset.file));
const forbidden = ['README.md', 'server.js', 'visitor-store.js', 'package.json', 'render.yaml'];

for (const filename of expected) {
  if (!fs.existsSync(path.join(OUTPUT, filename))) throw new Error(`Missing Pages asset: ${filename}`);
}
for (const filename of forbidden) {
  if (fs.existsSync(path.join(OUTPUT, filename))) throw new Error(`Private file leaked into Pages output: ${filename}`);
}
for (const filename of ['index.html', 'TERA.html', 'robots.txt', 'sitemap.xml']) {
  const content = fs.readFileSync(path.join(OUTPUT, filename), 'utf8');
  if (content.includes('%%TERA_PUBLIC_URL%%')) throw new Error(`Unresolved public URL in ${filename}`);
}
const routes = JSON.parse(fs.readFileSync(path.join(OUTPUT, '_routes.json'), 'utf8'));
if (JSON.stringify(routes.include) !== JSON.stringify(['/api/*', '/healthz'])) {
  throw new Error('Pages Functions must remain restricted to API and health routes.');
}
console.log(`Verified ${expected.size} Cloudflare Pages assets and the function route boundary.`);
