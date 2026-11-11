// GET ?days=1|7|30|365 -> visit and click counts for owners.
import { json, ownerFrom, hasDb, q, istDay } from './_lib.js';

export async function GET(request) {
  if (!(await ownerFrom(request))) return json({ error: 'Please log in again.' }, 401);
  if (!hasDb()) return json({ error: 'Stats storage is not connected in Vercel yet.' }, 503);

  const days = Math.min(Math.max(parseInt(new URL(request.url).searchParams.get('days')) || 7, 1), 366);
  const fromDay = istDay(days - 1);
  const rows = await q('select field, sum(n)::int as n from svf_daily where day >= $1::date group by field', [fromDay]);

  const out = { totals: {}, sources: {}, places: {}, areas: {}, devices: {} };
  const group = { t: 'totals', src: 'sources', city: 'places', area: 'areas', dev: 'devices' };
  for (const { field, n } of rows) {
    const at = field.indexOf(':');
    const bucket = out[group[field.slice(0, at)]];
    if (bucket) bucket[field.slice(at + 1)] = n;
  }
  const since = Date.parse(fromDay + 'T00:00:00+05:30');
  const recent = (await q('select at, data from svf_recent where at >= $1 order by id desc limit 100', [since]))
    .map(r => ({ at: Number(r.at), ...(typeof r.data === 'string' ? JSON.parse(r.data) : r.data) }));
  return json({ days, ...out, recent });
}
