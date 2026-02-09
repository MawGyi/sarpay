import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useReadingProgressSync } from '@/hooks/useReadingProgressSync';

// ─── Mock the progress API module ──────────────────────────

vi.mock('@/lib/api/progress', () => ({
  fetchProgress: vi.fn(),
  upsertProgress: vi.fn(),
  deleteProgress: vi.fn(),
}));

import { fetchProgress, upsertProgress, deleteProgress } from '@/lib/api/progress';

const mockFetchProgress = fetchProgress as ReturnType<typeof vi.fn>;
const mockUpsertProgress = upsertProgress as ReturnType<typeof vi.fn>;
const mockDeleteProgress = deleteProgress as ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

const BOOK_ID = 'book-123';
const USER_ID = 'user-456';
const LOCAL_KEY = `sarpay-progress-${BOOK_ID}`;

describe('useReadingProgressSync', () => {
  // ─── Loading from Supabase ──────────────────────────────

  describe('fetching progress on mount', () => {
    it('loads progress from Supabase when available', async () => {
      const remoteProgress = {
        id: 'p1',
        user_id: USER_ID,
        book_id: BOOK_ID,
        location: 'epubcfi(/6/2)',
        percentage: 42,
        current_location: 10,
        total_locations: 24,
        updated_at: '2025-01-15T10:00:00Z',
      };
      mockFetchProgress.mockResolvedValue({ progress: remoteProgress, error: null });

      const { result } = renderHook(() => useReadingProgressSync(BOOK_ID, USER_ID));

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.progress).toMatchObject({
        location: 'epubcfi(/6/2)',
        percentage: 42,
        totalLocations: 24,
        currentLocation: 10,
      });

      // Also persists to localStorage
      const local = JSON.parse(localStorage.getItem(LOCAL_KEY)!);
      expect(local.location).toBe('epubcfi(/6/2)');
    });

    it('falls back to localStorage when Supabase fetch fails', async () => {
      const localData = {
        location: 'local-loc',
        percentage: 20,
        lastRead: Date.now(),
      };
      localStorage.setItem(LOCAL_KEY, JSON.stringify(localData));
      mockFetchProgress.mockResolvedValue({
        progress: null,
        error: new Error('Network error'),
      });

      const { result } = renderHook(() => useReadingProgressSync(BOOK_ID, USER_ID));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.progress).toMatchObject({
        location: 'local-loc',
        percentage: 20,
      });
    });

    it('falls back to localStorage on exception', async () => {
      const localData = {
        location: 'cached',
        percentage: 55,
        lastRead: Date.now(),
      };
      localStorage.setItem(LOCAL_KEY, JSON.stringify(localData));
      mockFetchProgress.mockRejectedValue(new Error('Connection timeout'));

      const { result } = renderHook(() => useReadingProgressSync(BOOK_ID, USER_ID));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.progress?.location).toBe('cached');
      expect(result.current.error).toBeInstanceOf(Error);
    });

    it('returns null progress when nothing is stored anywhere', async () => {
      mockFetchProgress.mockResolvedValue({ progress: null, error: null });

      const { result } = renderHook(() => useReadingProgressSync(BOOK_ID));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.progress).toBeNull();
    });
  });

  // ─── Update with debounce ───────────────────────────────

  describe('updateProgress with debounce', () => {
    it('updates local state and localStorage immediately', async () => {
      mockFetchProgress.mockResolvedValue({ progress: null, error: null });
      mockUpsertProgress.mockResolvedValue({ progress: null, error: null });

      const { result } = renderHook(() => useReadingProgressSync(BOOK_ID, USER_ID));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateProgress({ location: 'ch3', percentage: 30 });
      });

      // Local state updates immediately
      expect(result.current.progress?.location).toBe('ch3');
      expect(result.current.progress?.percentage).toBe(30);

      // localStorage is written immediately
      const local = JSON.parse(localStorage.getItem(LOCAL_KEY)!);
      expect(local.location).toBe('ch3');
    });

    it('debounces Supabase sync by 1 second', async () => {
      vi.useFakeTimers();
      mockFetchProgress.mockResolvedValue({ progress: null, error: null });
      mockUpsertProgress.mockResolvedValue({ progress: null, error: null });

      const { result } = renderHook(() => useReadingProgressSync(BOOK_ID, USER_ID));

      // Flush the async useEffect
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      act(() => {
        result.current.updateProgress({ location: 'ch1', percentage: 10 });
      });

      // Supabase not called yet
      expect(mockUpsertProgress).not.toHaveBeenCalled();

      // Advance past debounce
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(mockUpsertProgress).toHaveBeenCalledTimes(1);
      expect(mockUpsertProgress).toHaveBeenCalledWith(
        BOOK_ID,
        expect.objectContaining({ location: 'ch1', percentage: 10 }),
        USER_ID
      );
      vi.useRealTimers();
    });

    it('resets debounce timer on rapid updates', async () => {
      vi.useFakeTimers();
      mockFetchProgress.mockResolvedValue({ progress: null, error: null });
      mockUpsertProgress.mockResolvedValue({ progress: null, error: null });

      const { result } = renderHook(() => useReadingProgressSync(BOOK_ID, USER_ID));

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      // Rapid updates
      act(() => {
        result.current.updateProgress({ location: 'ch1', percentage: 10 });
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      act(() => {
        result.current.updateProgress({ location: 'ch2', percentage: 20 });
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      // Not called yet — timer was reset
      expect(mockUpsertProgress).not.toHaveBeenCalled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      // Now called with last value
      expect(mockUpsertProgress).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });

    it('handles Supabase sync errors gracefully', async () => {
      vi.useFakeTimers();
      mockFetchProgress.mockResolvedValue({ progress: null, error: null });
      mockUpsertProgress.mockResolvedValue({
        progress: null,
        error: new Error('Sync failed'),
      });

      const { result } = renderHook(() => useReadingProgressSync(BOOK_ID, USER_ID));

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      act(() => {
        result.current.updateProgress({ location: 'ch5', percentage: 50 });
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      // Progress is still available locally
      expect(result.current.progress?.location).toBe('ch5');
      // localStorage still has it
      const local = JSON.parse(localStorage.getItem(LOCAL_KEY)!);
      expect(local.location).toBe('ch5');
      vi.useRealTimers();
    });
  });

  // ─── Clear progress ─────────────────────────────────────

  describe('clearProgress', () => {
    it('clears local state and localStorage', async () => {
      mockFetchProgress.mockResolvedValue({ progress: null, error: null });
      mockDeleteProgress.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useReadingProgressSync(BOOK_ID, USER_ID));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateProgress({ location: 'ch1', percentage: 10 });
      });

      await act(async () => {
        await result.current.clearProgress();
      });

      expect(result.current.progress).toBeNull();
      expect(localStorage.getItem(LOCAL_KEY)).toBeNull();
    });
  });

  // ─── Cleanup ────────────────────────────────────────────

  describe('cleanup', () => {
    it('clears debounce timer on unmount', async () => {
      vi.useFakeTimers();
      mockFetchProgress.mockResolvedValue({ progress: null, error: null });
      mockUpsertProgress.mockResolvedValue({ progress: null, error: null });

      const { result, unmount } = renderHook(() =>
        useReadingProgressSync(BOOK_ID, USER_ID)
      );

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      act(() => {
        result.current.updateProgress({ location: 'ch1', percentage: 10 });
      });

      unmount();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });

      // Upsert should not be called after unmount
      expect(mockUpsertProgress).not.toHaveBeenCalled();
      vi.useRealTimers();
    });
  });
});
