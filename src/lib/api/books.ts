/**
 * Books API Layer
 * 
 * Functions for interacting with the books table in Supabase.
 * Handles CRUD operations with proper error handling.
 */

import { supabase, isSupabaseConfigured, uploadFile, deleteFile, getStorageUrl } from '@/lib/supabase';
import type { BookRow, BookInsert, BookUpdate } from '@/types/database';
import { sortFilesByName } from '@/lib/utils/sort-utils';

/**
 * Fetch all books for a user (or all books if no user)
 */
export async function fetchBooks(userId?: string): Promise<{ books: BookRow[]; error: Error | null }> {
    if (!supabase || !isSupabaseConfigured) {
        return { books: [], error: new Error('Supabase is not configured') };
    }

    try {
        let query = supabase
            .from('books')
            .select('*')
            .order('created_at', { ascending: false });

        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data, error } = await query;

        if (error) {
            return { books: [], error: new Error(error.message) };
        }

        return { books: (data as BookRow[]) || [], error: null };
    } catch (err) {
        return { books: [], error: err as Error };
    }
}

/**
 * Fetch a single book by ID
 */
export async function fetchBookById(id: string): Promise<{ book: BookRow | null; error: Error | null }> {
    if (!supabase || !isSupabaseConfigured) {
        return { book: null, error: new Error('Supabase is not configured') };
    }

    try {
        const { data, error } = await supabase
            .from('books')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            return { book: null, error: new Error(error.message) };
        }

        return { book: data as BookRow, error: null };
    } catch (err) {
        return { book: null, error: err as Error };
    }
}

/**
 * Create a new book record
 */
export async function createBook(book: BookInsert): Promise<{ book: BookRow | null; error: Error | null }> {
    if (!supabase || !isSupabaseConfigured) {
        return { book: null, error: new Error('Supabase is not configured') };
    }

    try {
        const { data, error } = await supabase
            .from('books')
            .insert(book as unknown as Record<string, unknown>)
            .select()
            .single();

        if (error) {
            return { book: null, error: new Error(error.message) };
        }

        return { book: data as BookRow, error: null };
    } catch (err) {
        return { book: null, error: err as Error };
    }
}

/**
 * Update an existing book
 */
export async function updateBook(
    id: string,
    updates: BookUpdate
): Promise<{ book: BookRow | null; error: Error | null }> {
    if (!supabase || !isSupabaseConfigured) {
        return { book: null, error: new Error('Supabase is not configured') };
    }

    try {
        const { data, error } = await supabase
            .from('books')
            .update(updates as unknown as Record<string, unknown>)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return { book: null, error: new Error(error.message) };
        }

        return { book: data as BookRow, error: null };
    } catch (err) {
        return { book: null, error: err as Error };
    }
}

/**
 * Delete a book and its associated files
 */
/**
 * Delete a book and its associated files
 */
export async function deleteBook(id: string): Promise<{ error: Error | null }> {
    if (!supabase || !isSupabaseConfigured) {
        return { error: new Error('Supabase is not configured') };
    }

    try {
        // First, fetch the book to get file paths
        const { book, error: fetchError } = await fetchBookById(id);
        if (fetchError || !book) {
            return { error: fetchError || new Error('Book not found') };
        }

        // Fetch associated chapters to delete their files
        const { chapters, error: chaptersError } = await fetchChapters(id);
        if (!chaptersError && chapters.length > 0) {
            for (const chapter of chapters) {
                if (chapter.file_path) {
                    await deleteFile('books', chapter.file_path);
                } else if (chapter.file_url) {
                    const chapterPath = extractPathFromUrl(chapter.file_url);
                    if (chapterPath) {
                        await deleteFile('books', chapterPath);
                    }
                }
            }
        }

        // Delete main book file from storage
        if (book.file_url) {
            const filePath = extractPathFromUrl(book.file_url);
            if (filePath) {
                await deleteFile('books', filePath);
            }
        }

        // Delete cover from storage
        if (book.cover_url) {
            const coverPath = extractPathFromUrl(book.cover_url);
            if (coverPath) {
                await deleteFile('covers', coverPath);
            }
        }

        // Delete the database record (this will cascade delete chapters)
        const { error: deleteError } = await supabase
            .from('books')
            .delete()
            .eq('id', id);

        if (deleteError) {
            return { error: new Error(deleteError.message) };
        }

        return { error: null };
    } catch (err) {
        return { error: err as Error };
    }
}

/**
 * Upload a book with its files
 */
