'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BookOpen, ChevronRight } from 'lucide-react';
import { fetchBookById, fetchChapters } from '@/lib/api/books';
import type { BookRow, ChapterRow } from '@/types/database';

// Helper function to clean HTML from description
function cleanDescription(html: string, maxLength: number = 200): string {
  // Decode HTML entities
  const decoded = html
    .replace(/&#8212;/g, '—')
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

  // Strip HTML tags
  const stripped = decoded.replace(/<[^>]*>/g, '');

  // Trim and truncate
  const trimmed = stripped.trim();
  if (trimmed.length <= maxLength) return trimmed;

  // Find last space before maxLength to avoid cutting words
  const lastSpace = trimmed.lastIndexOf(' ', maxLength);
  return trimmed.substring(0, lastSpace > 0 ? lastSpace : maxLength) + '...';
}

export default function BookDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;

  const [book, setBook] = useState<BookRow | null>(null);
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!id) return;

      try {
        const [bookRes, chaptersRes] = await Promise.all([
          fetchBookById(id as string),
          fetchChapters(id as string)
        ]);

        if (bookRes.error) throw bookRes.error;
        setBook(bookRes.book);

        if (chaptersRes.chapters) {
          setChapters(chaptersRes.chapters as ChapterRow[]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load book');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleBack = () => router.push('/');

  const handleChapterClick = (chapterId: string) => {
    router.push(`/reader/${id}?chapterId=${chapterId}`);
  };

  const handleReadBook = () => {
    // For single file books (EPUB or single MD)
    router.push(`/reader/${id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-8">
        <h2 className="text-xl font-bold text-red-400 mb-4">Error</h2>
        <p className="text-white/60 mb-6">{error || 'Book not found'}</p>
        <button onClick={handleBack} className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden flex flex-col"
    >
      {/* Heavy Blur Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div
          className="absolute inset-0 opacity-20 blur-3xl scale-110"
          style={{
            backgroundImage: book.cover_url ? `url(${book.cover_url})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/90 to-black/60" />
      </div>

      {/* Header */}
      <div className="relative z-10 p-6 flex items-center gap-4">
        <button
          onClick={handleBack}
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors backdrop-blur-md"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-6 pb-20 max-w-5xl mx-auto w-full custom-scrollbar">
        <div className="flex flex-col md:flex-row gap-10 items-start">

          {/* Book Cover & Info */}
          <div className="flex-shrink-0 w-full md:w-auto flex flex-col items-center md:items-start gap-6">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="w-48 md:w-64 aspect-[2/3] rounded-lg shadow-2xl shadow-black/50 overflow-hidden relative group"
            >
              {book.cover_url ? (
                <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-center p-4">
                  <span className="font-serif text-xl opacity-50">{book.title}</span>
                </div>
              )}
              {/* Spine effect */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-r from-white/20 to-transparent pointer-events-none" />
            </motion.div>

            <div className="flex flex-col gap-3 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-bold font-serif leading-tight">{book.title}</h1>
              <p className="text-xl text-white/60 font-medium">{book.author}</p>
              {book.description && (
                <p className="text-sm text-white/40 max-w-sm leading-relaxed">
                  {cleanDescription(book.description)}
                </p>
              )}

              {/* Main Action */}
              {!chapters.length && (
                <motion.button
                  onClick={handleReadBook}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="mt-6 group relative overflow-hidden px-10 py-4 rounded-2xl font-semibold text-lg flex items-center justify-center gap-3 transition-all duration-300 shadow-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #007AFF 0%, #0051a8 100%)',
                    boxShadow: '0 10px 40px rgba(0, 122, 255, 0.3), 0 4px 12px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  {/* Shine effect */}
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />

                  <BookOpen className="w-6 h-6 text-white relative z-10" />
                  <span className="text-white relative z-10">Start Reading</span>
                </motion.button>
              )}
            </div>
          </div>

          {/* Chapters List */}
          <div className="flex-1 w-full">
            {chapters.length > 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col gap-2"
              >
                <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <ListIcon className="w-5 h-5 text-accent" />
                    Table of Contents
                  </h3>
                  <span className="text-xs text-white/40">{chapters.length} Chapters</span>
                </div>

                {chapters.map((chapter, i) => (
                  <motion.button
                    key={chapter.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ delay: 0.1 + (i * 0.05), duration: 0.3, ease: 'easeOut' }}
                    onClick={() => handleChapterClick(chapter.id)}
                    className="group flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/5 hover:shadow-xl hover:shadow-accent/5 transition-all w-full text-left"
                  >
                    <span className="text-white/20 font-serif text-lg font-bold w-8 text-right">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <h4 className="font-medium text-lg leading-tight group-hover:text-accent transition-colors">
                        {chapter.title}
                      </h4>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white/60 group-hover:translate-x-1 transition-all" />
                  </motion.button>
                ))}
              </motion.div>
            ) : null}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="8" y1="6" x2="21" y2="6"></line>
      <line x1="8" y1="12" x2="21" y2="12"></line>
      <line x1="8" y1="18" x2="21" y2="18"></line>
      <line x1="3" y1="6" x2="3.01" y2="6"></line>
      <line x1="3" y1="12" x2="3.01" y2="12"></line>
      <line x1="3" y1="18" x2="3.01" y2="18"></line>
    </svg>
  )
}
