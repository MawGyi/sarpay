'use client';

import { useState, useCallback, useEffect, useRef, RefObject } from 'react';

interface UseImmersiveModeOptions {
    /** Ref to the scrollable content container */
    contentRef: RefObject<HTMLDivElement | null>;
    /** Delay before auto-hiding UI after scrolling stops (ms) */
    autoHideDelay?: number;
    /** Initial UI visibility state */
    initialVisible?: boolean;
}

interface UseImmersiveModeReturn {
    /** Whether the UI (header/footer) is currently visible */
    isUIVisible: boolean;
    /** Whether the browser is in fullscreen mode */
    isFullscreen: boolean;
    /** Toggle UI visibility (for click/tap handling) */
    toggleUI: () => void;
    /** Show UI explicitly */
    showUI: () => void;
    /** Hide UI explicitly */
    hideUI: () => void;
    /** Toggle browser fullscreen mode */
    toggleFullscreen: () => Promise<void>;
    /** Handle scroll events - call this from onScroll */
    handleScroll: () => void;
    /** Handle mouse move events - call this from onMouseMove */
    handleMouseMove: () => void;
}

/**
 * Custom hook for managing immersive reading mode.
 * 
 * Features:
 * - Click/tap to toggle UI visibility
 * - Auto-hide UI on scroll down
 * - Show UI when scrolling back to top
 * - Browser Fullscreen API integration
 * 
 * Isolated for MdReader use only.
 */
export function useImmersiveMode({
    contentRef,
    autoHideDelay = 3000,
    initialVisible = true,
}: UseImmersiveModeOptions): UseImmersiveModeReturn {
    const [isUIVisible, setIsUIVisible] = useState(initialVisible);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Track previous scroll position for direction detection
    const lastScrollTopRef = useRef(0);
    const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isScrollingRef = useRef(false);

    // Clear any pending hide timeout
    const clearHideTimeout = useCallback(() => {
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }
    }, []);

    // Schedule UI hide after delay
    const scheduleHide = useCallback(() => {
        clearHideTimeout();
        hideTimeoutRef.current = setTimeout(() => {
            setIsUIVisible(false);
        }, autoHideDelay);
    }, [autoHideDelay, clearHideTimeout]);

    // Toggle UI visibility (for click/tap)
    const toggleUI = useCallback(() => {
        setIsUIVisible(prev => !prev);
        clearHideTimeout();
    }, [clearHideTimeout]);

    // Show UI explicitly
    const showUI = useCallback(() => {
        setIsUIVisible(true);
        clearHideTimeout();
    }, [clearHideTimeout]);

    // Hide UI explicitly
    const hideUI = useCallback(() => {
        setIsUIVisible(false);
        clearHideTimeout();
    }, [clearHideTimeout]);

    // Handle scroll events
    const handleScroll = useCallback(() => {
        if (!contentRef.current) return;

        const { scrollTop } = contentRef.current;
        const lastScrollTop = lastScrollTopRef.current;

        // Detect scroll direction
        const isScrollingDown = scrollTop > lastScrollTop;
        const isAtTop = scrollTop <= 0;

        // Update last scroll position
        lastScrollTopRef.current = scrollTop;
        isScrollingRef.current = true;

        if (isAtTop) {
            // Always show UI at the very top
            setIsUIVisible(true);
            clearHideTimeout();
        } else if (isScrollingDown) {
            // Hide UI when scrolling down
            setIsUIVisible(false);
            clearHideTimeout();
        }
        // When scrolling up (but not at top), UI stays in current state
    }, [contentRef, clearHideTimeout]);

    // Handle mouse move events
    const handleMouseMove = useCallback(() => {
        // Only show UI on mouse move if we're not actively scrolling
        if (!isScrollingRef.current) {
            setIsUIVisible(true);
        }

        // Reset scrolling flag after a brief pause
        isScrollingRef.current = false;

        // Schedule hide after inactivity
        scheduleHide();
    }, [scheduleHide]);

    // Toggle fullscreen mode using Browser API
    const toggleFullscreen = useCallback(async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
                setIsFullscreen(true);
            } else {
                await document.exitFullscreen();
                setIsFullscreen(false);
            }
        } catch (error) {
            console.error('Fullscreen API error:', error);
        }
    }, []);

    // Listen for fullscreen changes (including Escape key)
    useEffect(() => {
        const handleFullscreenChange = () => {
            const isNowFullscreen = !!document.fullscreenElement;
            setIsFullscreen(isNowFullscreen);
            // Show UI when exiting fullscreen so user can navigate back
            if (!isNowFullscreen) {
                setIsUIVisible(true);
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            clearHideTimeout();
        };
    }, [clearHideTimeout]);

    return {
        isUIVisible,
        isFullscreen,
        toggleUI,
        showUI,
        hideUI,
        toggleFullscreen,
        handleScroll,
        handleMouseMove,
    };
}
