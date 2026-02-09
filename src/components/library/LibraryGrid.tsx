'use client';

import { motion } from 'framer-motion';
import { BookCard } from './BookCard';
import type { Book } from '@/types/database';

interface LibraryGridProps {
  books: Book[];
  onBookClick?: (book: Book) => void;
  onDeleteClick?: (book: Book) => void;
  onEditClick?: (book: Book) => void;
  onAddToCollection?: (book: Book) => void;
}

export function LibraryGrid({ books, onBookClick, onDeleteClick, onEditClick, onAddToCollection }: LibraryGridProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.05,
          },
        },
      }}
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 sm:gap-8"
      role="list"
      aria-label="Book library grid"
    >
      {books.map((book, index) => (
        <BookCard
          key={book.id}
          book={book}
          index={index}
          onClick={onBookClick}
          onDelete={onDeleteClick}
          onEdit={onEditClick}
          onAddToCollection={onAddToCollection}
        />
      ))}
    </motion.div>
  );
}
