// POST { type, label, source, device } -> counts a visit or button click (public).
import { json, hasRedis, pipeline, istDay } from './_lib.js';

const TYPES = ['visit', 'call', 'whatsapp', 'quote', 'directions'];
const clean = (v, n = 80) => String(v || '').replace(/[\r\n|]/g, ' ').trim().slice(0, n);
let regionNames;
try { regionNames = new Intl.DisplayNames(['en'], { type: 'region' }); } catch (e) {}

export async function POST(request) {
  if (!hasRedis()) return json({ ok: false });
  const b = await request.json().catch(() => ({}));
  if (!TYPES.includes(b.type)) return json({ error: 'bad type' }, 400);

  const h = request.headers;
  const dec = v => { try { return decodeURIComponent(v || ''); } catch (e) { return v || ''; } };
  const city = clean(dec(h.get('x-vercel-ip-city')), 60);
  const cc = h.get('x-vercel-ip-country') || '';
  const country = cc ? (regionNames?.of(cc) || cc) : '';
  const place = [city, country].filter(Boolean).join(', ') || 'Unknown';
  const source = clean(b.source, 60) || 'Direct / unknown';
  const device = clean(b.device, 20) || 'Unknown';
  const label = clean(b.label);

  const key = 's:' + istDay();
  const cmds = [['HINCRBY', key, 't:' + b.type, 1], ['HINCRBY', key, 'dev:' + device, 1]];
  if (b.type === 'visit') {
    cmds.push(['HINCRBY', key, 'src:' + source, 1], ['HINCRBY', key, 'city:' + place, 1]);
  } else {
    cmds.push(['HINCRBY', key, `area:${b.type}|${label || '?'}`, 1]);
    cmds.push(['LPUSH', 'recent', JSON.stringify({ at: Date.now(), type: b.type, label, place, source, device })], ['LTRIM', 'recent', 0, 199]);
  }
  cmds.push(['EXPIRE', key, 400 * 86400]);
  await pipeline(cmds);
  return json({ ok: true });
}
