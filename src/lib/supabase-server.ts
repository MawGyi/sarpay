/**
 * Supabase Server Client
 * 
 * Creates Supabase clients for use in Server Components, Server Actions,
 * and Route Handlers using @supabase/ssr with cookie-based auth.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Create a Supabase client for server-side use (RSC, Route Handlers, Server Actions)
 * Uses cookies for session management
 */
export async function createSupabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll can fail in Server Components (read-only).
            // This is fine — middleware handles refresh.
          }
        },
      },
    }
  );
}

/**
 * Get the current authenticated user from server context
 */
export async function getServerUser() {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}
