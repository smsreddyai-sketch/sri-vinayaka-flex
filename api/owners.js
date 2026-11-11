// Owner email list (owners only).
// GET -> { main: [...], added: [...] }   POST { email } -> add   DELETE { email } -> remove (added only)
import { BASE_OWNERS, EMAIL_RE, json, ownerFrom, hasDb, q } from './_lib.js';

async function list() {
  const added = hasDb() ? (await q('select email from svf_owners order by email')).map(r => r.email) : [];
  return { main: BASE_OWNERS, added };
}

export async function GET(request) {
  if (!(await ownerFrom(request))) return json({ error: 'Please log in again.' }, 401);
  return json(await list());
}

export async function POST(request) {
  const me = await ownerFrom(request);
  if (!me) return json({ error: 'Please log in again.' }, 401);
  if (!hasDb()) return json({ error: 'Storage is not connected in Vercel yet.' }, 503);
  const { email: raw } = await request.json().catch(() => ({}));
  const email = String(raw || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 100) return json({ error: 'Please enter a valid email ID.' }, 400);
  if (BASE_OWNERS.includes(email)) return json({ error: 'This email is already a main owner.' }, 400);
  const [{ n }] = await q('select count(*)::int as n from svf_owners');
  if (n >= 20) return json({ error: 'You can add up to 20 extra owners.' }, 400);
  await q('insert into svf_owners (email, added_by) values ($1, $2) on conflict do nothing', [email, me]);
  return json(await list());
}

export async function DELETE(request) {
  const me = await ownerFrom(request);
  if (!me) return json({ error: 'Please log in again.' }, 401);
  const { email: raw } = await request.json().catch(() => ({}));
  const email = String(raw || '').trim().toLowerCase();
  if (BASE_OWNERS.includes(email)) return json({ error: 'Main owners cannot be removed here.' }, 400);
  if (email === me) return json({ error: 'You cannot remove yourself.' }, 400);
  if (hasDb()) await q('delete from svf_owners where email = $1', [email]);
  return json(await list());
}
