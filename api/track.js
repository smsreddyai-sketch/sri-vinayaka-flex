// POST { type, label, source, device } -> counts a visit or button click (public).
import { json, hasDb, q, istDay } from './_lib.js';

const TYPES = ['visit', 'call', 'whatsapp', 'quote', 'directions'];
const clean = (v, n = 80) => String(v || '').replace(/[\r\n|]/g, ' ').trim().slice(0, n);
let regionNames;
try { regionNames = new Intl.DisplayNames(['en'], { type: 'region' }); } catch (e) {}

export async function POST(request) {
  if (!hasDb()) return json({ ok: false });
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

  const fields = ['t:' + b.type, 'dev:' + device];
  if (b.type === 'visit') fields.push('src:' + source, 'city:' + place);
  else fields.push(`area:${b.type}|${label || '?'}`);

  await q(`insert into svf_daily (day, field, n) select $1::date, f, 1 from unnest($2::text[]) as f
           on conflict (day, field) do update set n = svf_daily.n + 1`, [istDay(), fields]);
  if (b.type !== 'visit') {
    await q('insert into svf_recent (at, data) values ($1, $2)', [Date.now(), JSON.stringify({ type: b.type, label, place, source, device })]);
  }
  if (Math.random() < 0.02) {   // occasional clean-up
    await q('delete from svf_recent where id < (select max(id) - 300 from svf_recent)');
    await q(`delete from svf_daily where day < current_date - 400`);
    await q('delete from svf_limits where expires_at < now()');
  }
  return json({ ok: true });
}