export async function uploadBook(
    file: File,
    coverBlob: Blob | null,
    metadata: {
        title: string;
        author: string;
        description?: string;
        formatType: 'epub' | 'md' | 'pdf';
    },
    userId?: string,
    onProgress?: (progress: number) => void
): Promise<{ book: BookRow | null; error: Error | null }> {
    if (!isSupabaseConfigured) {
        return { book: null, error: new Error('Supabase is not configured') };
    }

    try {
        // Generate unique file names
        const timestamp = Date.now();
        const sanitizedTitle = metadata.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
        const fileExt = file.name.split('.').pop() || metadata.formatType;
        const fileName = `${sanitizedTitle}_${timestamp}.${fileExt}`;

        // Upload book file
        onProgress?.(10);
        const { url: fileUrl, error: fileError } = await uploadFile('books', fileName, file);
        if (fileError) {
            return { book: null, error: fileError };
        }

        onProgress?.(50);

        // Upload cover if available
        let coverUrl: string | null = null;
        if (coverBlob) {
            const coverFileName = `${sanitizedTitle}_${timestamp}_cover.jpg`;
            const coverFile = new File([coverBlob], coverFileName, { type: 'image/jpeg' });
            const { url, error: coverError } = await uploadFile('covers', coverFileName, coverFile);
            if (!coverError) {
                coverUrl = url;
            }
        }

        onProgress?.(80);

        // Create database record
        const { book, error: createError } = await createBook({
            title: metadata.title,
            author: metadata.author,
            description: metadata.description || null,
            file_url: fileUrl,
            cover_url: coverUrl,
            format_type: metadata.formatType,
            file_size: file.size,
            user_id: userId || null,
        });

        if (createError) {
            // Clean up uploaded files if database insert fails
            await deleteFile('books', fileName);
            if (coverUrl) {
                const coverFileName = `${sanitizedTitle}_${timestamp}_cover.jpg`;
                await deleteFile('covers', coverFileName);
            }
            return { book: null, error: createError };
        }

        onProgress?.(100);
        return { book, error: null };
    } catch (err) {
        return { book: null, error: err as Error };
    }
}


/**
 * Extract the path from a Supabase storage URL
 */
