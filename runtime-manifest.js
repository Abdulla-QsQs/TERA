'use strict';

const PUBLIC_FILE_DEFINITIONS = [
  { route:'/', file:'index.html', type:'text/html; charset=utf-8', template:true },
  { route:'/index.html', file:'index.html', type:'text/html; charset=utf-8', template:true },
  { route:'/TERA.html', file:'TERA.html', type:'text/html; charset=utf-8', template:true },
  { route:'/NOTICE.html', file:'NOTICE.html', type:'text/html; charset=utf-8' },
  { route:'/robots.txt', file:'robots.txt', type:'text/plain; charset=utf-8', template:true },
  { route:'/sitemap.xml', file:'sitemap.xml', type:'application/xml; charset=utf-8', template:true },
  { route:'/core.js', file:'core.js', type:'text/javascript; charset=utf-8' },
  { route:'/wall.css', file:'wall.css', type:'text/css; charset=utf-8' },
  { route:'/wall.js', file:'wall.js', type:'text/javascript; charset=utf-8' },
  { route:'/docs/IMPACT_METHOD.md', file:'docs/IMPACT_METHOD.md', type:'text/markdown; charset=utf-8' },
  { route:'/THIRD_PARTY_NOTICES.md', file:'THIRD_PARTY_NOTICES.md', type:'text/markdown; charset=utf-8' },
  { route:'/LICENSE', file:'LICENSE', type:'text/plain; charset=utf-8' },
  { route:'/LICENSES/README.md', file:'LICENSES/README.md', type:'text/markdown; charset=utf-8' },
  { route:'/SUPPORT.md', file:'SUPPORT.md', type:'text/markdown; charset=utf-8' },
  { route:'/assets/student-study.jpg', file:'assets/student-study.jpg', type:'image/jpeg', immutable:true },
  { route:'/assets/paper-waste.jpg', file:'assets/paper-waste.jpg', type:'image/jpeg', immutable:true },
  { route:'/assets/forest-sunlight.jpg', file:'assets/forest-sunlight.jpg', type:'image/jpeg', immutable:true },
  { route:'/assets/leaf-emblem.jpg', file:'assets/leaf-emblem.jpg', type:'image/jpeg', immutable:true },
  { route:'/assets/circle-check-big.svg', file:'assets/circle-check-big.svg', type:'image/svg+xml', immutable:true },
  { route:'/assets/file-check.svg', file:'assets/file-check.svg', type:'image/svg+xml', immutable:true },
  { route:'/assets/chevron-down.svg', file:'assets/chevron-down.svg', type:'image/svg+xml', immutable:true },
  { route:'/assets/external-link.svg', file:'assets/external-link.svg', type:'image/svg+xml', immutable:true },
  { route:'/vendor/pdf-lib/pdf-lib.min.js', file:'vendor/pdf-lib/pdf-lib.min.js', type:'text/javascript; charset=utf-8', immutable:true },
  { route:'/vendor/pdfjs/pdf.min.js', file:'vendor/pdfjs/pdf.min.js', type:'text/javascript; charset=utf-8', immutable:true },
  { route:'/vendor/pdfjs/pdf.worker.min.mjs', file:'vendor/pdfjs/pdf.worker.min.mjs', type:'text/javascript; charset=utf-8', immutable:true },
];

module.exports = { PUBLIC_FILE_DEFINITIONS };
