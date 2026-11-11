# Owner page – setup

Owner page: **https://sri-vinayaka-flex.vercel.app/admin**

Login: enter an owner email ID → a 6-digit code is emailed to it → enter the code → you're in (7 days).
Main owners (always allowed, list in `api/_lib.js`):
`smsreddyai@gmail.com`, `smsreddyabc@gmail.com`, `skr522522@gmail.com`, `skrmixingunit@gmail.com`
More owners can be added or removed on the owner page under **Owner Email IDs**.

No database: uploaded photos and the extra-owner list are files in **Vercel Blob** (already connected).

## Gmail App Password (done — only needed again if you change it)
1. Sign in to **smsreddyai@gmail.com** → https://myaccount.google.com/apppasswords
   (2-Step Verification must be on.) Name it `Vinayaka website` → **Create** → copy the 16 letters.
2. Vercel → project **sri-vinayaka-flex** → **Settings → Environment Variables** → **Add**:
   key `GMAIL_APP_PASSWORD`, value = the 16 letters, all environments → **Save**.
3. **Deployments → latest → ⋯ → Redeploy**.

`GMAIL_USER` is already set to `smsreddyai@gmail.com`.

## Visitor counts
Vercel → project → **Analytics** → **Enable** (free). Shows visitors, where they came from, countries and devices.
