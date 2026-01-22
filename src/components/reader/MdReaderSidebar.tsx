'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen } from 'lucide-react';
import type { ChapterRow } from '@/types/database';

interface MdReaderSidebarProps {
  /** Whether the sidebar is open */
  isOpen: boolean;
  /** Callback to close the sidebar */
  onClose: () => void;
  /** List of all chapters */
  chapters: ChapterRow[];
  /** Currently active chapter ID */
  currentChapterId?: string;
  /** Callback when a chapter is selected */
  onChapterSelect: (chapterId: string) => void;
  /** Theme mode for styling */
  theme?: 'original' | 'quiet' | 'paper' | 'focus';
}

const themeStyles = {
  original: {
    bg: 'bg-white/95',
    text: 'text-gray-900',
    accent: 'bg-blue-600',
    border: 'border-gray-200',
    hover: 'hover:bg-gray-100',
  },
  quiet: {
    bg: 'bg-gray-200/95',
    text: 'text-gray-800',
    accent: 'bg-blue-600',
    border: 'border-gray-300',
    hover: 'hover:bg-gray-300',
  },
  paper: {
    bg: 'bg-[#f4ecd8]/95',
    text: 'text-[#5c4b37]',
    accent: 'bg-[#8b7355]',
    border: 'border-[#d4c4a8]',
    hover: 'hover:bg-[#e8dcc0]',
  },
  focus: {
    bg: 'bg-black/95',
    text: 'text-gray-100',
    accent: 'bg-blue-400',
    border: 'border-gray-800',
    hover: 'hover:bg-gray-900',
  },
};

export default function MdReaderSidebar({
  isOpen,
  onClose,
  chapters,
  currentChapterId,
  onChapterSelect,
  theme = 'original',
}: MdReaderSidebarProps) {
  const currentChapterRef = useRef<HTMLButtonElement>(null);
  const currentTheme = themeStyles[theme];

  // Scroll to current chapter when sidebar opens
  useEffect(() => {
    if (isOpen && currentChapterRef.current) {
      currentChapterRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [isOpen]);

  const handleChapterClick = (chapterId: string) => {
    onChapterSelect(chapterId);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={`fixed left-0 top-0 bottom-0 w-80 ${currentTheme.bg} ${currentTheme.text} shadow-2xl z-50 flex flex-col backdrop-blur-xl`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${currentTheme.border}`}>
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5" />
                <h2 className="text-lg font-semibold">Table of Contents</h2>
              </div>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg ${currentTheme.hover} transition-colors`}
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chapter List */}
            <div className="flex-1 overflow-y-auto py-4 scroll-smooth">
              {chapters.length === 0 ? (
                <div className="px-6 py-8 text-center opacity-60">
                  <p className="text-sm">No chapters available</p>
                </div>
              ) : (
                <nav className="space-y-1 px-3">
                  {chapters.map((chapter, index) => {
                    const isActive = chapter.id === currentChapterId;
                    return (
                      <button
                        key={chapter.id}
                        ref={isActive ? currentChapterRef : null}
                        onClick={() => handleChapterClick(chapter.id)}
                        className={`
                          w-full text-left px-4 py-3 rounded-lg transition-all duration-200
                          ${isActive ? `${currentTheme.accent} text-white shadow-lg` : `${currentTheme.hover}`}
                        `}
                        style={{
                          fontFamily: "'Pyidaungsu', 'Padauk', serif",
                          lineHeight: '2.0',
                        }}
                      >
                        <div className="flex items-start gap-3">
                          {/* Chapter Number */}
                          <span
                            className={`
                              flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                              ${isActive ? 'bg-white/20' : 'bg-current/10'}
                            `}
                          >
                            {index + 1}
                          </span>
                          
                          {/* Chapter Title */}
                          <div className="flex-1 pt-1">
                            <p className={`text-sm font-medium ${isActive ? 'font-semibold' : ''}`}>
                              {chapter.title}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </nav>
              )}
            </div>

            {/* Footer */}
            <div className={`px-6 py-3 border-t ${currentTheme.border}`}>
              <p className="text-xs opacity-60 text-center">
                {chapters.length} {chapters.length === 1 ? 'Chapter' : 'Chapters'}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
