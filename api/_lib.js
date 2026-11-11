// Shared helpers for the owner page API. Files starting with "_" are not public routes.
import crypto from 'node:crypto';
import { neon } from '@neondatabase/serverless';

// Main owners: always allowed and cannot be removed from the owner page.
// More owner emails can be added on /admin (stored in table svf_owners).
export const BASE_OWNERS = ['smsreddyai@gmail.com', 'smsreddyabc@gmail.com', 'skr522522@gmail.com', 'skrmixingunit@gmail.com'];
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function isOwner(email) {
  email = String(email || '').trim().toLowerCase();
  if (BASE_OWNERS.includes(email)) return true;
  if (!hasDb() || !EMAIL_RE.test(email)) return false;
  return (await q('select 1 from svf_owners where email = $1', [email])).length > 0;
}

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });

// ---------- Database (Neon Postgres, connected from the Vercel Storage tab) ----------
const DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
export const hasDb = () => Boolean(DB_URL);
let sql, ready;

const TABLES = [
  'create table if not exists svf_daily (day date not null, field text not null, n int not null default 0, primary key (day, field))',
  'create table if not exists svf_recent (id bigserial primary key, at bigint not null, data jsonb not null)',
  'create table if not exists svf_photos (url text primary key, created_at timestamptz not null default now())',
  'create table if not exists svf_owners (email text primary key, added_by text, created_at timestamptz not null default now())',
  'create table if not exists svf_limits (key text primary key, n int not null default 0, expires_at timestamptz not null)'
];

// Run one SQL statement (creates the tables the first time). Returns rows.
export async function q(text, params = []) {
  if (!sql) sql = neon(DB_URL);
  if (!ready) ready = (async () => { for (const t of TABLES) await sql.query(t); })().catch(e => { ready = null; throw e; });
  await ready;
  return sql.query(text, params);
}

// Counter that resets after `ttl` seconds; returns the new count.
export async function bump(key, ttl) {
  const rows = await q(
    `insert into svf_limits (key, n, expires_at) values ($1, 1, now() + make_interval(secs => $2))
     on conflict (key) do update set
       n = case when svf_limits.expires_at < now() then 1 else svf_limits.n + 1 end,
       expires_at = case when svf_limits.expires_at < now() then excluded.expires_at else svf_limits.expires_at end
     returning n`, [key, ttl]);
  return rows[0].n;
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
