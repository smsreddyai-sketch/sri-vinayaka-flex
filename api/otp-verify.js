// POST { token, code } -> { session } valid for 7 days.
import crypto from 'node:crypto';
import { isOwner, json, sign, verify, hmac, hasRedis, redis } from './_lib.js';

export async function POST(request) {
  const { token, code } = await request.json().catch(() => ({}));
  let p;
  try { p = verify(token); } catch (e) { return json({ error: e.message }, 503); }
  if (!p || p.kind !== 'otp' || !(await isOwner(p.email))) return json({ error: 'Code expired. Please ask for a new code.' }, 401);

  // At most 5 tries per code
  if (hasRedis()) {
    const key = 'otp:tries:' + token.split('.')[1];
    const tries = await redis('INCR', key);
    if (tries === 1) await redis('EXPIRE', key, 900);
    if (tries > 5) return json({ error: 'Too many wrong tries. Please ask for a new code.' }, 429);
  }

  const expected = hmac(`${p.email}:${String(code || '').trim()}:${p.exp}`);
  if (expected.length !== p.h.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(p.h))) {
    return json({ error: 'Wrong code. Please check the email and try again.' }, 401);
  }
  const session = sign({ kind: 'session', email: p.email, exp: Date.now() + 7 * 864e5 });
  return json({ ok: true, email: p.email, session });
}
