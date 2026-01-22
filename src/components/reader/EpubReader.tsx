'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import ePub, { Book, Rendition, NavItem } from 'epubjs';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  BookOpen,
} from 'lucide-react';
import { useReadingProgressSync } from '@/hooks/useReadingProgressSync';
import { useReaderPreferences, ThemeMode } from '@/hooks/useLocalStorage';
import ReaderSettings from './ReaderSettings';

interface EpubReaderProps {
  /** URL or path to the EPUB file */
  url: string;
  /** Unique identifier for the book (for progress tracking) */
  bookId: string;
  /** Book title for display */
  title?: string;
  /** Callback when reader is closed */
  onClose?: () => void;
}

const themeStyles: Record<ThemeMode, { bg: string; text: string; accent: string }> = {
  original: {
    bg: '#ffffff',
    text: '#1a1a1a',
    accent: '#007aff',
  },
  quiet: {
    bg: '#e8e8e8',
    text: '#3a3a3a',
    accent: '#007aff',
  },
  paper: {
    bg: '#f4ecd8',
    text: '#5c4b37',
    accent: '#8b7355',
  },
  focus: {
    bg: '#000000',
    text: '#e5e5e5',
    accent: '#0a84ff',
  },
};

export default function EpubReader({ url, bookId, title, onClose }: EpubReaderProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<string>('');
  const [toc, setToc] = useState<NavItem[]>([]);
  const [showToc, setShowToc] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [progress, setProgress] = useState(0);

  const { progress: savedProgress, updateProgress } = useReadingProgressSync(bookId);
  const { preferences, updatePreference } = useReaderPreferences();

  // Get font family CSS
  const getFontFamily = useCallback((fontFamily: 'serif' | 'sans' | 'pyidaungsu' | 'noto-sans-myanmar') => {
    switch (fontFamily) {
      case 'serif':
        return "'Lora', 'Georgia', 'Times New Roman', serif";
      case 'sans':
        return "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      case 'pyidaungsu':
        return "'Pyidaungsu', 'Padauk', serif";
      case 'noto-sans-myanmar':
        return "'Noto Sans Myanmar', 'Padauk', sans-serif";
      default:
        return "'Lora', serif";
    }
  }, []);

  // Get font weight value
  const getFontWeight = useCallback((weight: 'normal' | 'medium' | 'bold') => {
    const weightMap = { normal: '400', medium: '500', bold: '700' };
    return weightMap[weight];
  }, []);

  // Apply theme to rendition
  const applyTheme = useCallback((rendition: Rendition, theme: ThemeMode) => {
    const style = themeStyles[theme] || themeStyles.original;

    // Register theme with comprehensive styles for all text elements
    rendition.themes.register(theme, {
      'body': {
        'background': `${style.bg} !important`,
        'background-color': `${style.bg} !important`,
        'color': `${style.text} !important`,
      },
      'body *': {
        'color': `${style.text} !important`,
        'background-color': 'transparent !important',
      },
      'p, span, div, h1, h2, h3, h4, h5, h6, a, li, td, th': {
        'color': `${style.text} !important`,
      },
      'a': {
        'color': `${style.accent} !important`,
      },
    });

    // Select and apply the theme
    rendition.themes.select(theme);
  }, []);

  // Apply custom styles (typography, brightness, etc.)
  const applyCustomStyles = useCallback((rendition: Rendition) => {
    const fontFamily = getFontFamily(preferences.fontFamily);
    const fontWeight = getFontWeight(preferences.fontWeight);
    const brightness = preferences.brightness / 100;

    // Adjust line height specifically for Burmese scripts if needed, but 1.8-2.0 is good generally
    const lineHeight = preferences.fontFamily === 'pyidaungsu' || preferences.fontFamily === 'noto-sans-myanmar'
      ? Math.max(preferences.lineHeight, 2.0)
      : preferences.lineHeight;

    rendition.themes.fontSize(`${preferences.fontSize}px`);

    // Apply styles using the correct EPUB.js API
    // Inject responsive padding via CSS if possible, but for default theme:
    rendition.themes.default({
      'body': {
        'font-family': `${fontFamily} !important`,
        'line-height': `${lineHeight} !important`,
        'font-weight': `${fontWeight} !important`,
        'filter': `brightness(${brightness}) !important`,
        'padding-top': 'env(safe-area-inset-top) !important', // Handle notch
        'padding-bottom': 'env(safe-area-inset-bottom) !important',
        // We handle horizontal padding in the container mostly, but add some here for safety
        'padding-left': '20px !important',
        'padding-right': '20px !important',
      },
      'p': {
        'margin-bottom': '1em !important',
        'line-height': `${lineHeight} !important`,
      },
      // Ensure Burmese text doesn't clip
      '.calibre': {
        'line-height': `${lineHeight} !important`,
      }
    });
  }, [preferences, getFontFamily, getFontWeight]);

  // Initialize EPUB
  useEffect(() => {
    if (!viewerRef.current) return;

    const book = ePub(url);
    bookRef.current = book;

    // Detect screen size for spread
    const isLargeScreen = window.innerWidth >= 1024;

    const rendition = book.renderTo(viewerRef.current, {
      width: '100%',
      height: '100%',
      spread: isLargeScreen ? 'auto' : 'none',
      flow: 'paginated',
    });

    renditionRef.current = rendition;

    // Apply theme and styles
    applyTheme(rendition, preferences.theme);
    applyCustomStyles(rendition);

    // Load saved progress or start from beginning
    if (savedProgress?.location) {
      rendition.display(savedProgress.location);
    } else {
      rendition.display();
    }

    // Get table of contents
    book.loaded.navigation.then((nav) => {
      setToc(nav.toc);
    });

    // Track location changes
    rendition.on('locationChanged', (location: { start: { cfi: string }; end: { cfi: string } }) => {
      setCurrentLocation(location.start.cfi);
      setIsLoading(false);

      // Calculate progress
      if (book.locations.length()) {
        try {
          const percentage = book.locations.percentageFromCfi(location.start.cfi);
          // percentageFromCfi can return a value outside 0-1 range sometimes, clamp it
          const clampedPercentage = Math.max(0, Math.min(1, percentage));

          setProgress(Math.round(clampedPercentage * 100));
          updateProgress({
            location: location.start.cfi,
            percentage: Math.round(clampedPercentage * 100),
          });
        } catch (error) {
          console.warn('Error calculating progress:', error);
        }
      }
    });

    // Generate locations for progress tracking
    book.ready.then(() => {
      return book.locations.generate(1024);
    }).then(() => {
      setIsLoading(false);
    });

    // Keyboard navigation
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        rendition.prev();
      } else if (e.key === 'ArrowRight') {
        rendition.next();
      }
    };

    document.addEventListener('keydown', handleKeydown);

    return () => {
      document.removeEventListener('keydown', handleKeydown);
      book.destroy();
    };
  }, [url, savedProgress?.location, updateProgress, applyTheme, applyCustomStyles, preferences.theme]);

  // Apply custom styles whenever preferences change
  useEffect(() => {
    if (renditionRef.current) {
      applyTheme(renditionRef.current, preferences.theme);
      applyCustomStyles(renditionRef.current);
    }
  }, [preferences, applyTheme, applyCustomStyles]);

  // Navigation handlers
  const goNext = useCallback(() => {
    renditionRef.current?.next();
  }, []);

  const goPrev = useCallback(() => {
    renditionRef.current?.prev();
  }, []);

  const goToChapter = useCallback((href: string) => {
    renditionRef.current?.display(href);
    setShowToc(false);
  }, []);

  const currentTheme = themeStyles[preferences.theme] || themeStyles.original;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: currentTheme.bg, color: currentTheme.text }}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-current/10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowToc(!showToc)}
            className="p-2 rounded-lg hover:bg-current/10 transition-colors"
            aria-label="Table of Contents"
          >
            <Menu size={20} />
          </button>
          <h1 className="text-lg font-medium truncate max-w-xs">{title || 'Reading'}</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* AA Settings Button */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-3 py-2 rounded-lg hover:bg-current/10 transition-colors font-bold text-lg"
            aria-label="Reading settings"
          >
            Aa
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-current/10 transition-colors"
              aria-label="Close reader"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </header>

      {/* Main content area */}
      <div className="flex-1 relative flex">
        {/* Table of Contents Sidebar */}
        <AnimatePresence>
          {showToc && (
            <motion.aside
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute left-0 top-0 bottom-0 w-72 border-r border-current/10 overflow-y-auto z-10"
              style={{ backgroundColor: currentTheme.bg }}
            >
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BookOpen size={20} />
                  Contents
                </h2>
                <nav>
                  <ul className="space-y-1">
                    {toc.map((item, index) => (
                      <li key={index}>
                        <button
                          onClick={() => goToChapter(item.href)}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-current/10 transition-colors text-sm"
                        >
                          {item.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Reader area */}
        <div className="flex-1 flex items-center justify-center relative">
          {/* Previous button */}
          <button
            onClick={goPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full hover:bg-current/10 transition-colors z-10"
            aria-label="Previous page"
          >
            <ChevronLeft size={24} />
          </button>

          {/* EPUB viewer */}
          <div
            ref={viewerRef}
            className="w-full h-full max-w-5xl mx-auto px-4 sm:px-12 lg:px-24"
          />

          {/* Next button */}
          <button
            onClick={goNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full hover:bg-current/10 transition-colors z-10"
            aria-label="Next page"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <footer className="px-4 py-3 border-t border-current/10">
        <div className="flex items-center gap-4">
          <span className="text-sm opacity-70">{progress}%</span>
          <div className="flex-1 h-1 bg-current/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: currentTheme.accent }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </footer>

      {/* Loading overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center z-50"
            style={{ backgroundColor: currentTheme.bg }}
          >
            <div className="flex flex-col items-center gap-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="w-8 h-8 border-2 border-current/20 border-t-current rounded-full"
              />
              <span className="text-sm opacity-70">Loading book...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reader Settings */}
      <ReaderSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
