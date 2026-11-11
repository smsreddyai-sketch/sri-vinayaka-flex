// GET -> { email } for a logged-in owner, plus whether storage is connected.
import { json, ownerFrom, hasRedis } from './_lib.js';

export async function GET(request) {
  const email = await ownerFrom(request);
  if (!email) return json({ error: 'Not logged in' }, 401);
  return json({ email, storage: { photos: Boolean(process.env.BLOB_READ_WRITE_TOKEN), stats: hasRedis() } });
}
