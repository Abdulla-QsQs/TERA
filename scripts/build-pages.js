'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { PUBLIC_FILE_DEFINITIONS } = require('../runtime-manifest.js');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'dist');
const DEFAULT_PUBLIC_URL = 'https://tera-paper-compiler.pages.dev';

function normalizePublicUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error();
    return url.origin;
  } catch (_) {
    throw new Error('TERA_PUBLIC_URL must be a valid HTTPS origin.');
  }
}

const publicUrl = normalizePublicUrl(process.env.TERA_PUBLIC_URL || DEFAULT_PUBLIC_URL);
fs.rmSync(OUTPUT, { recursive:true, force:true });
fs.mkdirSync(OUTPUT, { recursive:true });

const copied = new Set();
for (const asset of PUBLIC_FILE_DEFINITIONS) {
  if (copied.has(asset.file)) continue;
  copied.add(asset.file);
  const source = path.join(ROOT, asset.file);
  const target = path.join(OUTPUT, asset.file);
  fs.mkdirSync(path.dirname(target), { recursive:true });
  if (asset.template) {
    const content = fs.readFileSync(source, 'utf8').replaceAll('%%TERA_PUBLIC_URL%%', publicUrl);
    fs.writeFileSync(target, content, 'utf8');
  } else {
    fs.copyFileSync(source, target);
  }
}

for (const filename of ['_headers', '_routes.json']) {
  fs.copyFileSync(path.join(ROOT, 'cloudflare', filename), path.join(OUTPUT, filename));
}

console.log(`Built ${copied.size} public files for ${publicUrl}`);
