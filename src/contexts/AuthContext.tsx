'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  isLoading: true,
  signIn: async () => ({ error: null }),
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

/**
 * Determines if a user email matches the configured admin email.
 * Supports multiple admin emails separated by commas in the env var.
 */
function checkIsAdmin(user: User | null): boolean {
  if (!user?.email) return false;
  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  if (!adminEmails) return false;
  const allowed = adminEmails.split(',').map((e) => e.trim().toLowerCase());
  return allowed.includes(user.email.toLowerCase());
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowser();

    // Get initial session
    supabase.auth.getUser().then(({ data }: { data: { user: User | null } }) => {
      setUser(data.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = createSupabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const isAdmin = checkIsAdmin(user);

  return (
    <AuthContext.Provider value={{ user, isAdmin, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
