/**
 * Database Type Definitions for Supabase
 * 
 * TypeScript interfaces matching the Supabase database schema.
 * These types ensure type-safety when working with database operations.
 */

/**
 * Book format types
 */
export type FormatType = 'epub' | 'md' | 'pdf';

/**
 * Book table row (as returned from Supabase)
 */
export interface BookRow {
    id: string;
    user_id: string | null;
    title: string;
    author: string;
    description: string | null;
    file_url: string;
    cover_url: string | null;
    format_type: FormatType;
    file_size: number | null;
    created_at: string;
    updated_at: string;
}

/**
 * Book insert payload
 */
export interface BookInsert {
    id?: string;
    user_id?: string | null;
    title: string;
    author: string;
    description?: string | null;
    file_url: string;
    cover_url?: string | null;
    format_type: FormatType;
    file_size?: number | null;
    created_at?: string;
    updated_at?: string;
}

/**
 * Book update payload
 */
export interface BookUpdate {
    id?: string;
    user_id?: string | null;
    title?: string;
    author?: string;
    description?: string | null;
    file_url?: string;
    cover_url?: string | null;
    format_type?: FormatType;
    file_size?: number | null;
    updated_at?: string;
}

/**
 * User progress table row
 */
export interface UserProgressRow {
    id: string;
    user_id: string | null;
    book_id: string;
    location: string;
    percentage: number;
    current_location: number | null;
    total_locations: number | null;
    updated_at: string;
}

/**
 * User progress insert payload
 */
export interface UserProgressInsert {
    id?: string;
    user_id?: string | null;
    book_id: string;
    location: string;
    percentage: number;
    current_location?: number | null;
    total_locations?: number | null;
    updated_at?: string;
}

/**
 * User progress update payload
 */
export interface UserProgressUpdate {
    id?: string;
    user_id?: string | null;
    book_id?: string;
    location?: string;
    percentage?: number;
    current_location?: number | null;
    total_locations?: number | null;
    updated_at?: string;
}

/**
 * Book type for UI components (compatible with existing BookCard)
 */
export interface Book {
    id: string;
    title: string;
    author: string;
    coverUrl?: string;
    fileUrl?: string;
    formatType?: FormatType;
    progress: number;
    description?: string;
    chapterCount?: number;
}

/**
 * Convert a database BookRow to UI Book type
 */
export function toBook(row: BookRow, progress?: number): Book {
    return {
        id: row.id,
        title: row.title,
        author: row.author,
        coverUrl: row.cover_url || undefined,
        fileUrl: row.file_url,
        formatType: row.format_type,
        progress: progress ?? 0,
        description: row.description || undefined,
    };
}

/**
 * Reading progress data for sync
 */
export interface ReadingProgressData {
    location: string;
    percentage: number;
    currentLocation?: number;
    totalLocations?: number;
}

/**
 * Chapter table row
 */
export interface ChapterRow {
    id: string;
    book_id: string;
    title: string;
    file_url: string;
    sequence_order: number;
    created_at: string;
}

/**
 * Chapter insert payload
 */
export interface ChapterInsert {
    id?: string;
    book_id: string;
    title: string;
    file_url: string;
    sequence_order?: number;
    created_at?: string;
}

/**
 * Collection (shelf) for organizing books
 */
export interface Collection {
    id: string;
    name: string;
    emoji: string;
    bookIds: string[];
    createdAt: string;
}

/**
 * Extended Book type with reading stats for detail page
 */
export interface BookWithStats extends Book {
    lastReadAt?: string;
    totalReadingTime?: number; // minutes
    currentChapter?: string;
    totalChapters?: number;
}

