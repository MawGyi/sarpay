/**
 * Server-side Data Fetching
 * 
 * These functions run on the server and fetch data using the
 * Supabase server client. They're used in Server Components
 * and generateMetadata for SSR.
 */

import { createSupabaseServer } from '@/lib/supabase-server';
import type { BookRow, ChapterRow, UserProgressRow } from '@/types/database';

/**
 * Fetch a book by ID on the server
 */
export async function fetchBookServer(id: string): Promise<BookRow | null> {
  try {
    const supabase = await createSupabaseServer();
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data as BookRow;
  } catch {
    return null;
  }
}

/**
 * Fetch chapters for a book on the server
 */
export async function fetchChaptersServer(bookId: string): Promise<ChapterRow[]> {
  try {
    const supabase = await createSupabaseServer();
    const { data, error } = await supabase
      .from('chapters')
      .select('*')
      .eq('book_id', bookId)
      .order('sequence_order', { ascending: true });

    if (error || !data) return [];
    return data as ChapterRow[];
  } catch {
    return [];
  }
}

/**
 * Fetch all books on the server (for library page SSR)
 */
export async function fetchBooksServer(userId?: string): Promise<BookRow[]> {
  try {
    const supabase = await createSupabaseServer();
    let query = supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error || !data) return [];
    return data as BookRow[];
  } catch {
    return [];
  }
}

/**
 * Fetch reading progress for a specific book on the server
 */
export async function fetchProgressServer(
  bookId: string,
  userId?: string
): Promise<UserProgressRow | null> {
  try {
    const supabase = await createSupabaseServer();
    let query = supabase
      .from('user_progress')
      .select('*')
      .eq('book_id', bookId);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.maybeSingle();
    if (error || !data) return null;
    return data as UserProgressRow;
  } catch {
    return null;
  }
}
