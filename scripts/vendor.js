const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');

const root = path.resolve(__dirname, '..');
const pdfJsDir = path.join(root, 'vendor', 'pdfjs');
const pdfLibDir = path.join(root, 'vendor', 'pdf-lib');
fs.mkdirSync(pdfJsDir, { recursive: true });
fs.mkdirSync(pdfLibDir, { recursive: true });

esbuild.buildSync({
  entryPoints: [require.resolve('pdfjs-dist/legacy/build/pdf.mjs')],
  outfile: path.join(pdfJsDir, 'pdf.min.js'),
  bundle: true,
  minify: true,
  platform: 'browser',
  format: 'iife',
  globalName: 'pdfjsLib',
  target: ['chrome109', 'firefox115', 'safari16'],
  legalComments: 'eof',
});

fs.copyFileSync(
  require.resolve('pdfjs-dist/legacy/build/pdf.worker.min.mjs'),
  path.join(pdfJsDir, 'pdf.worker.min.mjs')
);
fs.copyFileSync(
  require.resolve('pdf-lib/dist/pdf-lib.min.js'),
  path.join(pdfLibDir, 'pdf-lib.min.js')
);

console.log('Pinned browser dependencies written to vendor/.');
