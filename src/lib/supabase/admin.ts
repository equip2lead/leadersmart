import { createClient } from '@supabase/supabase-js';

// Server-only admin client using the service role key.
// NEVER import this file from client components — it would leak the service key
// into the browser bundle. All callers are inside "use server" actions.

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  }
  if (!serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Add it to Vercel project env to enable user invites.',
    );
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function hasAdminKey(): boolean {
  return !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}
