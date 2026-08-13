const crypto = require('node:crypto');
const fs = require('node:fs');

const expected = new Map([
  ['vendor/pdf-lib/pdf-lib.min.js', '0f9a5cad07941f0826586c94e089d89b918c46e5c17cf2d5a3c6f666e3bc694f'],
  ['vendor/pdfjs/pdf.min.js', 'dc40fe677a714e2588c11d600b0ec2cd563e67187f212f526749deab3510f058'],
  ['vendor/pdfjs/pdf.worker.min.mjs', 'bc0d1b88ea0b66196b1d36a58ac243c6d92adfe725624e2a9fdd381bdf8ef434'],
]);

for (const [file, wanted] of expected) {
  const bytes = fs.readFileSync(file);
  const actual = crypto.createHash('sha256').update(bytes).digest('hex');
  if (actual !== wanted) throw new Error(`${file} checksum changed; regenerate intentionally and update scripts/check-vendor.js`);
}

console.log('Pinned vendor checksums: OK');
