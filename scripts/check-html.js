const fs = require('node:fs');

const html = fs.readFileSync('TERA.html', 'utf8');
const landing = fs.readFileSync('index.html', 'utf8');
const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter(match => !/type=["']application\/ld\+json["']/i.test(match[1]))
  .map(match => match[2])
  .filter(Boolean);
const landingScripts = [...landing.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter(match => !/type=["']application\/ld\+json["']/i.test(match[1]))
  .map(match => match[2])
  .filter(Boolean);

for (const source of scripts) new Function(source);
for (const source of landingScripts) new Function(source);
if (!html.includes('vendor/pdf-lib/pdf-lib.min.js')) throw new Error('Pinned pdf-lib asset is missing from TERA.html');
if (!html.includes('vendor/pdfjs/pdf.min.js')) throw new Error('Pinned pdf.js asset is missing from TERA.html');
if (!html.includes('core.js')) throw new Error('Testable TERA core is missing from TERA.html');
if (/https?:\/\/[^'"\s>]+\.(?:js|mjs)(?:[?'"\s>]|$)/i.test(html)) throw new Error('Remote executable script detected in TERA.html');
if (!landing.includes('href="TERA.html"')) throw new Error('Landing page does not link to the compiler');
if (!landing.includes('href="NOTICE.html"')) throw new Error('Landing page does not link to the public notice');
if (!landing.includes('class="skip-link"')) throw new Error('Landing page skip link is missing');
if (!landing.includes('rel="canonical"') || !landing.includes('application/ld+json')) throw new Error('Landing page SEO metadata is incomplete');
if (!landing.includes('data-tera-stat="visitors"')) throw new Error('Landing page usage counter is missing');
if (!html.includes('wall.js') || !html.includes('TERAUsage.recordCompilation')) throw new Error('Compiler usage reporting hook is missing');
if (!html.includes("typeof Promise.withResolvers !== 'function'")) throw new Error('iOS Safari Promise compatibility guard is missing');
if (!html.includes('isOffscreenCanvasSupported:false') || !html.includes('isImageDecoderSupported:false')) throw new Error('Conservative iOS PDF.js options are missing');
if (!html.includes('typeof canvas.toBlob === \'function\'')) throw new Error('iOS canvas export fallback is missing');
for (const asset of ['assets/student-study.jpg', 'assets/paper-waste.jpg', 'assets/forest-sunlight.jpg', 'assets/leaf-emblem.jpg']) {
  if (!landing.includes(asset)) throw new Error(`Landing page photo is missing: ${asset}`);
}
for (const forbidden of ['api.allorigins.win', 'corsproxy.io', 'api.codetabs.com']) {
  if (html.includes(forbidden)) throw new Error(`Anonymous proxy route reintroduced: ${forbidden}`);
}
for (const required of ['role="log"', 'role="status"', 'role="progressbar"', 'aria-live="polite"']) {
  if (!html.includes(required)) throw new Error(`Accessibility status hook is missing: ${required}`);
}
if (!html.includes('event.preventDefault();this.classList.add(\'over\')')) throw new Error('Drop-zone drag handler is not using the browser event');
console.log('TERA landing/compiler HTML and pinned dependencies: OK');
