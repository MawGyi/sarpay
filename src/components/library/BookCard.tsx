'use client';

import { motion } from 'framer-motion';
import type { Book } from '@/types/database';
import { BookCover } from '@/components/BookCover';

// Re-export Book type for backward compatibility
export type { Book };

interface BookCardProps {
  book: Book;
  index: number;
  onClick?: (book: Book) => void;
  onDelete?: (book: Book) => void;
  onEdit?: (book: Book) => void;
  onAddToCollection?: (book: Book) => void;
}

import { Trash2, Pencil, FolderPlus } from 'lucide-react';

export function BookCard({ book, index, onClick, onDelete, onEdit, onAddToCollection }: BookCardProps) {
  // Refined Sarpay-style gradient fallback colors — warm, muted tones
  const gradientColors = [
    'from-amber-700 to-orange-900',
    'from-emerald-700 to-teal-900',
    'from-rose-700 to-red-900',
    'from-sky-700 to-blue-900',
    'from-violet-700 to-purple-900',
    'from-slate-600 to-zinc-800',
  ];

  const gradientClass = gradientColors[index % gradientColors.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        delay: index * 0.04,
        ease: [0.22, 1, 0.36, 1],
      }}
      onClick={() => onClick?.(book)}
      className="book-card-sarpay cursor-pointer group"
      role="listitem"
      aria-label={`${book.title} by ${book.author}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(book);
        }
      }}
    >
      {/* 3D Book Body */}
      <div className="book-body book-body-shadow book-cover rounded-[4px_8px_8px_4px] overflow-hidden relative">
        {/* Cover Image or Gradient Fallback */}
        {book.coverUrl ? (
          <BookCover
            src={book.coverUrl}
            alt={book.title}
            className="w-full h-full"
            gradientClass={gradientClass}
            fallbackTitle={book.title}
            priority={index < 6}
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${gradientClass} flex flex-col items-center justify-center p-5 relative`}
          >
            {/* Faux spine line on fallback */}
            <div className="absolute left-3 top-6 bottom-6 w-px bg-white/10" />
            <h3 className="text-white/90 font-serif font-semibold text-center text-base leading-snug line-clamp-3 pl-3">
              {book.title}
            </h3>
            <p className="text-white/50 text-[10px] mt-2 font-medium tracking-wide uppercase pl-3">
              {book.author}
            </p>
          </div>
        )}

        {/* Light reflection overlay */}
        <div className="book-cover-highlight" />

        {/* Page edge — bottom */}
        <div className="book-page-bottom" />

        {/* Action Buttons — float on hover, always visible on touch */}
        <div
          className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 z-10"
          data-touch-visible
        >
          {onAddToCollection && (
            <button
              onClick={(e) => { e.stopPropagation(); onAddToCollection(book); }}
              className="p-1.5 bg-black/50 hover:bg-[#FF9F0A]/90 backdrop-blur-md rounded-full text-white/80 hover:text-white transition-all hover:scale-110"
              title="Add to Collection"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
          )}
          {onEdit && book.formatType === 'md' && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(book); }}
              className="p-1.5 bg-black/50 hover:bg-[#FF9F0A]/90 backdrop-blur-md rounded-full text-white/80 hover:text-white transition-all hover:scale-110"
              title="Edit Book"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(book); }}
              className="p-1.5 bg-black/50 hover:bg-red-500/90 backdrop-blur-md rounded-full text-white/80 hover:text-white transition-all hover:scale-110"
              title="Delete Book"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Chapter Count Badge — pill style */}
        {book.chapterCount && book.chapterCount > 1 && (
          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md">
            <span className="text-[10px] font-medium text-white/80">
              {book.chapterCount} ch
            </span>
          </div>
        )}
      </div>

      {/* Book Meta — Below Cover */}
      <div className="mt-3 px-0.5">
        <h3 className="font-medium text-foreground text-[13px] leading-tight line-clamp-2 group-hover:text-[#FF9F0A] transition-colors">
          {book.title}
        </h3>
        <p className="text-[11px] text-muted/70 mt-0.5 line-clamp-1">{book.author}</p>

        {/* Progress indicator — Sarpay style */}
        {book.formatType === 'epub' && (
          <div className="mt-1.5">
            {book.progress > 0 && book.progress < 100 ? (
              <div className="flex items-center gap-1.5">
                <div className="flex-1 h-[3px] bg-white/8 rounded-full overflow-hidden max-w-[80px]">
                  <div
                    className="h-full bg-[#FF9F0A] rounded-full transition-all"
                    style={{ width: `${Math.round(book.progress)}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted/60 font-medium tabular-nums">
                  {Math.round(book.progress)}%
                </span>
              </div>
            ) : book.progress >= 100 ? (
              <span className="text-[10px] font-medium text-emerald-400/80">Finished</span>
            ) : (
              <span className="text-[10px] font-semibold text-[#FF9F0A]/80 uppercase tracking-wider">
                New
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
