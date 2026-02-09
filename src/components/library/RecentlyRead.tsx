'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { BookCover } from '@/components/BookCover';
import type { Book } from '@/types/database';

interface RecentlyReadProps {
  books: Book[];
  progressData: Map<string, { percentage: number; updatedAt: string }>;
  onBookClick: (book: Book) => void;
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function RecentlyRead({ books, progressData, onBookClick }: RecentlyReadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get recently read books (have progress > 0) sorted by last updated
  const recentBooks = books
    .filter((b) => {
      const prog = progressData.get(b.id);
      return prog && prog.percentage > 0;
    })
    .sort((a, b) => {
      const aDate = progressData.get(a.id)?.updatedAt || '';
      const bDate = progressData.get(b.id)?.updatedAt || '';
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    })
    .slice(0, 8);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = 280;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  if (recentBooks.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="mb-8"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">
            Recently Read
          </h3>
        </div>
        {recentBooks.length > 3 && (
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => scroll('left')}
              className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-white/5 transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-white/5 transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar scroll-smooth snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none' }}
      >
        {recentBooks.map((book, i) => {
          const prog = progressData.get(book.id);
          return (
            <motion.button
              key={book.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onBookClick(book)}
              className="flex-shrink-0 w-[240px] sm:w-[260px] snap-start group text-left"
            >
              <div className="flex items-center gap-3 p-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] backdrop-blur-xl transition-all shadow-lg shadow-black/20">
                {/* Cover thumbnail */}
                <div className="w-12 h-[68px] rounded-[3px_5px_5px_3px] overflow-hidden flex-shrink-0 shadow-md relative">
                  {book.coverUrl ? (
                    <BookCover
                      src={book.coverUrl}
                      alt={book.title}
                      className="w-full h-full"
                      priority={i < 3}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center p-1">
                      <span className="text-white text-[8px] font-medium text-center line-clamp-2">
                        {book.title}
                      </span>
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground text-sm truncate group-hover:text-accent transition-colors">
                    {book.title}
                  </h4>
                  <p className="text-xs text-muted truncate">{book.author}</p>

                  {/* Progress bar + time */}
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 h-[3px] bg-white/8 rounded-full overflow-hidden max-w-[100px]">
                      <div
                        className="h-full bg-[#FF9F0A] rounded-full"
                        style={{ width: `${Math.round(prog?.percentage || 0)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted/60 font-medium tabular-nums">
                      {Math.round(prog?.percentage || 0)}%
                    </span>
                  </div>
                  {prog?.updatedAt && (
                    <p className="text-[10px] text-muted/60 mt-0.5">
                      {formatTimeAgo(prog.updatedAt)}
                    </p>
                  )}
                </div>
                {/* Read icon */}
                <div className="flex-shrink-0 p-2 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
                  <BookOpen className="w-3.5 h-3.5 text-accent" />
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.section>
  );
}
