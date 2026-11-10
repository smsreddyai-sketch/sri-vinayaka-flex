// Records page visits and Call / WhatsApp / Quote / Directions clicks in Supabase
// so owners can see them on admin.html. Needs js/config.js loaded first.
(function () {
  const cfg = window.SVF_CONFIG;
  if (!cfg || cfg.SUPABASE_URL.includes('YOUR-PROJECT')) return;

  const ss = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  };

  // Where the visitor came from
  function source() {
    const saved = ss.get('svf_src');
    if (saved) return JSON.parse(saved);
    const params = new URLSearchParams(location.search);
    const ref = document.referrer && !document.referrer.startsWith(location.origin) ? document.referrer : '';
    let name = params.get('utm_source') || '';
    if (!name && ref) {
      const host = new URL(ref).hostname.replace(/^www\./, '');
      const map = [[/google\./, 'Google'], [/bing\./, 'Bing'], [/facebook|fb\./, 'Facebook'], [/instagram/, 'Instagram'],
                   [/whatsapp|wa\.me/, 'WhatsApp'], [/youtube/, 'YouTube'], [/t\.co$|twitter|x\.com/, 'Twitter/X'], [/justdial/, 'Justdial']];
      name = (map.find(([re]) => re.test(host)) || [null, host])[1];
    }
    const s = { source: name || 'Direct / unknown', referrer: ref.slice(0, 500) };
    ss.set('svf_src', JSON.stringify(s));
    return s;
  }

  // Approximate city (cached for the browser session)
  const geo = (async () => {
    const saved = ss.get('svf_geo');
    if (saved) return JSON.parse(saved);
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 3000);
      const r = await fetch('https://ipapi.co/json/', { signal: ctrl.signal });
      const j = await r.json();
      const g = { city: j.city || null, region: j.region || null, country: j.country_name || null };
      ss.set('svf_geo', JSON.stringify(g));
      return g;
    } catch (e) { return { city: null, region: null, country: null }; }
  })();

  const device = /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'Mobile' : (/iPad|Tablet/i.test(navigator.userAgent) ? 'Tablet' : 'Desktop');

  async function send(type, label) {
    const g = await geo;
    const s = source();
    const body = { type, label: (label || '').slice(0, 100), page: location.pathname.slice(0, 200), source: s.source, referrer: s.referrer, device, ...g };
    fetch(cfg.SUPABASE_URL + '/rest/v1/site_events', {
      method: 'POST', keepalive: true,
      headers: { 'Content-Type': 'application/json', apikey: cfg.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + cfg.SUPABASE_ANON_KEY, Prefer: 'return=minimal' },
      body: JSON.stringify(body)
    }).catch(() => {});
  }

  // Which part of the page the button is in
  function area(el) {
    if (el.closest('header')) return 'Top menu';
    if (el.closest('.mobile-bar')) return 'Mobile bottom bar';
    if (el.closest('.wa-float')) return 'Floating button';
    if (el.closest('.hero')) return 'Top banner';
    if (el.closest('footer')) return 'Footer';
    const sec = el.closest('section[id]');
    return sec ? sec.id.charAt(0).toUpperCase() + sec.id.slice(1) : 'Page';
  }

  send('visit', document.title);

  document.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    let type = null;
    if (href.startsWith('tel:')) type = 'call';
    else if (href.includes('wa.me')) type = 'whatsapp';
    else if (href.includes('google.com/maps')) type = 'directions';
    if (type) send(type, area(a));
  });

  const form = document.getElementById('quoteForm');
  if (form) form.addEventListener('submit', () => send('quote', document.getElementById('qType').value));
})();
