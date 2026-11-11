# Owner page – one-time setup

Owner page: **https://sri-vinayaka-flex.vercel.app/admin**

Login: enter an owner Gmail ID → a 6-digit code is emailed to it → enter the code → you're in (stays logged in for 7 days).
Main owners (always allowed, list in `api/_lib.js`); more can be added on the owner page under **Owner Email IDs**:
`smsreddyai@gmail.com`, `smsreddyabc@gmail.com`, `skr522522@gmail.com`, `skrmixingunit@gmail.com`

Everything runs inside the existing Vercel project. No other website account is needed.

## 1. Let the website send the login code from Gmail
Pick one Gmail account to send the codes from (`smsreddyai@gmail.com`).

1. Sign in to that Gmail and open https://myaccount.google.com/security
2. Turn on **2-Step Verification** (Google requires it for step 3).
3. Open https://myaccount.google.com/apppasswords → name it `Vinayaka website` → **Create**. Google shows a 16-letter password — copy it.
4. Open https://vercel.com → project **sri-vinayaka-flex** → **Settings → Environment Variables**, add:
   - `GMAIL_USER` = the Gmail ID from step 1
   - `GMAIL_APP_PASSWORD` = the 16-letter password from step 3

## 2. Connect storage for photos and counts (a few clicks, nothing to copy)
In Vercel → project **sri-vinayaka-flex** → **Storage** tab:
1. **Create Database → Blob** → name `photos` → Create → **Connect** to the project. (Stores uploaded photos.)
2. **Create Database → Upstash for Redis** (free plan) → name `stats` → Create → **Connect** to the project. (Stores visitor counts, the photo list and login-code limits.)

## 3. Redeploy
Vercel → **Deployments** → latest one → **⋯ → Redeploy**, so the new settings take effect.

## Use it
- Open **/admin** (or **Owner login** at the bottom of the website) → enter your Gmail ID → **Send code** → type the code from your email → **Login**.
- **Photos**: tap to choose any number of photos (works from a phone). They float across "Our Work" on the website in random order, within a minute.
- **Counts**: visits, Call / WhatsApp / Quote / Directions clicks, where visitors came from, their city, device, and which button they used — for today, 7 days, 30 days or 1 year.
- **Owner Email IDs**: add or remove extra owners any time; they log in the same way with a code.
