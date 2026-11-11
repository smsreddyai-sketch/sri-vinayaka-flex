// GET -> { email } for a logged-in owner, plus whether photo storage is connected.
import { json, ownerFrom, hasBlob } from './_lib.js';

export async function GET(request) {
  const email = await ownerFrom(request);
  if (!email) return json({ error: 'Not logged in' }, 401);
  return json({ email, storage: { photos: hasBlob() } });
}
