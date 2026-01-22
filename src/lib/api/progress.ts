/**
 * User Progress API Layer
 * 
 * Functions for syncing reading progress with Supabase.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { UserProgressRow, UserProgressInsert, UserProgressUpdate, ReadingProgressData } from '@/types/database';

/**
 * Fetch reading progress for a book
 */
export async function fetchProgress(
    bookId: string,
    userId?: string
): Promise<{ progress: UserProgressRow | null; error: Error | null }> {
    if (!supabase || !isSupabaseConfigured) {
        return { progress: null, error: new Error('Supabase is not configured') };
    }

    try {
        let query = supabase
            .from('user_progress')
            .select('*')
            .eq('book_id', bookId);

        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data, error } = await query.maybeSingle();

        if (error) {
            return { progress: null, error: new Error(error.message) };
        }

        return { progress: data as UserProgressRow | null, error: null };
    } catch (err) {
        return { progress: null, error: err as Error };
    }
}

/**
 * Fetch all progress records for a user
 */
export async function fetchAllProgress(
    userId?: string
): Promise<{ progress: UserProgressRow[]; error: Error | null }> {
    if (!supabase || !isSupabaseConfigured) {
        return { progress: [], error: null }; // Return empty array, not an error, for initial load
    }

    try {
        let query = supabase
            .from('user_progress')
            .select('*');

        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data, error } = await query;

        if (error) {
            return { progress: [], error: new Error(error.message) };
        }

        return { progress: (data as UserProgressRow[]) || [], error: null };
    } catch (err) {
        return { progress: [], error: err as Error };
    }
}

/**
 * Upsert reading progress (insert or update)
 */
export async function upsertProgress(
    bookId: string,
    data: ReadingProgressData,
    userId?: string
): Promise<{ progress: UserProgressRow | null; error: Error | null }> {
    if (!supabase || !isSupabaseConfigured) {
        return { progress: null, error: new Error('Supabase is not configured') };
    }

    try {
        // Check if record exists
        let query = supabase
            .from('user_progress')
            .select('id')
            .eq('book_id', bookId);

        if (userId) {
            query = query.eq('user_id', userId);
        } else {
            query = query.is('user_id', null);
        }

        const { data: existing } = await query.maybeSingle();

        const payload = {
            book_id: bookId,
            user_id: userId || null,
            location: data.location,
            percentage: data.percentage,
            current_location: data.currentLocation || null,
            total_locations: data.totalLocations || null,
            updated_at: new Date().toISOString(),
        };

        let result;
        if (existing) {
            // Update existing record
            result = await supabase
                .from('user_progress')
                .update(payload as unknown as Record<string, unknown>)
                .eq('id', (existing as { id: string }).id)
                .select()
                .single();
        } else {
            // Insert new record
            result = await supabase
                .from('user_progress')
                .insert(payload as unknown as Record<string, unknown>)
                .select()
                .single();
        }

        if (result.error) {
            return { progress: null, error: new Error(result.error.message) };
        }

        return { progress: result.data as UserProgressRow, error: null };
    } catch (err) {
        return { progress: null, error: err as Error };
    }
}

/**
 * Delete progress for a book
 */
export async function deleteProgress(
    bookId: string,
    userId?: string
): Promise<{ error: Error | null }> {
    if (!supabase || !isSupabaseConfigured) {
        return { error: new Error('Supabase is not configured') };
    }

    try {
        let query = supabase
            .from('user_progress')
            .delete()
            .eq('book_id', bookId);

        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { error } = await query;

        if (error) {
            return { error: new Error(error.message) };
        }

        return { error: null };
    } catch (err) {
        return { error: err as Error };
    }
}
