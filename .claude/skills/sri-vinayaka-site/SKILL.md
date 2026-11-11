---
name: sri-vinayaka-site
description: How the Sri Vinayaka Flex website and its /admin owner page work, and how to change, deploy and check them. Use for any change to this site — homepage design, floating photo gallery, owner login by email code, owner email list, photo upload, Vercel settings or deployment.
---

# Sri Vinayaka Flex website

Live: https://sri-vinayaka-flex.vercel.app — Owner page: https://sri-vinayaka-flex.vercel.app/admin
GitHub: smsreddyai-sketch/sri-vinayaka-flex (branch `main`). Vercel project `sri-vinayaka-flex` (account `smsreddyai-6010`)
auto-deploys every push to `main` in about 30–60 seconds. The local folder is linked with `vercel link`.

## Owner's wishes (keep to these)
- **No database.** Photos and the extra-owner list are files in **Vercel Blob** only. The owner rejected
  Supabase, Neon, Upstash, Google Client IDs and API keys. Do not add any of them back.
- Login works like the owner's Family Tree site (`C:\Users\cloud\Desktop\familytree`): enter email → 6-digit code by Gmail → logged in.
- The owner dictates by voice: confirm spellings of email IDs before using them.
- The site is static HTML + small Vercel functions — no framework, no build step.

## Files
| File | What it does |
|---|---|
| `index.html` | Homepage. "Our Work" floating photos sit right under the top banner: uploaded photos **plus** the 4 default photos in `images/`, shuffled on every visit. Also services, steps, quote-by-WhatsApp form, FAQ, contact, LocalBusiness schema, Vercel Web Analytics script. |
| `admin.html` | Owner page (`/admin` via `cleanUrls` in `vercel.json`): email-code login, photo upload/delete (shrinks photos to 1600px JPEG first), Owner Email IDs list. |
| `api/_lib.js` | `BASE_OWNERS` (main owners, can't be removed), extra owners file in Blob, signed tokens for codes and 7-day sessions. |
| `api/otp-send.js` / `api/otp-verify.js` | Email a login code (nodemailer + Gmail) / check it and return a session. |
| `api/photos.js` | GET list (public, cached 20s), POST upload, DELETE (owners only). Blob path `gallery/`. |
| `api/owners.js` | List / add / remove extra owner emails (max 20). |
| `api/me.js` | Who is logged in. |
| `ADMIN_SETUP.md` | Owner-facing setup notes. |

Main owners (in `api/_lib.js`): `smsreddyai@gmail.com`, `smsreddyabc@gmail.com`, `skr522522@gmail.com`, `skrmixingunit@gmail.com`.

## Vercel settings
- `BLOB_READ_WRITE_TOKEN` — added by connecting the Blob store `sri-vinayaka-photos` (Mumbai).
- `GMAIL_USER` = `smsreddyai@gmail.com`, `GMAIL_APP_PASSWORD` — a Google App Password the owner added. Never ask the
  owner to paste it into chat and never read it out of Vercel; changing it logs every owner out (it also signs sessions).
- Visitor counts: Vercel → project → Analytics (free). Button-click counts were removed with the database.

## Checking a change
1. `node --check api/*.js`; check the admin script parses.
2. Push to `main`, then poll the live URL until the new code appears (`curl -s https://sri-vinayaka-flex.vercel.app/ | grep ...`).
3. Quick live checks:
   - `curl -s "https://sri-vinayaka-flex.vercel.app/api/photos?fresh=1"` → uploaded photo URLs
   - `curl -s -X POST .../api/otp-send -H 'content-type: application/json' -d '{"email":"nobody@example.com"}'` → "does not have owner access"
4. Tell the owner to refresh with Ctrl+F5 (phones: pull down) — they often check before the deploy finishes.
