export const COUNTRY_CODES = new Set((
  'AF AX AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BV BR IO BN BG BF BI CV KH CM CA KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF TF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HM VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS SS ES LK SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB UM US UY UZ VU VE VN VG VI WF EH YE ZM ZW ZZ'
).split(' '));

export const NOTICE_VERSION = '2026-08-14';

export function cleanDisplayName(value) {
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

export function cleanCountryCode(value) {
  const countryCode = String(value || '').trim().toUpperCase();
  if (!COUNTRY_CODES.has(countryCode)) throw new Error('Choose a valid country.');
  return countryCode;
}

export function cleanVisitorId(value) {
  if (value === undefined || value === null || value === '') return null;
  const id = String(value).toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)) {
    throw new Error('Visitor identifier is invalid.');
  }
  return id;
}

export function boundedInteger(value, name, minimum, maximum) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    throw new Error(`${name} is outside the accepted range.`);
  }
  return number;
}
