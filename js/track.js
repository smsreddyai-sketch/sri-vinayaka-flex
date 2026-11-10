// Records page visits and Call / WhatsApp / Quote / Directions clicks.
// Owners see the counts on /admin. City comes from Vercel on the server side.
(function () {
  const ss = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  };

  // Where the visitor came from (remembered for this browser session)
  function source() {
    const saved = ss.get('svf_src');
    if (saved) return saved;
    const params = new URLSearchParams(location.search);
    const ref = document.referrer && !document.referrer.startsWith(location.origin) ? document.referrer : '';
    let name = params.get('utm_source') || '';
    if (!name && ref) {
      const host = new URL(ref).hostname.replace(/^www\./, '');
      const map = [[/google\./, 'Google'], [/bing\./, 'Bing'], [/facebook|fb\./, 'Facebook'], [/instagram/, 'Instagram'],
                   [/whatsapp|wa\.me/, 'WhatsApp'], [/youtube/, 'YouTube'], [/t\.co$|twitter|x\.com/, 'Twitter/X'], [/justdial/, 'Justdial']];
      name = (map.find(([re]) => re.test(host)) || [null, host])[1];
    }
    name = name || 'Direct / unknown';
    ss.set('svf_src', name);
    return name;
  }

  const ua = navigator.userAgent;
  const device = /iPad|Tablet/i.test(ua) ? 'Tablet' : (/Mobi|Android|iPhone/i.test(ua) ? 'Mobile' : 'Desktop');

  function send(type, label) {
    const body = JSON.stringify({ type, label: (label || '').slice(0, 80), source: source(), device });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }))) return;
    } catch (e) {}
    fetch('/api/track', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body }).catch(() => {});
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

  send('visit', 'Home');

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
