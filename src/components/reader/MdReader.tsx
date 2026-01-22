'use client';

import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronUp,
  X,
  ChevronLeft,
  ChevronRight,
  Menu,
} from 'lucide-react';
import { useReadingProgress, useReaderPreferences, ThemeMode } from '@/hooks/useLocalStorage';
import { useImmersiveMode } from '@/hooks/useImmersiveMode';
import ReaderSettings from './ReaderSettings';
import MdReaderSidebar from './MdReaderSidebar';
import type { ChapterRow } from '@/types/database';

interface MdReaderProps {
  /** Markdown content to display */
  content: string;
  /** Unique identifier for the book (for progress tracking) */
  bookId: string;
  /** Book title for display */
  title?: string;
  /** Callback when reader is closed */
  onClose?: () => void;
  /** Current chapter index (1-based) */
  currentChapter?: number;
  /** Total number of chapters */
  totalChapters?: number;
  /** Callback when next chapter is requested */
  onNextChapter?: () => void;
  /** Callback when previous chapter is requested */
  onPreviousChapter?: () => void;
  /** List of all chapters for sidebar */
  chapters?: ChapterRow[];
  /** Current chapter ID for highlighting in sidebar */
  currentChapterId?: string;
  /** Callback when chapter is selected from sidebar */
  onChapterSelect?: (chapterId: string) => void;
}

const themeStyles: Record<ThemeMode, { bg: string; text: string; accent: string; prose: string }> = {
  original: {
    bg: 'bg-white',
    text: 'text-gray-900',
    accent: 'text-blue-600',
    prose: 'prose-gray',
  },
  quiet: {
    bg: 'bg-gray-200',
    text: 'text-gray-800',
    accent: 'text-blue-600',
    prose: 'prose-gray',
  },
  paper: {
    bg: 'bg-[#f4ecd8]',
    text: 'text-[#5c4b37]',
    accent: 'text-[#8b7355]',
    prose: 'prose-stone',
  },
  focus: {
    bg: 'bg-black',
    text: 'text-gray-100',
    accent: 'text-blue-400',
    prose: 'prose-invert',
  },
};

