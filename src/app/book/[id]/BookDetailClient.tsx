'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BookOpen, ChevronRight, BarChart3, Calendar, BookMarked, Trash2, Pencil, Upload } from 'lucide-react';
import { fetchBookById, fetchChapters, deleteBook } from '@/lib/api/books';
import { fetchProgress } from '@/lib/api/progress';
import { BookCover } from '@/components/BookCover';
import { DeleteBookModal } from '@/components/library/DeleteBookModal';
import { EditMdBookModal } from '@/components/library/EditMdBookModal';
import { useAuth } from '@/contexts/AuthContext';
import type { BookRow, ChapterRow, UserProgressRow, Book } from '@/types/database';

function cleanDescription(html: string, maxLength: number = 300): string {
  const decoded = html
    .replace(/&#8212;/g, '—')
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '\u201C')
    .replace(/&#8221;/g, '\u201D')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
  const stripped = decoded.replace(/<[^>]*>/g, '').trim();
  if (stripped.length <= maxLength) return stripped;
  const lastSpace = stripped.lastIndexOf(' ', maxLength);
  return stripped.substring(0, lastSpace > 0 ? lastSpace : maxLength) + '...';
}

function formatLastRead(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface BookDetailClientProps {
  /** Server-fetched initial data (null = not available, must client-fetch) */
  initialBook?: BookRow | null;
  initialChapters?: ChapterRow[];
  initialProgress?: UserProgressRow | null;
}

export default function BookDetailClient({
  initialBook,
  initialChapters,
  initialProgress,
}: BookDetailClientProps) {
  const params = useParams();
  const router = useRouter();
  const { id } = params;

  const [book, setBook] = useState<BookRow | null>(initialBook ?? null);
  const [chapters, setChapters] = useState<ChapterRow[]>(initialChapters ?? []);
  const [progress, setProgress] = useState<UserProgressRow | null>(initialProgress ?? null);
  const [isLoading, setIsLoading] = useState(!initialBook);
  const [error, setError] = useState<string | null>(null);
  const [showFullDescription, setShowFullDescription] = useState(false);

  // Admin
  const { isAdmin } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // Skip client-fetch if server already provided data
    if (initialBook) return;

    async function loadData() {
      if (!id) return;
      try {
        const [bookRes, chaptersRes, progressRes] = await Promise.all([
          fetchBookById(id as string),
          fetchChapters(id as string),
          fetchProgress(id as string),
        ]);
        if (bookRes.error) throw bookRes.error;
        setBook(bookRes.book);
        if (chaptersRes.chapters) {
          setChapters(chaptersRes.chapters as ChapterRow[]);
        }
        if (progressRes.progress) {
          setProgress(progressRes.progress);
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
  const handleChapterClick = (chapterId: string) => router.push(`/reader/${id}?chapterId=${chapterId}`);
  const handleReadBook = () => router.push(`/reader/${id}`);

  const handleConfirmDelete = useCallback(async () => {
    if (!book) return;
    setIsDeleting(true);
    try {
      const { error } = await deleteBook(book.id);
      if (!error) {
        router.push('/');
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  }, [book, router]);

  // Build a Book object for EditMdBookModal
  const bookForEdit: Book | null = book ? {
    id: book.id,
    title: book.title,
    author: book.author,
    coverUrl: book.cover_url || undefined,
    fileUrl: book.file_url,
    formatType: book.format_type,
    progress: progress?.percentage || 0,
    description: book.description || undefined,
    chapterCount: chapters.length,
  } : null;

  const progressPct = progress ? Math.round(progress.percentage) : 0;
  const hasStartedReading = progressPct > 0;
  const isFinished = progressPct === 100;

  // Loading skeleton matching the redesigned layout
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <div className="px-4 sm:px-6 pt-4 pb-2">
          <div className="w-9 h-9 rounded-full bg-white/5 animate-pulse" />
        </div>
        <div className="px-4 sm:px-6 max-w-5xl mx-auto">
          <div className="flex gap-5 sm:gap-8 items-start py-4">
            {/* Cover skeleton */}
            <div className="flex-shrink-0 w-28 sm:w-36 md:w-44 aspect-[2/3] rounded-[4px_8px_8px_4px] bg-zinc-800 animate-pulse overflow-hidden relative">
              <div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                style={{ animation: 'shimmer 2s infinite' }}
              />
            </div>
            {/* Info skeleton */}
            <div className="flex-1 space-y-3 pt-1">
              <div className="h-6 sm:h-8 bg-white/5 rounded-lg w-3/4 animate-pulse" />
              <div className="h-4 bg-white/5 rounded-lg w-1/2 animate-pulse" />
              <div className="flex gap-1.5 mt-2">
                <div className="h-5 w-12 bg-white/5 rounded-full animate-pulse" />
                <div className="h-5 w-14 bg-white/5 rounded-full animate-pulse" />
              </div>
              <div className="h-10 sm:h-12 bg-white/5 rounded-xl w-full sm:w-48 animate-pulse mt-2" />
            </div>
          </div>
          {/* Stats skeleton */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 sm:h-24 rounded-xl sm:rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
          {/* Chapter skeletons */}
          <div className="space-y-1.5 mt-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 sm:h-14 rounded-xl bg-white/[0.03] animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-white p-8">
        <h2 className="text-xl font-bold text-red-400 mb-4">Error</h2>
        <p className="text-white/60 mb-6">{error || 'Book not found'}</p>
        <button onClick={handleBack} className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-[#0a0a0a] text-white flex flex-col"
    >
      {/* Blurred background */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
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
      <div className="relative z-10 px-4 sm:px-6 pt-4 pb-2 flex items-center gap-3">
        <motion.button
          onClick={handleBack}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors backdrop-blur-md"
        >
          <ArrowLeft className="w-5 h-5" />
        </motion.button>
        <span className="text-sm text-white/40 font-medium">Library</span>

        {/* Admin actions — right side */}
        {isAdmin && (
          <div className="ml-auto flex items-center gap-2">
            {book.format_type === 'md' && (
              <motion.button
                onClick={() => setShowEditModal(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 rounded-full bg-white/5 hover:bg-[#FF9F0A]/20 transition-colors backdrop-blur-md"
                title="Edit Book"
              >
                <Pencil className="w-4 h-4 text-[#FF9F0A]" />
              </motion.button>
            )}
            <motion.button
              onClick={() => setShowDeleteModal(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-full bg-white/5 hover:bg-red-500/20 transition-colors backdrop-blur-md"
              title="Delete Book"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </motion.button>
          </div>
        )}
      </div>

      {/* ===== HERO: Cover + Info + CTA — always above the fold ===== */}
      <div className="relative z-10 px-4 sm:px-6 max-w-5xl mx-auto w-full">
        <div className="flex gap-5 sm:gap-8 items-start py-4">
          {/* Cover — compact, fixed size */}
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.08 }}
            className="flex-shrink-0 w-28 sm:w-36 md:w-44 aspect-[2/3] rounded-[4px_8px_8px_4px] shadow-2xl shadow-black/60 overflow-hidden relative"
          >
            {book.cover_url ? (
              <BookCover
                src={book.cover_url}
                alt={book.title}
                className="w-full h-full"
                priority
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-amber-700 to-orange-900 flex items-center justify-center text-center p-3">
                <span className="font-serif text-sm sm:text-base opacity-80 line-clamp-3">{book.title}</span>
              </div>
            )}
            {/* Spine effect */}
            <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-black/30 via-black/10 to-transparent pointer-events-none" />
            {/* Light reflection */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
            {/* Progress overlay bar at bottom of cover */}
            {hasStartedReading && !isFinished && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full bg-[#FF9F0A]"
                />
              </div>
            )}
          </motion.div>

          {/* Info + CTA — right side */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.12 }}
            className="flex-1 min-w-0 flex flex-col"
          >
            <h1 className="text-lg sm:text-2xl md:text-3xl font-bold font-serif leading-tight line-clamp-2">
              {book.title}
            </h1>
            <p className="text-sm sm:text-base text-white/60 font-medium mt-1 truncate">
              {book.author}
            </p>

            {/* Tags — inline, compact */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] sm:text-xs text-white/50 font-medium uppercase">
                {book.format_type}
              </span>
              {book.file_size && (
                <span className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] sm:text-xs text-white/50 font-medium">
                  {(book.file_size / (1024 * 1024)).toFixed(1)} MB
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] sm:text-xs text-white/50 font-medium hidden sm:inline-flex">
                Added {new Date(book.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            {/* CTA Button — immediately visible, no scroll needed */}
            <motion.button
              onClick={handleReadBook}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="mt-3 sm:mt-4 group relative overflow-hidden px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all duration-300 w-full sm:w-auto sm:max-w-xs"
              style={{
                background: isFinished
                  ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                  : 'linear-gradient(135deg, #007AFF 0%, #0051a8 100%)',
                boxShadow: isFinished
                  ? '0 8px 30px rgba(34, 197, 94, 0.25), 0 2px 8px rgba(0, 0, 0, 0.3)'
                  : '0 8px 30px rgba(0, 122, 255, 0.25), 0 2px 8px rgba(0, 0, 0, 0.3)',
              }}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-white relative z-10" />
              <span className="text-white relative z-10">
                {isFinished
                  ? 'Read Again'
                  : hasStartedReading
                  ? `Continue \u00B7 ${progressPct}%`
                  : 'Start Reading'}
              </span>
            </motion.button>

            {/* Description — desktop only inline, mobile below */}
            {book.description && (
              <div className="hidden sm:block mt-3">
                <p className={`text-xs text-white/35 leading-relaxed ${!showFullDescription ? 'line-clamp-2' : ''}`}>
                  {showFullDescription ? book.description.replace(/<[^>]*>/g, '') : cleanDescription(book.description, 120)}
                </p>
                {book.description.length > 120 && (
                  <button
                    onClick={() => setShowFullDescription(!showFullDescription)}
                    className="text-[11px] text-[#FF9F0A] hover:text-[#FF9F0A]/80 mt-0.5 transition-colors"
                  >
                    {showFullDescription ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* ===== SCROLLABLE CONTENT: Stats + Description (mobile) + Chapters ===== */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-6 pb-8 max-w-5xl mx-auto w-full custom-scrollbar">

        {/* Stats Row — compact horizontal cards */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="grid grid-cols-3 gap-2 sm:gap-3 mb-4"
        >
          {/* Progress Card */}
          <div className="relative p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/5 border border-white/5 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FF9F0A]/10 to-transparent" />
            <div className="relative">
              <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FF9F0A] mb-1.5" />
              <p className="text-xl sm:text-2xl font-bold text-white">
                {progressPct}<span className="text-xs sm:text-sm text-white/40">%</span>
              </p>
              <p className="text-[9px] sm:text-[10px] text-white/40 uppercase tracking-wider mt-0.5">Progress</p>
            </div>
          </div>

          {/* Chapters Card */}
          <div className="relative p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/5 border border-white/5 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent" />
            <div className="relative">
              <BookMarked className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400 mb-1.5" />
              <p className="text-xl sm:text-2xl font-bold text-white">
                {chapters.length > 0 ? chapters.length : 1}
              </p>
              <p className="text-[9px] sm:text-[10px] text-white/40 uppercase tracking-wider mt-0.5">
                {chapters.length === 1 || chapters.length === 0 ? 'Chapter' : 'Chapters'}
              </p>
            </div>
          </div>

          {/* Last Read Card */}
          <div className="relative p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/5 border border-white/5 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent" />
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-400 mb-1.5" />
              <p className="text-xs sm:text-sm font-bold text-white leading-tight">
                {progress?.updated_at
                  ? formatLastRead(progress.updated_at)
                  : 'Not yet'}
              </p>
              <p className="text-[9px] sm:text-[10px] text-white/40 uppercase tracking-wider mt-0.5">Last Read</p>
            </div>
          </div>
        </motion.div>

        {/* Reading Progress Bar (detailed) — only when started */}
        {hasStartedReading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="mb-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/5 border border-white/5"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] sm:text-xs text-white/50 font-medium">Reading Progress</span>
              <span className="text-[10px] sm:text-xs text-white/50 font-medium">{progressPct}%</span>
            </div>
            <div className="h-1.5 sm:h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                className="h-full rounded-full"
                style={{
                  background: isFinished
                    ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                    : 'linear-gradient(90deg, #007AFF, #60a5fa)',
                }}
              />
            </div>
            {progress?.current_location && progress?.total_locations && (
              <p className="text-[9px] sm:text-[10px] text-white/30 mt-1">
                Location {progress.current_location} of {progress.total_locations}
              </p>
            )}
          </motion.div>
        )}

        {/* Description — mobile only (desktop is inline in hero) */}
        {book.description && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="sm:hidden mb-4"
          >
            <p className={`text-xs text-white/35 leading-relaxed ${!showFullDescription ? 'line-clamp-2' : ''}`}>
              {showFullDescription ? book.description.replace(/<[^>]*>/g, '') : cleanDescription(book.description, 100)}
            </p>
            {book.description.length > 100 && (
              <button
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="text-[11px] text-[#FF9F0A] hover:text-[#FF9F0A]/80 mt-0.5 transition-colors"
              >
                {showFullDescription ? 'Show less' : 'Show more'}
              </button>
            )}
          </motion.div>
        )}

        {/* Chapters List */}
        {chapters.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col gap-1.5 sm:gap-2"
          >
            <div className="flex items-center justify-between mb-2 sm:mb-3 border-b border-white/[0.06] pb-2">
              <h3 className="text-sm sm:text-base font-semibold flex items-center gap-2">
                <ListIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF9F0A]" />
                Table of Contents
              </h3>
              <span className="text-[10px] sm:text-xs text-white/40">{chapters.length} Chapters</span>
            </div>

            {chapters.map((chapter, i) => (
              <motion.button
                key={chapter.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.01, x: 3 }}
                whileTap={{ scale: 0.98 }}
                transition={{ delay: 0.08 + i * 0.025, duration: 0.3, ease: 'easeOut' }}
                onClick={() => handleChapterClick(chapter.id)}
                className="group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-transparent hover:border-white/5 transition-all w-full text-left"
              >
                <span className="text-white/15 font-serif text-base sm:text-lg font-bold w-6 sm:w-8 text-right flex-shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm sm:text-base leading-tight truncate group-hover:text-[#FF9F0A] transition-colors">
                    {chapter.title}
                  </h4>
                </div>
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-white/15 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </motion.button>
            ))}
          </motion.div>
        )}
      </div>

      {/* Admin Modals */}
      {isAdmin && (
        <>
          <AnimatePresence>
            {showDeleteModal && (
              <DeleteBookModal
                bookTitle={book.title}
                bookAuthor={book.author}
                chapterCount={chapters.length}
                onConfirm={handleConfirmDelete}
                onCancel={() => setShowDeleteModal(false)}
                isDeleting={isDeleting}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showEditModal && bookForEdit && (
              <EditMdBookModal
                book={bookForEdit}
                onClose={() => setShowEditModal(false)}
                onEditComplete={() => {
                  setShowEditModal(false);
                  // Reload book data
                  window.location.reload();
                }}
              />
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}
