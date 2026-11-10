// GET ?days=1|7|30|365 -> visit and click counts for owners.
import { json, ownerFrom, hasRedis, pipeline, redis, istDay } from './_lib.js';

export async function GET(request) {
  if (!ownerFrom(request)) return json({ error: 'Please log in again.' }, 401);
  if (!hasRedis()) return json({ error: 'Stats storage is not connected in Vercel yet.' }, 503);

  const days = Math.min(Math.max(parseInt(new URL(request.url).searchParams.get('days')) || 7, 1), 366);
  const keys = Array.from({ length: days }, (_, i) => 's:' + istDay(i));
  const hashes = await pipeline(keys.map(k => ['HGETALL', k]));

  const out = { totals: {}, sources: {}, places: {}, areas: {}, devices: {} };
  const group = { t: 'totals', src: 'sources', city: 'places', area: 'areas', dev: 'devices' };
  for (const flat of hashes) {
    if (!Array.isArray(flat)) continue;
    for (let i = 0; i < flat.length; i += 2) {
      const field = flat[i], n = Number(flat[i + 1]) || 0;
      const at = field.indexOf(':');
      const bucket = out[group[field.slice(0, at)]];
      if (!bucket) continue;
      const name = field.slice(at + 1);
      bucket[name] = (bucket[name] || 0) + n;
    }
  }
  const since = days === 1 ? Date.parse(istDay(0) + 'T00:00:00+05:30') : Date.now() - days * 864e5;
  const recent = ((await redis('LRANGE', 'recent', 0, 199)) || [])
    .map(s => { try { return JSON.parse(s); } catch (e) { return null; } })
    .filter(e => e && e.at >= since).slice(0, 100);
  return json({ days, ...out, recent });
}
