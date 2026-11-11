// Shared helpers for the owner page API. Files starting with "_" are not public routes.
import crypto from 'node:crypto';

// Main owners: always allowed and cannot be removed from the owner page.
// More owner emails can be added on /admin (stored in Redis set "owners").
export const BASE_OWNERS = ['smsreddyai@gmail.com', 'smsreddyabc@gmail.com', 'skr522522@gmail.com', 'skrmixingunit@gmail.com'];
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function isOwner(email) {
  email = String(email || '').trim().toLowerCase();
  if (BASE_OWNERS.includes(email)) return true;
  if (!hasRedis() || !EMAIL_RE.test(email)) return false;
  return (await redis('SISMEMBER', 'owners', email)) === 1;
}

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });

// ---------- Redis (Upstash, connected from the Vercel dashboard) ----------
const R_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const R_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
export const hasRedis = () => Boolean(R_URL && R_TOKEN);

export async function redis(...cmd) {
  const r = await fetch(R_URL, { method: 'POST', headers: { Authorization: `Bearer ${R_TOKEN}` }, body: JSON.stringify(cmd) });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

export async function pipeline(cmds) {
  if (!cmds.length) return [];
  const r = await fetch(R_URL + '/pipeline', { method: 'POST', headers: { Authorization: `Bearer ${R_TOKEN}` }, body: JSON.stringify(cmds) });
  const j = await r.json();
  return j.map(x => x.result);
}

// ---------- Signed tokens (no database needed for login) ----------
function secret() {
  const base = process.env.AUTH_SECRET || process.env.GMAIL_APP_PASSWORD;
  if (!base) throw new Error('Email login is not set up yet (GMAIL_APP_PASSWORD missing).');
  return crypto.createHash('sha256').update('svf-admin:' + base).digest();
}
const b64 = buf => Buffer.from(buf).toString('base64url');
export const hmac = text => b64(crypto.createHmac('sha256', secret()).update(text).digest());

export function sign(payload) {
  const body = b64(JSON.stringify(payload));
  return body + '.' + hmac(body);
}

export function verify(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = hmac(body);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  let payload;
  try { payload = JSON.parse(Buffer.from(body, 'base64url').toString()); } catch (e) { return null; }
  if (!payload || !payload.exp || payload.exp < Date.now()) return null;
  return payload;
}

// Returns the owner's email if the request carries a valid login session, else null.
export async function ownerFrom(request) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  try {
    const p = verify(token);
    return p && p.kind === 'session' && (await isOwner(p.email)) ? p.email : null;
  } catch (e) { return null; }
}

// Date in India time, e.g. "2026-11-10"; daysAgo = 0 for today.
export function istDay(daysAgo = 0) {
  return new Date(Date.now() + 5.5 * 3600e3 - daysAgo * 864e5).toISOString().slice(0, 10);
}
