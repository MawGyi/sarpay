import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useImmersiveMode } from '@/hooks/useImmersiveMode';
import { createRef } from 'react';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

/** Helper to build a fake scrollable div ref */
function makeContentRef(scrollTop = 0) {
  const ref = createRef<HTMLDivElement>();
  const div = document.createElement('div');
  Object.defineProperty(div, 'scrollTop', {
    get: () => scrollTop,
    set: (v: number) => {
      scrollTop = v;
    },
    configurable: true,
  });
  // Assign current (readonly workaround)
  (ref as { current: HTMLDivElement }).current = div;
  return { ref, setScrollTop: (v: number) => { scrollTop = v; } };
}

describe('useImmersiveMode', () => {
  // ─── Initial state ─────────────────────────────────────

  describe('initial state', () => {
    it('starts with UI visible by default', () => {
      const { result } = renderHook(() => useImmersiveMode({}));
      expect(result.current.isUIVisible).toBe(true);
    });

    it('starts with UI hidden when initialVisible=false', () => {
      const { result } = renderHook(() =>
        useImmersiveMode({ initialVisible: false })
      );
      expect(result.current.isUIVisible).toBe(false);
    });

    it('starts not in fullscreen', () => {
      const { result } = renderHook(() => useImmersiveMode({}));
      expect(result.current.isFullscreen).toBe(false);
    });
  });

  // ─── Toggle UI ──────────────────────────────────────────

  describe('toggleUI', () => {
    it('toggles visibility on each call', () => {
      const { result } = renderHook(() => useImmersiveMode({}));

      act(() => result.current.toggleUI());
      expect(result.current.isUIVisible).toBe(false);

      act(() => result.current.toggleUI());
      expect(result.current.isUIVisible).toBe(true);
    });
  });

  describe('showUI / hideUI', () => {
    it('showUI makes UI visible', () => {
      const { result } = renderHook(() =>
        useImmersiveMode({ initialVisible: false })
      );

      act(() => result.current.showUI());
      expect(result.current.isUIVisible).toBe(true);
    });

    it('hideUI hides UI', () => {
      const { result } = renderHook(() => useImmersiveMode({}));

      act(() => result.current.hideUI());
      expect(result.current.isUIVisible).toBe(false);
    });
  });

  // ─── Scroll detection ──────────────────────────────────

  describe('scroll detection', () => {
    it('hides UI when scrolling down', () => {
      const { ref, setScrollTop } = makeContentRef(0);
      const { result } = renderHook(() =>
        useImmersiveMode({ contentRef: ref })
      );

      // Simulate scrolling down
      setScrollTop(100);
      act(() => result.current.handleScroll());

      expect(result.current.isUIVisible).toBe(false);
    });

    it('shows UI when scrolling back to top', () => {
      const { ref, setScrollTop } = makeContentRef(0);
      const { result } = renderHook(() =>
        useImmersiveMode({ contentRef: ref })
      );

      // First scroll down
      setScrollTop(200);
      act(() => result.current.handleScroll());
      expect(result.current.isUIVisible).toBe(false);

      // Then scroll to top
      setScrollTop(0);
      act(() => result.current.handleScroll());
      expect(result.current.isUIVisible).toBe(true);
    });

    it('does nothing if contentRef is not provided', () => {
      const { result } = renderHook(() => useImmersiveMode({}));

      // Should not throw
      act(() => result.current.handleScroll());
      expect(result.current.isUIVisible).toBe(true);
    });

    it('keeps UI state when scrolling up (not at top)', () => {
      const { ref, setScrollTop } = makeContentRef(0);
      const { result } = renderHook(() =>
        useImmersiveMode({ contentRef: ref })
      );

      // Scroll down to hide
      setScrollTop(200);
      act(() => result.current.handleScroll());
      expect(result.current.isUIVisible).toBe(false);

      // Scroll up partially (not to top) — UI stays hidden
      setScrollTop(100);
      act(() => result.current.handleScroll());
      expect(result.current.isUIVisible).toBe(false);
    });
  });

  // ─── Auto-hide timers ──────────────────────────────────

  describe('auto-hide timers', () => {
    it('scheduleHide via handleMouseMove hides UI after autoHideDelay', () => {
      const { result } = renderHook(() =>
        useImmersiveMode({ autoHideDelay: 2000 })
      );

      act(() => result.current.handleMouseMove());

      expect(result.current.isUIVisible).toBe(true);

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.isUIVisible).toBe(false);
    });

    it('resets timer on repeated mouse moves', () => {
      const { result } = renderHook(() =>
        useImmersiveMode({ autoHideDelay: 2000 })
      );

      act(() => result.current.handleMouseMove());

      act(() => {
        vi.advanceTimersByTime(1500);
      });

      // Move again — should reset
      act(() => result.current.handleMouseMove());

      act(() => {
        vi.advanceTimersByTime(1500);
      });

      // Only 1500ms since last move, still visible
      expect(result.current.isUIVisible).toBe(true);

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Now 2000ms since last move
      expect(result.current.isUIVisible).toBe(false);
    });

    it('toggleUI clears the hide timer', () => {
      const { result } = renderHook(() =>
        useImmersiveMode({ autoHideDelay: 1000 })
      );

      // Start a hide timer
      act(() => result.current.handleMouseMove());

      // Toggle hides
      act(() => result.current.toggleUI());
      expect(result.current.isUIVisible).toBe(false);

      // Toggle shows again and clears timer
      act(() => result.current.toggleUI());
      expect(result.current.isUIVisible).toBe(true);

      // Even after delay, UI should remain visible (timer was cleared)
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.isUIVisible).toBe(true);
    });

    it('uses default autoHideDelay of 3000ms', () => {
      const { result } = renderHook(() => useImmersiveMode({}));

      act(() => result.current.handleMouseMove());

      act(() => {
        vi.advanceTimersByTime(2999);
      });
      expect(result.current.isUIVisible).toBe(true);

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current.isUIVisible).toBe(false);
    });

    it('cleans up timeout on unmount', () => {
      const { result, unmount } = renderHook(() =>
        useImmersiveMode({ autoHideDelay: 1000 })
      );

      act(() => result.current.handleMouseMove());

      unmount();

      // Should not throw or cause issues
      act(() => {
        vi.advanceTimersByTime(2000);
      });
    });
  });

  // ─── Fullscreen ─────────────────────────────────────────

  describe('fullscreen', () => {
    it('toggleFullscreen enters fullscreen', async () => {
      const requestFullscreen = vi.fn().mockResolvedValue(undefined);
      document.documentElement.requestFullscreen = requestFullscreen;
      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useImmersiveMode({}));

      await act(async () => {
        await result.current.toggleFullscreen();
      });

      expect(requestFullscreen).toHaveBeenCalled();
      expect(result.current.isFullscreen).toBe(true);
    });

    it('toggleFullscreen exits fullscreen when already in fullscreen', async () => {
      const exitFullscreen = vi.fn().mockResolvedValue(undefined);
      document.exitFullscreen = exitFullscreen;
      Object.defineProperty(document, 'fullscreenElement', {
        value: document.documentElement,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useImmersiveMode({}));

      await act(async () => {
        await result.current.toggleFullscreen();
      });

      expect(exitFullscreen).toHaveBeenCalled();
      expect(result.current.isFullscreen).toBe(false);
    });

    it('shows UI when exiting fullscreen via event', () => {
      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useImmersiveMode({}));

      // Hide UI first
      act(() => result.current.hideUI());
      expect(result.current.isUIVisible).toBe(false);

      // Simulate fullscreenchange event (exit)
      act(() => {
        document.dispatchEvent(new Event('fullscreenchange'));
      });

      expect(result.current.isUIVisible).toBe(true);
      expect(result.current.isFullscreen).toBe(false);
    });

    it('handles fullscreen API errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      document.documentElement.requestFullscreen = vi.fn().mockRejectedValue(
        new Error('Not allowed')
      );
      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useImmersiveMode({}));

      await act(async () => {
        await result.current.toggleFullscreen();
      });

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });
});
