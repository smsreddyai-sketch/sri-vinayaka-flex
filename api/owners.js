// Owner email list (owners only).
// GET -> { main: [...], added: [...] }   POST { email } -> add   DELETE { email } -> remove (added only)
import { BASE_OWNERS, EMAIL_RE, json, ownerFrom, hasBlob, addedOwners, saveOwners } from './_lib.js';

const result = async () => ({ main: BASE_OWNERS, added: [...(await addedOwners())].sort() });

export async function GET(request) {
  if (!(await ownerFrom(request))) return json({ error: 'Please log in again.' }, 401);
  return json(await result());
}

export async function POST(request) {
  if (!(await ownerFrom(request))) return json({ error: 'Please log in again.' }, 401);
  if (!hasBlob()) return json({ error: 'Storage is not connected in Vercel yet.' }, 503);
  const { email: raw } = await request.json().catch(() => ({}));
  const email = String(raw || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 100) return json({ error: 'Please enter a valid email ID.' }, 400);
  if (BASE_OWNERS.includes(email)) return json({ error: 'This email is already a main owner.' }, 400);
  const list = await addedOwners();
  if (!list.includes(email)) {
    if (list.length >= 20) return json({ error: 'You can add up to 20 extra owners.' }, 400);
    await saveOwners([...list, email]);
  }
  return json(await result());
}

export async function DELETE(request) {
  const me = await ownerFrom(request);
  if (!me) return json({ error: 'Please log in again.' }, 401);
  const { email: raw } = await request.json().catch(() => ({}));
  const email = String(raw || '').trim().toLowerCase();
  if (BASE_OWNERS.includes(email)) return json({ error: 'Main owners cannot be removed here.' }, 400);
  if (email === me) return json({ error: 'You cannot remove yourself.' }, 400);
  await saveOwners((await addedOwners()).filter(e => e !== email));
  return json(await result());
}
