'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { upsertProgress, fetchProgress } from '@/lib/api/progress';
import type { ReadingProgressData } from '@/types/database';

/**
 * Reading progress interface for the hook
 */
export interface ReadingProgress {
    location: string;
    percentage: number;
    lastRead: number;
    totalLocations?: number;
    currentLocation?: number;
}

/**
 * Hook for syncing reading progress with Supabase
 * Falls back to localStorage when offline or on error
 */
export function useReadingProgressSync(bookId: string, userId?: string) {
    const [progress, setProgress] = useState<ReadingProgress | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // Debounce timer ref
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // Local storage key for offline fallback
    const localStorageKey = `sarpay-progress-${bookId}`;

    // Load progress on mount
    useEffect(() => {
        async function loadProgress() {
            setIsLoading(true);
            setError(null);

            try {
                // Try to fetch from Supabase first
                const { progress: remoteProgress, error: fetchError } = await fetchProgress(bookId, userId);

                if (fetchError) {
                    console.warn('Failed to fetch progress from Supabase:', fetchError);
                    // Fall back to localStorage
                    const localData = localStorage.getItem(localStorageKey);
                    if (localData) {
                        setProgress(JSON.parse(localData));
                    }
                } else if (remoteProgress) {
                    const progressData: ReadingProgress = {
                        location: remoteProgress.location,
                        percentage: remoteProgress.percentage,
                        lastRead: new Date(remoteProgress.updated_at).getTime(),
                        totalLocations: remoteProgress.total_locations || undefined,
                        currentLocation: remoteProgress.current_location || undefined,
                    };
                    setProgress(progressData);
                    // Also sync to localStorage
                    localStorage.setItem(localStorageKey, JSON.stringify(progressData));
                } else {
                    // No remote progress, check localStorage
                    const localData = localStorage.getItem(localStorageKey);
                    if (localData) {
                        setProgress(JSON.parse(localData));
                    }
                }
            } catch (err) {
                console.error('Error loading progress:', err);
                setError(err as Error);
                // Final fallback to localStorage
                const localData = localStorage.getItem(localStorageKey);
                if (localData) {
                    setProgress(JSON.parse(localData));
                }
            } finally {
                setIsLoading(false);
            }
        }

        loadProgress();
    }, [bookId, userId, localStorageKey]);

    // Update progress with debouncing
    const updateProgress = useCallback(
        (newProgress: Partial<ReadingProgress>) => {
            const updatedProgress: ReadingProgress = {
                location: newProgress.location ?? progress?.location ?? '',
                percentage: newProgress.percentage ?? progress?.percentage ?? 0,
                lastRead: Date.now(),
                totalLocations: newProgress.totalLocations ?? progress?.totalLocations,
                currentLocation: newProgress.currentLocation ?? progress?.currentLocation,
            };

            // Update local state immediately
            setProgress(updatedProgress);

            // Save to localStorage immediately for offline support
            localStorage.setItem(localStorageKey, JSON.stringify(updatedProgress));

            // Debounce Supabase sync
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }

            debounceRef.current = setTimeout(async () => {
                setIsSyncing(true);
                try {
                    const progressData: ReadingProgressData = {
                        location: updatedProgress.location,
                        percentage: updatedProgress.percentage,
                        currentLocation: updatedProgress.currentLocation,
                        totalLocations: updatedProgress.totalLocations,
                    };

                    const { error: syncError } = await upsertProgress(bookId, progressData, userId);

                    if (syncError) {
                        console.warn('Failed to sync progress to Supabase:', syncError);
                        // Progress is still saved locally, so this is non-critical
                    }
                } catch (err) {
                    console.warn('Error syncing progress:', err);
                } finally {
                    setIsSyncing(false);
                }
            }, 1000); // 1 second debounce
        },
        [bookId, userId, progress, localStorageKey]
    );

    // Clear progress
    const clearProgress = useCallback(async () => {
        setProgress(null);
        localStorage.removeItem(localStorageKey);

        try {
            // Also delete from Supabase
            const { deleteProgress } = await import('@/lib/api/progress');
            await deleteProgress(bookId, userId);
        } catch (err) {
            console.warn('Failed to delete progress from Supabase:', err);
        }
    }, [bookId, userId, localStorageKey]);

    // Cleanup debounce timer on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    return {
        progress,
        isLoading,
        isSyncing,
        error,
        updateProgress,
        clearProgress,
    };
}
