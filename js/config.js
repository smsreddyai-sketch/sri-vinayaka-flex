// Supabase settings — fill these in after creating your Supabase project
// (see SUPABASE_SETUP.md). The anon key is safe to be public; uploads are
// protected by the storage policies, which only allow the owner's email.
window.SVF_CONFIG = {
  SUPABASE_URL: 'https://YOUR-PROJECT-ID.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR-ANON-KEY',
  BUCKET: 'gallery',
  // Only these Gmail IDs can open the owner page (/admin).
  // Keep in sync with the email list in the SQL policies (SUPABASE_SETUP.md).
  OWNER_EMAILS: ['smsreddyabc@gmail.com', 'skr522522@gmail.com', 'skrmixingunit@gmail.com']
};
