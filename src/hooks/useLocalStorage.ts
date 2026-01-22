'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * A type-safe hook for persisting state to localStorage
 * Includes reading progress tracking for books
 */
export function useLocalStorage<T>(
    key: string,
    initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
    // State to store our value - initialize from localStorage if available
    const [storedValue, setStoredValue] = useState<T>(() => {
        if (typeof window === 'undefined') return initialValue;
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch {
            return initialValue;
        }
    });
    // Initialize isHydrated synchronously based on window availability
    const [isHydrated] = useState(() => typeof window !== 'undefined');

    // Listen for changes from other tabs/components
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Listen for changes from other components/tabs
        const handleStorageChange = (e: StorageEvent | CustomEvent) => {
            // Handle native storage event (other tabs)
            if (e instanceof StorageEvent && e.key === key && e.newValue) {
                try {
                    setStoredValue(JSON.parse(e.newValue));
                } catch (error) {
                    console.warn(`Error parsing storage change for key "${key}":`, error);
                }
            }

            // Handle custom event (same tab, different component)
            if (e instanceof CustomEvent && e.type === 'local-storage' && e.detail.key === key) {
                setStoredValue(e.detail.value);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('local-storage', handleStorageChange as EventListener);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('local-storage', handleStorageChange as EventListener);
        };
    }, [key]);

    // Return a wrapped version of useState's setter function
    const setValue = useCallback(
        (value: T | ((prev: T) => T)) => {
            try {
                const valueToStore = value instanceof Function ? value(storedValue) : value;
                setStoredValue(valueToStore);

                if (typeof window !== 'undefined') {
                    window.localStorage.setItem(key, JSON.stringify(valueToStore));
                    // Dispatch custom event to notify other hooks in the same tab
                    window.dispatchEvent(new CustomEvent('local-storage', {
                        detail: { key, value: valueToStore }
                    }));
                }
            } catch (error) {
                console.warn(`Error setting localStorage key "${key}":`, error);
            }
        },
        [key, storedValue]
    );

    // Remove value from localStorage
    const removeValue = useCallback(() => {
        try {
            setStoredValue(initialValue);
            if (typeof window !== 'undefined') {
                window.localStorage.removeItem(key);
                // Dispatch custom event to notify other hooks
                window.dispatchEvent(new CustomEvent('local-storage', {
                    detail: { key, value: initialValue }
                }));
            }
        } catch (error) {
            console.warn(`Error removing localStorage key "${key}":`, error);
        }
    }, [key, initialValue]);

    return [isHydrated ? storedValue : initialValue, setValue, removeValue];
}

/**
 * Reading progress data structure
 */
export interface ReadingProgress {
    /** Current location (CFI for EPUB, scroll position for MD) */
    location: string;
    /** Percentage of book completed (0-100) */
    percentage: number;
    /** Last read timestamp */
    lastRead: number;
    /** Total pages/sections (if available) */
    totalLocations?: number;
    /** Current page/section number */
    currentLocation?: number;
}

/**
 * Book progress store structure
 */
export interface BookProgressStore {
    [bookId: string]: ReadingProgress;
}

/**
 * Hook specifically for managing reading progress across multiple books
 */
export function useReadingProgress(bookId: string) {
    const [allProgress, setAllProgress, clearAllProgress] = useLocalStorage<BookProgressStore>(
        'applebook-reading-progress',
        {}
    );

    const progress = allProgress[bookId] || null;

    const updateProgress = useCallback(
        (newProgress: Partial<ReadingProgress>) => {
            setAllProgress((prev) => {
                const existingProgress = prev[bookId] || {
                    location: '',
                    percentage: 0,
                    lastRead: Date.now(),
                };
                return {
                    ...prev,
                    [bookId]: {
                        ...existingProgress,
                        ...newProgress,
                        lastRead: Date.now(),
                    },
                };
            });
        },
        [bookId, setAllProgress]
    );

    const clearProgress = useCallback(() => {
        setAllProgress((prev) => {
            const newProgress = { ...prev };
            delete newProgress[bookId];
            return newProgress;
        });
    }, [bookId, setAllProgress]);

    return {
        progress,
        updateProgress,
        clearProgress,
        clearAllProgress,
    };
}

/**
 * Hook for theme preferences
 */
export type ThemeMode = 'original' | 'quiet' | 'paper' | 'focus';
export type FontFamily = 'serif' | 'sans' | 'pyidaungsu' | 'noto-sans-myanmar';
export type FontWeight = 'normal' | 'medium' | 'bold';

export interface ReaderPreferences {
    theme: ThemeMode;
    fontSize: number;
    fontFamily: FontFamily;
    lineHeight: number;
    brightness: number;
    fontWeight: FontWeight;
}

const defaultPreferences: ReaderPreferences = {
    theme: 'original',
    fontSize: 20, // Slightly larger default for better readability
    fontFamily: 'serif',
    lineHeight: 1.8,
    brightness: 100,
    fontWeight: 'normal',
};

export function useReaderPreferences() {
    const [preferences, setPreferences] = useLocalStorage<ReaderPreferences>(
        'applebook-reader-preferences',
        defaultPreferences
    );

    const updatePreference = useCallback(
        <K extends keyof ReaderPreferences>(key: K, value: ReaderPreferences[K]) => {
            setPreferences((prev) => ({
                ...prev,
                [key]: value,
            }));
        },
        [setPreferences]
    );

    const resetPreferences = useCallback(() => {
        setPreferences(defaultPreferences);
    }, [setPreferences]);

    return {
        preferences,
        updatePreference,
        resetPreferences,
    };
}
