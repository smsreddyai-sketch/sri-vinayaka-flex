// GET    -> { photos: [url, ...] } newest first (public, used by the homepage)
// POST   -> upload one photo (owner only). Body = image bytes, Content-Type = image type.
// DELETE -> { url } remove a photo (owner only)
import { put, del, list } from '@vercel/blob';
import { json, ownerFrom, hasBlob } from './_lib.js';

const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

export async function GET(request) {
  if (!hasBlob()) return json({ photos: [] });
  const blobs = [];
  let cursor;
  do {
    const page = await list({ prefix: 'gallery/', limit: 1000, cursor });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  const photos = blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)).map(b => b.url);
  const fresh = new URL(request.url).searchParams.has('fresh');
  return json({ photos }, 200, fresh ? {} : { 'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=60' });
}

export async function POST(request) {
  if (!(await ownerFrom(request))) return json({ error: 'Please log in again.' }, 401);
  if (!hasBlob()) return json({ error: 'Photo storage is not connected in Vercel yet.' }, 503);
  const type = (request.headers.get('content-type') || '').split(';')[0];
  if (!TYPES[type]) return json({ error: 'Only JPG, PNG, WEBP or GIF photos are allowed.' }, 415);
  const data = Buffer.from(await request.arrayBuffer());
  if (!data.length) return json({ error: 'Empty file' }, 400);
  const name = `gallery/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${TYPES[type]}`;
  const blob = await put(name, data, { access: 'public', contentType: type, addRandomSuffix: false, cacheControlMaxAge: 31536000 });
  return json({ ok: true, url: blob.url });
}

export async function DELETE(request) {
  if (!(await ownerFrom(request))) return json({ error: 'Please log in again.' }, 401);
  const { url } = await request.json().catch(() => ({}));
  let path = '';
  try { path = new URL(url).pathname; } catch (e) {}
  if (!path.startsWith('/gallery/')) return json({ error: 'Photo not found' }, 404);
  await del(url);
  return json({ ok: true });
}