export default function MdReader({
  content,
  bookId,
  title,
  onClose,
  currentChapter,
  totalChapters,
  onNextChapter,
  onPreviousChapter,
  chapters,
  currentChapterId,
  onChapterSelect,
}: MdReaderProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  const { progress: savedProgress, updateProgress } = useReadingProgress(bookId);
  const { preferences, updatePreference } = useReaderPreferences();

  // Immersive mode hook for auto-hiding UI
  const {
    isUIVisible,
    isFullscreen,
    toggleUI,
    handleScroll: immersiveHandleScroll,
    handleMouseMove: immersiveHandleMouseMove,
    toggleFullscreen,
  } = useImmersiveMode({ contentRef });

  // Get font family CSS
  const getFontFamily = () => {
    switch (preferences.fontFamily) {
      case 'serif':
        return "'Lora', 'Georgia', 'Times New Roman', serif";
      case 'sans':
        return "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
      case 'pyidaungsu':
        return "'Pyidaungsu', 'Padauk', serif";
      case 'noto-sans-myanmar':
        return "'Noto Sans Myanmar', 'Padauk', sans-serif";
      default:
        return "'Lora', 'Georgia', serif";
    }
  };

  // Get font weight value
  const getFontWeight = () => {
    const weightMap = { normal: 400, medium: 500, bold: 700 };
    return weightMap[preferences.fontWeight];
  };

  // Restore scroll position on mount
  useEffect(() => {
    if (savedProgress?.location && contentRef.current) {
      const scrollPosition = parseInt(savedProgress.location, 10);
      if (!isNaN(scrollPosition)) {
        contentRef.current.scrollTop = scrollPosition;
      }
    }
  }, [savedProgress?.location]);

  // Track scroll position and progress
  const handleScroll = useCallback(() => {
    if (!contentRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
    const percentage = Math.round((scrollTop / (scrollHeight - clientHeight)) * 100);

    setProgress(Math.min(100, Math.max(0, percentage)));
    setShowBackToTop(scrollTop > 500);

    // Trigger immersive mode scroll handling
    immersiveHandleScroll();

    // Debounced save
    updateProgress({
      location: scrollTop.toString(),
      percentage: Math.min(100, Math.max(0, percentage)),
    });
  }, [updateProgress, immersiveHandleScroll]);

  // Show controls on mouse move
  const handleMouseMove = useCallback(() => {
    immersiveHandleMouseMove();
  }, [immersiveHandleMouseMove]);

  // Handle content area click for immersive toggle
  const handleContentClick = useCallback((e: React.MouseEvent) => {
    // Only toggle if clicking directly on content area, not on buttons or links
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'BUTTON' ||
      target.tagName === 'A' ||
      target.closest('button') ||
      target.closest('a')
    ) {
      return;
    }
    toggleUI();
  }, [toggleUI]);

  // Scroll to top
  const scrollToTop = useCallback(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const currentTheme = themeStyles[preferences.theme] || themeStyles.original;

  // Adjust line height specifically for Burmese scripts - enforce 2.0 minimum
  const lineHeight = (preferences.fontFamily === 'pyidaungsu' || preferences.fontFamily === 'noto-sans-myanmar')
    ? 2.0
    : preferences.lineHeight;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col theme-transition ${currentTheme.bg} ${currentTheme.text}`}
      onMouseMove={handleMouseMove}
    >
      {/* Top Progress Bar - thin elegant indicator */}
      <div className="fixed top-0 left-0 right-0 h-[2px] bg-current/10 z-[60]">
        <motion.div
          className={`h-full ${preferences.theme === 'focus' ? 'bg-blue-400' :
              preferences.theme === 'paper' ? 'bg-amber-600' : 'bg-blue-600'
            }`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.2 }}
        />
      </div>

      {/* Header - Auto-hide with slide-in from top */}
      <AnimatePresence>
        {isUIVisible && (
          <motion.header
            initial={{ opacity: 0, y: '-100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '-100%' }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex items-center justify-between px-4 py-3 border-b border-current/10 backdrop-blur-sm bg-inherit/80"
          >
            <div className="flex items-center gap-3">
              {/* ToC Menu Button */}
              {chapters && chapters.length > 0 && (
                <button
                  onClick={() => setShowSidebar(true)}
                  className="p-2 rounded-lg hover:bg-current/10 transition-colors"
                  aria-label="Table of contents"
                >
                  <Menu size={20} />
                </button>
              )}
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
          </motion.header>
        )}
      </AnimatePresence>

      {/* Content area - clickable for immersive toggle */}
      <div
        ref={contentRef}
        onScroll={handleScroll}
        onClick={handleContentClick}
        className="flex-1 overflow-y-auto scroll-smooth cursor-pointer"
        style={{
          filter: `brightness(${preferences.brightness / 100})`,
          overscrollBehaviorY: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Animated Content Wrapper */}
        <AnimatePresence mode="wait">
          <motion.article
            key={currentChapterId || bookId} // Re-mount when chapter changes for transition
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className={`
              mx-auto px-4 sm:px-6 md:px-12 py-8 sm:py-12 max-w-3xl
              prose ${currentTheme.prose} prose-lg
              prose-headings:font-serif
              prose-p:leading-relaxed
              prose-li:leading-relaxed
            `}
            style={{
              fontSize: `${preferences.fontSize}px`,
              lineHeight: lineHeight,
              fontFamily: getFontFamily(),
              fontWeight: getFontWeight(),
            }}
          >
            {useMemo(() => (
              <ReactMarkdown
                components={{
                  // Custom heading styles with Burmese font-weight 500
                  h1: ({ children }) => (
                    <h1
                      className="text-3xl font-serif mt-12 mb-6 first:mt-0"
                      style={{ fontWeight: 500 }}
                    >
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2
                      className="text-2xl font-serif mt-10 mb-4"
                      style={{ fontWeight: 500 }}
                    >
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3
                      className="text-xl font-serif mt-8 mb-3"
                      style={{ fontWeight: 500 }}
                    >
                      {children}
                    </h3>
                  ),
                  // Paragraph with comfortable spacing
                  p: ({ children }) => (
                    <p className="mb-6 text-justify hyphens-auto">
                      {children}
                    </p>
                  ),
                  // Blockquote styling
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 pl-6 italic my-6 opacity-90">
                      {children}
                    </blockquote>
                  ),
                  // Code block styling
                  code: ({ className, children }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code className="px-1.5 py-0.5 rounded bg-current/10 text-sm font-mono">
                        {children}
                      </code>
                    ) : (
                      <code className={className}>{children}</code>
                    );
                  },
                  // Link styling
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      className={`${currentTheme.accent} underline underline-offset-2 hover:opacity-80 transition-opacity`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {children}
                    </a>
                  ),
                  // Image styling
                  img: ({ src, alt }) => (
                    <figure className="my-8">
                      <img
                        src={src}
                        alt={alt || ''}
                        className="rounded-lg mx-auto max-w-full"
                      />
                      {alt && (
                        <figcaption className="text-center text-sm opacity-70 mt-2">
                          {alt}
                        </figcaption>
                      )}
                    </figure>
                  ),
                  // Horizontal rule
                  hr: () => (
                    <hr className="my-12 border-current/20" />
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            ), [content, currentTheme.accent, currentTheme.prose])}

            {/* Chapter Navigation */}
            {(onNextChapter || onPreviousChapter) && totalChapters && totalChapters > 1 && (
              <div className="mt-16 pt-8 border-t border-current/20">
                <div className="flex items-center justify-between gap-4">
                  {onPreviousChapter && currentChapter && currentChapter > 1 ? (
                    <button
                      onClick={onPreviousChapter}
                      className="flex flex-col items-start gap-1 px-6 py-4 rounded-xl bg-current/10 hover:bg-current/20 transition-all hover:scale-105 group"
                    >
                      <div className="flex items-center gap-2">
                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-medium">Previous Law</span>
                      </div>
                      {chapters && chapters[currentChapter - 2] && (
                        <span className="text-xs opacity-60 ml-7" style={{ fontFamily: "'Pyidaungsu', 'Padauk', serif" }}>
                          {chapters[currentChapter - 2].title.substring(0, 30)}...
                        </span>
                      )}
                    </button>
                  ) : (
                    <div />
                  )}

                  {currentChapter && totalChapters && (
                    <span className="text-sm opacity-60 font-medium">
                      Law {currentChapter} of {totalChapters}
                    </span>
                  )}

                  {onNextChapter && currentChapter && currentChapter < totalChapters ? (
                    <button
                      onClick={onNextChapter}
                      className="flex flex-col items-end gap-1 px-6 py-4 rounded-xl bg-current/10 hover:bg-current/20 transition-all hover:scale-105 group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Next Law</span>
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </div>
                      {chapters && chapters[currentChapter] && (
                        <span className="text-xs opacity-60 mr-7" style={{ fontFamily: "'Pyidaungsu', 'Padauk', serif" }}>
                          {chapters[currentChapter].title.substring(0, 30)}...
                        </span>
                      )}
                    </button>
                  ) : (
                    <div />
                  )}
                </div>
              </div>
            )}
          </motion.article>
        </AnimatePresence>
      </div>

      {/* Progress bar - Auto-hide with slide-in from bottom */}
      <AnimatePresence>
        {isUIVisible && (
          <motion.footer
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="px-4 py-3 border-t border-current/10"
          >
            <div className="flex items-center gap-4">
              <span className="text-sm opacity-70">{progress}%</span>
              <div className="flex-1 h-1 bg-current/20 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${preferences.theme === 'focus' ? 'bg-blue-400' :
                      preferences.theme === 'paper' ? 'bg-amber-600' : 'bg-blue-600'
                    }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </motion.footer>
        )}
      </AnimatePresence>

      {/* Back to top button */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={scrollToTop}
            className="fixed bottom-20 right-6 p-3 rounded-full shadow-lg bg-current/10 backdrop-blur-sm hover:bg-current/20 transition-colors"
            aria-label="Back to top"
          >
            <ChevronUp size={24} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Reader Settings */}
      <ReaderSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />

      {/* Sidebar Table of Contents */}
      {chapters && chapters.length > 0 && onChapterSelect && (
        <MdReaderSidebar
          isOpen={showSidebar}
          onClose={() => setShowSidebar(false)}
          chapters={chapters}
          currentChapterId={currentChapterId}
          onChapterSelect={onChapterSelect}
          theme={preferences.theme}
        />
      )}
    </div>
  );
}
