// Owner email list (owners only).
// GET -> { main: [...], added: [...] }   POST { email } -> add   DELETE { email } -> remove (added only)
import { BASE_OWNERS, EMAIL_RE, json, ownerFrom, hasRedis, redis } from './_lib.js';

async function list() {
  const added = hasRedis() ? ((await redis('SMEMBERS', 'owners')) || []).sort() : [];
  return { main: BASE_OWNERS, added };
}

export async function GET(request) {
  if (!(await ownerFrom(request))) return json({ error: 'Please log in again.' }, 401);
  return json(await list());
}

export async function POST(request) {
  if (!(await ownerFrom(request))) return json({ error: 'Please log in again.' }, 401);
  if (!hasRedis()) return json({ error: 'Storage is not connected in Vercel yet.' }, 503);
  const { email: raw } = await request.json().catch(() => ({}));
  const email = String(raw || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 100) return json({ error: 'Please enter a valid email ID.' }, 400);
  if (BASE_OWNERS.includes(email)) return json({ error: 'This email is already a main owner.' }, 400);
  if ((await redis('SCARD', 'owners')) >= 20) return json({ error: 'You can add up to 20 extra owners.' }, 400);
  await redis('SADD', 'owners', email);
  return json(await list());
}

export async function DELETE(request) {
  const me = await ownerFrom(request);
  if (!me) return json({ error: 'Please log in again.' }, 401);
  const { email: raw } = await request.json().catch(() => ({}));
  const email = String(raw || '').trim().toLowerCase();
  if (BASE_OWNERS.includes(email)) return json({ error: 'Main owners cannot be removed here.' }, 400);
  if (email === me) return json({ error: 'You cannot remove yourself.' }, 400);
  if (hasRedis()) await redis('SREM', 'owners', email);
  return json(await list());
}
