/**
 * Supabase Client Configuration
 * 
 * Initializes the Supabase client for database operations and file storage.
 * Uses environment variables for secure credential management.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Check if Supabase is configured
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Supabase client instance
 * Will be null if environment variables are not set (e.g., during build)
 */
export const supabase: SupabaseClient | null =
    supabaseUrl && supabaseAnonKey
        ? createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
            },
        })
        : null;

/**
 * Get supabase client with null check
 * Throws error if called when Supabase is not configured
 */
export function getSupabase(): SupabaseClient {
    if (!supabase) {
        throw new Error(
            'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.'
        );
    }
    return supabase;
}

/**
 * Helper to get a public URL for a file in storage
 */
export function getStorageUrl(bucket: string, path: string): string {
    if (!supabase) {
        console.warn('Supabase not configured, returning empty URL');
        return '';
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
}

/**
 * Upload a file to Supabase storage with progress tracking
 */
export async function uploadFile(
    bucket: string,
    path: string,
    file: File,
    onProgress?: (progress: number) => void
): Promise<{ url: string; error: Error | null }> {
    if (!supabase) {
        return { url: '', error: new Error('Supabase is not configured') };
    }

    try {
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(path, file, {
                cacheControl: '3600',
                upsert: true,
            });

        if (error) {
            return { url: '', error: new Error(error.message) };
        }

        // Simulate progress completion
        onProgress?.(100);

        const publicUrl = getStorageUrl(bucket, data.path);
        return { url: publicUrl, error: null };
    } catch (err) {
        return { url: '', error: err as Error };
    }
}

/**
 * Delete a file from Supabase storage
 */
export async function deleteFile(
    bucket: string,
    path: string
): Promise<{ error: Error | null }> {
    if (!supabase) {
        return { error: new Error('Supabase is not configured') };
    }

    try {
        const { error } = await supabase.storage.from(bucket).remove([path]);
        if (error) {
            return { error: new Error(error.message) };
        }
        return { error: null };
    } catch (err) {
        return { error: err as Error };
    }
}
