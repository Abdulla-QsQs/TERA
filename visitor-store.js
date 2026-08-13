'use strict';

const crypto = require('node:crypto');

const COUNTRY_CODES = new Set((
  'AF AX AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BV BR IO BN BG BF BI CV KH CM CA KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF TF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HM VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS SS ES LK SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB UM US UY UZ VU VE VN VG VI WF EH YE ZM ZW ZZ'
).split(' '));

const SUPABASE_URL = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_KEY = String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '');
const PERSISTENT = Boolean(SUPABASE_URL && SUPABASE_KEY);
const NOTICE_VERSION = '2026-08-14';
const memoryVisitors = [];
const memoryUsage = [];

function cleanDisplayName(value) {
  if (value === undefined || value === null) return '';
  const cleaned = String(value)
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length > 32) throw new Error('Display name must be 32 characters or fewer.');
  if (cleaned && cleaned.length < 2) throw new Error('Display name must be at least 2 characters.');
  return cleaned;
}

function cleanCountryCode(value) {
  const countryCode = String(value || '').trim().toUpperCase();
  if (!COUNTRY_CODES.has(countryCode)) throw new Error('Choose a valid country.');
  return countryCode;
}

function cleanVisitorId(value) {
  if (value === undefined || value === null || value === '') return null;
  const id = String(value).toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)) {
    throw new Error('Visitor identifier is invalid.');
  }
  return id;
}

function boundedInteger(value, name, minimum, maximum) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    throw new Error(`${name} is outside the accepted range.`);
  }
  return number;
}

function supabaseHeaders(extra = {}) {
  return {
    apikey:SUPABASE_KEY,
    'Content-Type':'application/json',
    ...extra,
  };
}

async function supabaseRequest(route, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${route}`, {
    ...options,
    headers:supabaseHeaders(options.headers),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`Visitor store request failed (${response.status}): ${detail}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

async function joinVisitor(input = {}) {
  const displayName = cleanDisplayName(input.displayName);
  const countryCode = cleanCountryCode(input.countryCode);
  const visitor = {
    id:crypto.randomUUID(),
    display_name:displayName || null,
    country_code:countryCode,
    notice_version:NOTICE_VERSION,
    created_at:new Date().toISOString(),
  };

  if (PERSISTENT) {
    const rows = await supabaseRequest('tera_visitors?select=id,display_name,country_code,notice_version,created_at', {
      method:'POST',
      headers:{ Prefer:'return=representation' },
      body:JSON.stringify(visitor),
    });
    return rows[0];
  }

  memoryVisitors.push(visitor);
  if (memoryVisitors.length > 10000) memoryVisitors.shift();
  return visitor;
}

async function recordCompilation(input = {}) {
  const visitorId = cleanVisitorId(input.visitorId);
  const bookletCount = boundedInteger(input.bookletCount, 'Booklet count', 1, 100);
  const sourcePages = boundedInteger(input.sourcePages, 'Source-page count', 1, 100000);
  const outputPages = boundedInteger(input.outputPages, 'Output-page count', 1, 100000);
  const event = {
    visitor_id:visitorId,
    booklet_count:bookletCount,
    source_pages:sourcePages,
    output_pages:outputPages,
    pages_avoided:Math.max(0, sourcePages - outputPages),
    created_at:new Date().toISOString(),
  };

  if (PERSISTENT) {
    await supabaseRequest('tera_usage_events', {
      method:'POST',
      headers:{ Prefer:'return=minimal' },
      body:JSON.stringify(event),
    });
  } else {
    memoryUsage.push(event);
    if (memoryUsage.length > 50000) memoryUsage.shift();
  }
  return event;
}

function memoryStats() {
  return {
    visitorCount:memoryVisitors.length,
    compilationCount:memoryUsage.reduce((total, event) => total + event.booklet_count, 0),
    pagesAvoided:memoryUsage.reduce((total, event) => total + event.pages_avoided, 0),
    countryCount:new Set(memoryVisitors.filter(visitor => visitor.country_code !== 'ZZ').map(visitor => visitor.country_code)).size,
  };
}

async function getPublicStats() {
  if (!PERSISTENT) return { ...memoryStats(), persistent:false };
  const data = await supabaseRequest('rpc/tera_get_public_stats', { method:'POST', body:'{}' });
  return {
    visitorCount:Number(data.visitorCount || 0),
    compilationCount:Number(data.compilationCount || 0),
    pagesAvoided:Number(data.pagesAvoided || 0),
    countryCount:Number(data.countryCount || 0),
    persistent:true,
  };
}

function resetMemoryStore() {
  memoryVisitors.length = 0;
  memoryUsage.length = 0;
}

module.exports = {
  COUNTRY_CODES,
  PERSISTENT,
  cleanDisplayName,
  cleanCountryCode,
  joinVisitor,
  recordCompilation,
  getPublicStats,
  resetMemoryStore,
};
