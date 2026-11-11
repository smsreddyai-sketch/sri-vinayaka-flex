// Shared helpers for the owner page API. Files starting with "_" are not public routes.
// No database: photos and the extra-owner list are files in Vercel Blob.
import crypto from 'node:crypto';
import { put, head } from '@vercel/blob';

// Main owners: always allowed and cannot be removed from the owner page.
export const BASE_OWNERS = ['smsreddyai@gmail.com', 'smsreddyabc@gmail.com', 'skr522522@gmail.com', 'skrmixingunit@gmail.com'];
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const hasBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });

// ---------- Extra owners (added on /admin), kept in a Blob file with an unguessable name ----------
const ownersPath = () => `config/owners-${hmac('owners-file').slice(0, 24)}.json`;
let cache = { at: 0, list: null };

export async function addedOwners() {
  if (!hasBlob()) return [];
  if (cache.list && Date.now() - cache.at < 15e3) return cache.list;
  let list = [];
  try {
    const info = await head(ownersPath());
    const r = await fetch(info.url + '?t=' + Date.now(), { cache: 'no-store' });
    if (r.ok) list = await r.json();
  } catch (e) { /* file not created yet */ }
  cache = { at: Date.now(), list };
  return list;
}

export async function saveOwners(list) {
  await put(ownersPath(), JSON.stringify(list), {
    access: 'public', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60
  });
  cache = { at: Date.now(), list };
}

export async function isOwner(email) {
  email = String(email || '').trim().toLowerCase();
  if (BASE_OWNERS.includes(email)) return true;
  return EMAIL_RE.test(email) && (await addedOwners()).includes(email);
}

// ---------- Signed tokens (login codes and 7-day sessions) ----------
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