function extractPathFromUrl(url: string): string | null {
    try {
        const urlObj = new URL(url);
        // Supabase storage URLs have format: /storage/v1/object/public/bucket/path
        const parts = urlObj.pathname.split('/');
        const bucketIndex = parts.findIndex(p => p === 'books' || p === 'covers');
        if (bucketIndex !== -1 && bucketIndex < parts.length - 1) {
            return parts.slice(bucketIndex + 1).join('/');
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Upload multiple books sequentially
 */
export async function uploadMultipleBooks(
    files: File[],
    userId?: string,
    onProgress?: (currentFileIndex: number, totalFiles: number, currentFileName: string) => void
): Promise<{ successCount: number; failureCount: number; errors: { fileName: string; error: string }[] }> {
    const results = {
        successCount: 0,
        failureCount: 0,
        errors: [] as { fileName: string; error: string }[]
    };

    for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Notify progress
        onProgress?.(i + 1, files.length, file.name);

        try {
            // Determine format type
            const ext = file.name.split('.').pop()?.toLowerCase();
            let formatType: 'epub' | 'md' | 'pdf' = 'epub';
            if (ext === 'md' || ext === 'markdown') formatType = 'md';
            else if (ext === 'pdf') formatType = 'pdf';

            // Use filename as title (remove extension)
            const title = file.name.replace(/\.[^/.]+$/, '');

            // Upload
            const { error } = await uploadBook(
                file,
                null, // No cover for bulk upload for now
                {
                    title,
                    author: 'Unknown Author', // Default author
                    description: '',
                    formatType
                },
                userId
            );

            if (error) {
                throw error;
            }

            results.successCount++;
        } catch (err) {
            console.error(`Failed to upload ${file.name}:`, err);
            results.failureCount++;
            results.errors.push({
                fileName: file.name,
                error: err instanceof Error ? err.message : 'Unknown error'
            });
        }
    }

    return results;
}

/**
 * Fetch chapter counts for multiple books in a single query
 */
export async function fetchChapterCounts(bookIds: string[]): Promise<{ counts: Map<string, number>; error: Error | null }> {
    if (!supabase || !isSupabaseConfigured || bookIds.length === 0) {
        return { counts: new Map(), error: null };
    }

    try {
        const { data, error } = await supabase
            .from('chapters')
            .select('book_id')
            .in('book_id', bookIds);

        if (error) {
            return { counts: new Map(), error: new Error(error.message) };
        }

        // Count chapters per book
        const counts = new Map<string, number>();
        (data || []).forEach((row: { book_id: string }) => {
            counts.set(row.book_id, (counts.get(row.book_id) || 0) + 1);
        });

        return { counts, error: null };
    } catch (err) {
        return { counts: new Map(), error: err as Error };
    }
}

/**
 * Fetch chapters for a book
 */
export interface ChapterRow {
    id: string;
    book_id: string;
    title: string;
    file_url: string;
    file_path?: string;
    sequence_order: number;
    created_at: string;
}

export async function fetchChapters(bookId: string): Promise<{ chapters: ChapterRow[]; error: Error | null }> {
    if (!supabase || !isSupabaseConfigured) {
        return { chapters: [], error: new Error('Supabase is not configured') };
    }

    try {
        const { data, error } = await supabase
            .from('chapters')
            .select('*')
            .eq('book_id', bookId)
            .order('sequence_order', { ascending: true });

        if (error) {
            return { chapters: [], error: new Error(error.message) };
        }

        return { chapters: data || [], error: null };
    } catch (err) {
        return { chapters: [], error: err as Error };
    }
}

/**
 * Create a chapter record
 */
export async function createChapter(chapter: Omit<ChapterRow, 'id' | 'created_at'>): Promise<{ chapter: ChapterRow | null; error: Error | null }> {
    if (!supabase || !isSupabaseConfigured) {
        return { chapter: null, error: new Error('Supabase is not configured') };
    }

    try {
        const { data, error } = await supabase
            .from('chapters')
            .insert(chapter)
            .select()
            .single();

        if (error) {
            return { chapter: null, error: new Error(error.message) };
        }

        return { chapter: data, error: null };
    } catch (err) {
        return { chapter: null, error: err as Error };
    }
}

/**
 * Upload a book with multiple chapters
 */
export async function uploadBookWithChapters(
    files: File[],
    coverBlob: Blob | null,
    metadata: {
        title: string;
        author: string;
        description?: string;
        formatType: 'epub' | 'md' | 'pdf';
    },
    userId?: string,
    onProgress?: (progress: number, message: string) => void
): Promise<{ book: BookRow | null; error: Error | null }> {
    if (!isSupabaseConfigured) {
        return { book: null, error: new Error('Supabase is not configured') };
    }

    try {
        // 1. Sort files naturally by filename (e.g., "Law 1", "Law 2", ... "Law 48")
        const sortedFiles = sortFilesByName(files);

        onProgress?.(5, 'Initializing book...');

        // Upload all files first to get URLs
        const chapterUploads = [];
        const totalFiles = sortedFiles.length;

        for (let i = 0; i < totalFiles; i++) {
            const file = sortedFiles[i];
            const percentage = 10 + Math.round((i / totalFiles) * 40); // 10% to 50%
            onProgress?.(percentage, `Uploading chapter ${i + 1}/${totalFiles}...`);

            const timestamp = Date.now();
            const sanitizedTitle = metadata.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
            const fileExt = file.name.split('.').pop() || 'md';
            // Unique name for storage
            const fileName = `${sanitizedTitle}_ch${i + 1}_${timestamp}.${fileExt}`;

            const { url, error } = await uploadFile('books', fileName, file);
            if (error) throw error;

            chapterUploads.push({
                file,
                fileName, // Original filename (sort of)
                url,
                storagePath: fileName,
                order: i
            });
        }

        // Upload Cover
        onProgress?.(60, 'Uploading cover...');
        let coverUrl: string | null = null;
        if (coverBlob) {
            const timestamp = Date.now();
            const sanitizedTitle = metadata.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
            const coverFileName = `${sanitizedTitle}_${timestamp}_cover.jpg`;
            const coverFile = new File([coverBlob], coverFileName, { type: 'image/jpeg' });
            const { url, error: uploadError } = await uploadFile('covers', coverFileName, coverFile);
            if (!uploadError) {
                coverUrl = url;
            }
        }

        // Create Book Record
        onProgress?.(80, 'Creating book record...');
        // Use the first chapter's URL as the main book URL for fallback
        const mainFileUrl = chapterUploads[0].url;

        const { book, error: createError } = await createBook({
            title: metadata.title,
            author: metadata.author,
            description: metadata.description || null,
            file_url: mainFileUrl,
            cover_url: coverUrl,
            format_type: metadata.formatType,
            file_size: sortedFiles.reduce((acc, f) => acc + f.size, 0),
            user_id: userId || null,
        });

        if (createError || !book) throw createError || new Error('Failed to create book record');

        // Create Chapter Records
        onProgress?.(90, 'Linking chapters...');
        for (const chap of chapterUploads) {
            await createChapter({
                book_id: book.id,
                title: chap.file.name.replace(/\.[^/.]+$/, ''), // Remove extension
                file_url: chap.url,
                sequence_order: chap.order
            });
        }

        onProgress?.(100, 'Done!');
        return { book, error: null };

    } catch (err) {
        return { book: null, error: err as Error };
    }
}

/**
 * Add chapters to an existing book
 */
export async function addChaptersToBook(
    bookId: string,
    files: File[],
    existingChapterCount: number = 0
): Promise<{ error: Error | null }> {
    if (!isSupabaseConfigured) {
        return { error: new Error('Supabase is not configured') };
    }

    try {
        // Sort files naturally by filename
        const sortedFiles = sortFilesByName(files);

        for (let i = 0; i < sortedFiles.length; i++) {
            const file = sortedFiles[i];
            const timestamp = Date.now();
            const fileExt = file.name.split('.').pop() || 'md';
            const fileName = `book_${bookId}_ch${existingChapterCount + i + 1}_${timestamp}.${fileExt}`;

            // Upload file
            const { url, error: uploadError } = await uploadFile('books', fileName, file);
            if (uploadError) throw uploadError;

            // Create chapter record
            const { error: chapterError } = await createChapter({
                book_id: bookId,
                title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
                file_url: url,
                sequence_order: existingChapterCount + i
            });

            if (chapterError) throw chapterError;
        }

        return { error: null };
    } catch (err) {
        return { error: err as Error };
    }
}
