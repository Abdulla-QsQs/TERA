'use strict';

(() => {
  const STORAGE_KEY = 'teraVisitor';
  const COUNTRY_CODES = (
    'AF AX AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BV BR IO BN BG BF BI CV KH CM CA KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF TF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HM VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS SS ES LK SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB UM US UY UZ VU VE VN VG VI WF EH YE ZM ZW'
  ).split(' ');
  const numberFormat = new Intl.NumberFormat();

  function savedVisitor() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return value && typeof value.id === 'string' ? value : null;
    } catch (_) {
      return null;
    }
  }

  function setStats(stats) {
    const values = {
      visitors:Number(stats.visitorCount || 0),
      compilations:Number(stats.compilationCount || 0),
      pages:Number(stats.pagesAvoided || 0),
      countries:Number(stats.countryCount || 0),
    };
    document.querySelectorAll('[data-tera-stat]').forEach(element => {
      const key = element.dataset.teraStat;
      if (Object.hasOwn(values, key)) element.textContent = numberFormat.format(values[key]);
    });
  }

  async function loadStats() {
    try {
      const response = await fetch('/api/wall', { headers:{ Accept:'application/json' } });
      if (!response.ok) return null;
      const stats = await response.json();
      setStats(stats);
      return stats;
    } catch (_) {
      return null;
    }
  }

  function countryOptions(select) {
    const names = typeof Intl.DisplayNames === 'function'
      ? new Intl.DisplayNames([navigator.language || 'en'], { type:'region' })
      : null;
    const countries = COUNTRY_CODES.map(code => ({ code, name:names?.of(code) || code }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const fragment = document.createDocumentFragment();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select country or region';
    placeholder.disabled = true;
    placeholder.selected = true;
    fragment.appendChild(placeholder);
    countries.forEach(country => {
      const option = document.createElement('option');
      option.value = country.code;
      option.textContent = country.name;
      fragment.appendChild(option);
    });
    const privateOption = document.createElement('option');
    privateOption.value = 'ZZ';
    privateOption.textContent = 'Prefer not to say';
    fragment.appendChild(privateOption);
    select.appendChild(fragment);
  }

  function trapFocus(event, card) {
    if (event.key !== 'Tab') return;
    const controls = [...card.querySelectorAll('input,select,button,a[href]')].filter(control => !control.disabled);
    if (!controls.length) return;
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function showWall() {
    if (savedVisitor()) return;
    const overlay = document.createElement('div');
    overlay.className = 'tera-wall-backdrop';
    overlay.innerHTML = `
      <section class="tera-wall-card" role="dialog" aria-modal="true" aria-labelledby="tera-wall-title" aria-describedby="tera-wall-intro">
        <div class="tera-wall-visual">
          <p class="tera-wall-brand">TERA</p>
          <h2 id="tera-wall-title">Join the practice-with-less-paper movement.</h2>
        </div>
        <div class="tera-wall-body">
          <p class="tera-wall-intro" id="tera-wall-intro">Choose a short display name and country so TERA can count real people—not page views. Your name is never shown on the public counter.</p>
          <div class="tera-wall-stats" aria-label="TERA community totals">
            <div class="tera-wall-stat"><strong data-tera-stat="visitors">0</strong><span>people joined</span></div>
            <div class="tera-wall-stat"><strong data-tera-stat="compilations">0</strong><span>booklets made</span></div>
            <div class="tera-wall-stat"><strong data-tera-stat="countries">0</strong><span>countries</span></div>
          </div>
          <form class="tera-wall-form">
            <div class="tera-wall-field">
              <label for="tera-wall-name">Display name</label>
              <input id="tera-wall-name" name="displayName" type="text" minlength="2" maxlength="32" autocomplete="nickname" required placeholder="First name, nickname or initials">
              <small>Do not enter your full legal name.</small>
            </div>
            <div class="tera-wall-field">
              <label for="tera-wall-country">Country or region</label>
              <select id="tera-wall-country" name="countryCode" autocomplete="country" required></select>
            </div>
            <label class="tera-wall-consent"><input name="consent" type="checkbox" required><span>I understand TERA stores this display name, country, and anonymous compilation totals as explained in the <a href="NOTICE.html" target="_blank" rel="noopener">Privacy &amp; Use Notice</a>.</span></label>
            <p class="tera-wall-error" role="alert"></p>
            <button class="tera-wall-submit" type="submit">Join and continue</button>
          </form>
          <p class="tera-wall-local" hidden>Local preview totals reset when this server restarts.</p>
        </div>
      </section>`;
    const card = overlay.querySelector('.tera-wall-card');
    const form = overlay.querySelector('form');
    const name = overlay.querySelector('#tera-wall-name');
    const country = overlay.querySelector('#tera-wall-country');
    const button = overlay.querySelector('button[type="submit"]');
    const error = overlay.querySelector('.tera-wall-error');
    countryOptions(country);
    document.body.appendChild(overlay);
    document.body.classList.add('tera-wall-open');
    const syncViewport = () => {
      const height = window.visualViewport?.height || window.innerHeight;
      overlay.style.setProperty('--tera-wall-height', `${Math.round(height)}px`);
    };
    syncViewport();
    window.visualViewport?.addEventListener('resize', syncViewport);
    window.addEventListener('orientationchange', syncViewport);
    card.addEventListener('keydown', event => trapFocus(event, card));
    setTimeout(() => name.focus(), 0);

    loadStats().then(stats => {
      if (stats && !stats.persistent && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
        overlay.querySelector('.tera-wall-local').hidden = false;
      }
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();
      error.textContent = '';
      button.disabled = true;
      button.textContent = 'Joining…';
      try {
        const response = await fetch('/api/wall/join', {
          method:'POST',
          headers:{ 'Content-Type':'application/json', Accept:'application/json' },
          body:JSON.stringify({ displayName:name.value, countryCode:country.value }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Could not join right now. Please try again.');
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          id:result.visitor.id,
          displayName:result.visitor.displayName,
          countryCode:result.visitor.countryCode,
        }));
        setStats(result.stats || {});
        window.visualViewport?.removeEventListener('resize', syncViewport);
        window.removeEventListener('orientationchange', syncViewport);
        overlay.remove();
        document.body.classList.remove('tera-wall-open');
        document.dispatchEvent(new CustomEvent('tera:visitor-ready', { detail:result.visitor }));
      } catch (requestError) {
        error.textContent = requestError.message;
        button.disabled = false;
        button.textContent = 'Join and continue';
      }
    });
  }

  async function recordCompilation({ bookletCount, sourcePages, outputPages }) {
    const visitor = savedVisitor();
    if (!visitor) return false;
    try {
      const response = await fetch('/api/wall/compile', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        keepalive:true,
        body:JSON.stringify({ visitorId:visitor.id, bookletCount, sourcePages, outputPages }),
      });
      if (!response.ok) return false;
      const result = await response.json();
      if (result.stats) setStats(result.stats);
      return true;
    } catch (_) {
      return false;
    }
  }

  window.TERAUsage = { loadStats, recordCompilation, visitor:savedVisitor };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { loadStats(); showWall(); }, { once:true });
  } else {
    loadStats();
    showWall();
  }
})();
