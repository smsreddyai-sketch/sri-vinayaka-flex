# Owner login & photo upload – one-time setup

The website stays on GitHub Pages. Login and photo storage use **Supabase** (free plan).

## 1. Create the project
1. Go to https://supabase.com → sign up → **New project** (any name, e.g. `sri-vinayaka-flex`, region: Mumbai).
2. Open **Project Settings → API** and copy:
   - **Project URL** → paste into `SUPABASE_URL` in `js/config.js`
   - **anon public** key → paste into `SUPABASE_ANON_KEY` in `js/config.js`

## 2. Create the owner login
1. **Authentication → Sign In / Providers → Email**: keep Email enabled. Turn **off** "Allow new users to sign up" so nobody else can register.
2. **Authentication → Users → Add user → Create new user**: create one user for **each** owner email below, each with its own password, and tick "Auto confirm user":
   - `smsreddyabc@gmail.com`
   - `skr522522@gmail.com`
   - `skrmixingunit@gmail.com`
3. **Authentication → URL Configuration**: set **Site URL** to `https://smsreddyai-sketch.github.io/sri-vinayaka-flex/admin.html` (needed for the "Forgot password" email link).

## 3. Create the photo storage
1. **Storage → New bucket** → name `gallery` → tick **Public bucket** → Create.
2. **SQL Editor → New query**, paste the following and click **Run** (to add or remove an owner later, change the email list in each policy):

```sql
-- Anyone can see the list of gallery photos (needed by the website)
create policy "Public can list gallery"
on storage.objects for select to anon, authenticated
using (bucket_id = 'gallery');

-- Only the owner emails can upload / change / delete photos
create policy "Owner can upload"
on storage.objects for insert to authenticated
with check (bucket_id = 'gallery' and auth.jwt() ->> 'email' in ('smsreddyabc@gmail.com', 'skr522522@gmail.com', 'skrmixingunit@gmail.com'));

create policy "Owner can update"
on storage.objects for update to authenticated
using (bucket_id = 'gallery' and auth.jwt() ->> 'email' in ('smsreddyabc@gmail.com', 'skr522522@gmail.com', 'skrmixingunit@gmail.com'));

create policy "Owner can delete"
on storage.objects for delete to authenticated
using (bucket_id = 'gallery' and auth.jwt() ->> 'email' in ('smsreddyabc@gmail.com', 'skr522522@gmail.com', 'skrmixingunit@gmail.com'));
```

## 4. Visitor & click stats
In **SQL Editor → New query**, paste this and click **Run**:

```sql
create table public.site_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  type text not null check (type in ('visit','call','whatsapp','quote','directions')),
  label text check (char_length(label) <= 100),
  page text check (char_length(page) <= 200),
  source text check (char_length(source) <= 100),
  referrer text check (char_length(referrer) <= 500),
  city text, region text, country text,
  device text check (char_length(device) <= 20)
);
alter table public.site_events enable row level security;

-- Website visitors can only add a record
create policy "Anyone can record events"
on public.site_events for insert to anon, authenticated
with check (true);

-- Only owners can read the stats
create policy "Owners can read events"
on public.site_events for select to authenticated
using (auth.jwt() ->> 'email' in ('smsreddyabc@gmail.com', 'skr522522@gmail.com', 'skrmixingunit@gmail.com'));
```

The owner page then shows visits, Call / WhatsApp / Quote / Directions clicks, where visitors came from (Google, Facebook, WhatsApp, direct…), their approximate city (from ipapi.co), device, and which button they clicked.

## 5. Use it
- Open the website → click **Owner login** at the bottom (or go to `/admin.html`).
- Log in with the email ID and password → tap to choose photos (works from a phone) → they appear in **Our Work** immediately.
- Tap **🗑 Delete** on a photo to remove it from the website.
- Until at least one photo is uploaded, the website keeps showing the default photos from the `images/` folder.
