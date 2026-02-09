/**
 * Supabase Browser Client
 * 
 * Creates a Supabase client for use in Client Components
 * using @supabase/ssr with cookie-based session management.
 */

import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Get or create a Supabase browser client singleton.
 * Used in Client Components for auth and data operations.
 */
export function createSupabaseBrowser() {
  if (client) return client;

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return client;
}
