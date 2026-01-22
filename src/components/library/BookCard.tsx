'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import type { Book } from '@/types/database';

// Re-export Book type for backward compatibility
export type { Book };

interface BookCardProps {
  book: Book;
  index: number;
  onClick?: (book: Book) => void;
  onDelete?: (book: Book) => void;
  onEdit?: (book: Book) => void;
}

import { Trash2, Pencil } from 'lucide-react';

export function BookCard({ book, index, onClick, onDelete, onEdit }: BookCardProps) {
  const [imageError, setImageError] = useState(false);

  // Gradient fallback colors
  const gradientColors = [
    'from-blue-600 to-purple-600',
    'from-emerald-600 to-teal-600',
    'from-orange-600 to-red-600',
    'from-pink-600 to-rose-600',
    'from-indigo-600 to-blue-600',
    'from-violet-600 to-purple-600',
  ];

  const gradientClass = gradientColors[index % gradientColors.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.05,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{
        y: -12,
        scale: 1.05,
        transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] }
      }}
      onClick={() => onClick?.(book)}
      className="book-card-glow cursor-pointer group"
      style={{ filter: 'brightness(1)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.filter = 'brightness(1.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.filter = 'brightness(1)';
      }}
    >
      <div className="relative">
        {/* Book Cover */}
        <div
          className="book-cover rounded-lg overflow-hidden"
          style={{
            boxShadow: 'var(--book-shadow-rest)',
            transition: 'box-shadow 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = 'var(--book-shadow-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = 'var(--book-shadow-rest)';
          }}
        >
          {book.coverUrl && !imageError ? (
            <img
              src={book.coverUrl}
              alt={book.title}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div
              className={`w-full h-full bg-gradient-to-br ${gradientClass} flex items-center justify-center p-6`}
            >
              <h3 className="text-white font-bold text-center text-lg line-clamp-3">
                {book.title}
              </h3>
            </div>
          )}

          {/* Action Buttons (Visible on Hover, Always visible on touch devices) - Vertical layout */}
          <div
            className="absolute top-2 right-2 flex flex-col gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 z-10"
            data-touch-visible
          >
            {/* Edit Button - MD files only */}
            {onEdit && book.formatType === 'md' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(book);
                }}
                className="p-2 bg-black/40 hover:bg-accent/80 backdrop-blur-md rounded-full text-white/90 hover:text-white transition-all transform hover:scale-105"
                title="Edit Book"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {/* Delete Button */}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(book);
                }}
                className="p-2 bg-black/40 hover:bg-red-500/80 backdrop-blur-md rounded-full text-white/90 hover:text-white transition-all transform hover:scale-105"
                title="Delete Book"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Chapter Count Badge */}
          {book.chapterCount && book.chapterCount > 1 && (
            <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/20">
              <span className="text-xs font-medium text-white/90">
                {book.chapterCount} chapters
              </span>
            </div>
          )}


        </div>

        {/* Reading Progress - Apple Books Style (EPUB only) */}
        {book.formatType === 'epub' && (
          <div className="mt-2 flex items-center">
            {book.progress > 0 ? (
              <span className="text-xs text-muted font-medium">
                {Math.round(book.progress)}%
              </span>
            ) : (
              <span className="text-xs font-semibold text-accent uppercase tracking-wide">
                NEW
              </span>
            )}
          </div>
        )}

        {/* Book Info */}
        <div className="mt-2 space-y-1">
          <h3 className="font-semibold text-foreground text-sm line-clamp-2 group-hover:text-accent transition-colors">
            {book.title}
          </h3>
          <p className="text-xs text-muted line-clamp-1">{book.author}</p>
        </div>
      </div>
    </motion.div>
  );
}
