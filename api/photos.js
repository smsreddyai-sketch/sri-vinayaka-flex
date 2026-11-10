// GET    -> { photos: [url, ...] } newest first (public, used by the homepage)
// POST   -> upload one photo (owner only). Body = image bytes, Content-Type = image type.
// DELETE -> { url } remove a photo (owner only)
import { put, del } from '@vercel/blob';
import { json, ownerFrom, hasRedis, redis } from './_lib.js';

const KEY = 'photos';
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

export async function GET(request) {
  if (!hasRedis()) return json({ photos: [] });
  const photos = await redis('LRANGE', KEY, 0, 499);
  const fresh = new URL(request.url).searchParams.has('fresh');
  return json({ photos }, 200, fresh ? {} : { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' });
}

export async function POST(request) {
  if (!ownerFrom(request)) return json({ error: 'Please log in again.' }, 401);
  if (!process.env.BLOB_READ_WRITE_TOKEN || !hasRedis()) return json({ error: 'Photo storage is not connected in Vercel yet.' }, 503);
  const type = (request.headers.get('content-type') || '').split(';')[0];
  if (!TYPES[type]) return json({ error: 'Only JPG, PNG, WEBP or GIF photos are allowed.' }, 415);
  const data = Buffer.from(await request.arrayBuffer());
  if (!data.length) return json({ error: 'Empty file' }, 400);
  const name = `gallery/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${TYPES[type]}`;
  const blob = await put(name, data, { access: 'public', contentType: type, addRandomSuffix: false, cacheControlMaxAge: 31536000 });
  await redis('LPUSH', KEY, blob.url);
  return json({ ok: true, url: blob.url });
}

export async function DELETE(request) {
  if (!ownerFrom(request)) return json({ error: 'Please log in again.' }, 401);
  const { url } = await request.json().catch(() => ({}));
  if (!url) return json({ error: 'Missing photo' }, 400);
  const removed = await redis('LREM', KEY, 0, url);
  if (!removed) return json({ error: 'Photo not found' }, 404);
  await del(url).catch(e => console.error('blob delete failed', e));
  return json({ ok: true });
}
