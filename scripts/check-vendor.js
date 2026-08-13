const crypto = require('node:crypto');
const fs = require('node:fs');

const expected = new Map([
  ['vendor/pdf-lib/pdf-lib.min.js', '0f9a5cad07941f0826586c94e089d89b918c46e5c17cf2d5a3c6f666e3bc694f'],
  ['vendor/pdfjs/pdf.min.mjs', '410b149eae133506e6c3f2764e95d5d444fa706bbc450d6e63060ea7605c707d'],
  ['vendor/pdfjs/pdf.worker.min.mjs', '094d2c8f779f6bc19d81bca80711748a63b4a95ffa79a5b67f9fcc6cd8c85e3b'],
]);

for (const [file, wanted] of expected) {
  const bytes = fs.readFileSync(file);
  const actual = crypto.createHash('sha256').update(bytes).digest('hex');
  if (actual !== wanted) throw new Error(`${file} checksum changed; regenerate intentionally and update scripts/check-vendor.js`);
}

console.log('Pinned vendor checksums: OK');
