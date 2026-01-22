'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Grid3x3, List, RefreshCw, AlertCircle, Plus } from 'lucide-react';
import { Sidebar, LibraryGrid, DeleteBookModal, EditMdBookModal } from '@/components/library';
import { FilterCategory } from '@/components/library/Sidebar';
import { UploadModal } from '@/components/upload/UploadModal';
import { fetchBooks, deleteBook, fetchChapters } from '@/lib/api/books';
import { fetchAllProgress } from '@/lib/api/progress';
import type { Book, BookRow } from '@/types/database';

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);
  const [bookToEdit, setBookToEdit] = useState<Book | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');

  // Fetch books from Supabase
  const loadBooks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [booksResult, progressResult] = await Promise.all([
        fetchBooks(),
        fetchAllProgress(),
      ]);

      if (booksResult.error) {
        setError(booksResult.error.message);
        setBooks([]);
        return;
      }

      // Create a map of book progress
      const progressMap = new Map<string, number>();
      progressResult.progress.forEach((p) => {
        progressMap.set(p.book_id, p.percentage);
      });

      // Fetch chapter counts for all books
      const chapterCounts = new Map<string, number>();
      await Promise.all(
        booksResult.books.map(async (row: BookRow) => {
          const { chapters } = await fetchChapters(row.id);
          if (chapters && chapters.length > 0) {
            chapterCounts.set(row.id, chapters.length);
          }
        })
      );

      // Convert BookRow to Book with progress and chapter count
      const booksWithProgress: Book[] = booksResult.books.map((row: BookRow) => ({
        id: row.id,
        title: row.title,
        author: row.author,
        coverUrl: row.cover_url || undefined,
        fileUrl: row.file_url,
        formatType: row.format_type,
        progress: progressMap.get(row.id) || 0,
        description: row.description || undefined,
        chapterCount: chapterCounts.get(row.id),
      }));

      setBooks(booksWithProgress);
    } catch (err) {
      setError('Failed to load books. Please try again.');
      console.error('Error loading books:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const handleUploadClick = () => {
    setShowUploadModal(true);
  };

  const handleUploadComplete = () => {
    setShowUploadModal(false);
    loadBooks(); // Refresh the book list
  };

  const router = useRouter(); // Need to add import

  const handleBookClick = (book: Book) => {
    // For EPUBs, we might keep the modal or also go to details. 
    // Requirement: "Clicking a book card doesn't open the reader... show a list of chapters"
    // So for all books (or specifically MD/Multi-chapter), go to /book/[id]

    // However, for single EPUBs, user might prefer direct read? 
    // Let's stick to the request: "UI Change: The Library Grid should only show one card... instead of going straight to reader, show a list of chapters"
    // So we redirect to /book/[id].
    router.push(`/book/${book.id}`);
  };

  const handleDeleteClick = (book: Book) => {
    setBookToDelete(book);
  };

  const handleConfirmDelete = async () => {
    if (!bookToDelete) return;

    setIsDeleting(true);
    // Optimistic update
    const previousBooks = [...books];
    setBooks(books.filter(b => b.id !== bookToDelete.id));

    try {
      const { error } = await deleteBook(bookToDelete.id);
      if (error) {
        throw error;
      }
      setBookToDelete(null);
    } catch (err) {
      console.error('Failed to delete book:', err);
      // Revert optimistic update
      setBooks(previousBooks);
      setError('Failed to delete book. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditClick = (book: Book) => {
    if (book.formatType === 'md') {
      setBookToEdit(book);
    }
  };

  const handleEditComplete = () => {
    setBookToEdit(null);
    loadBooks(); // Refresh to show updates
  };

  // Calculate book counts for sidebar
  const bookCounts = useMemo(() => {
    const counts = {
      all: books.length,
      epub: books.filter(b => b.formatType === 'epub').length,
      md: books.filter(b => b.formatType === 'md').length,
      reading: books.filter(b => b.progress > 0 && b.progress < 100).length,
      finished: books.filter(b => b.progress === 100).length,
    };
    return counts;
  }, [books]);

  // Filter books based on active filter and search
  const filteredBooks = useMemo(() => {
    let result = books;

    // Apply category filter
    switch (activeFilter) {
      case 'epub':
        result = result.filter(b => b.formatType === 'epub');
        break;
      case 'md':
        result = result.filter(b => b.formatType === 'md');
        break;
      case 'reading':
        result = result.filter(b => b.progress > 0 && b.progress < 100);
        break;
      case 'finished':
        result = result.filter(b => b.progress === 100);
        break;
      default:
        break;
    }

    // Apply search filter
    if (searchQuery) {
      result = result.filter(
        (book) =>
          book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          book.author.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return result;
  }, [books, activeFilter, searchQuery]);

  // Get filter label for display
  const getFilterLabel = (filter: FilterCategory) => {
    switch (filter) {
      case 'all': return 'All Books';
      case 'epub': return 'EPUBs';
      case 'md': return 'Markdown';
      case 'reading': return 'Want to Read';
      case 'finished': return 'Finished';
      default: return 'Library';
    }
  };

  return (
    <div className="min-h-screen bg-library text-foreground">
      {/* Sidebar */}
      <Sidebar
        onUploadClick={handleUploadClick}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        bookCounts={bookCounts}
      />

      {/* Main Content Area */}
      <div className="ml-64 min-h-screen">
        {/* Top Navigation Bar */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="sticky top-0 z-40 glass"
        >
          <div className="px-8 py-4 flex items-center justify-between gap-4">
            {/* Search Bar */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                <input
                  type="text"
                  placeholder="Search books..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Refresh Button */}
              <button
                onClick={loadBooks}
                disabled={isLoading}
                className="p-2 text-muted hover:text-foreground transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-2 bg-card border border-border rounded-xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'grid'
                    ? 'bg-accent text-white'
                    : 'text-muted hover:text-foreground'
                    }`}
                  title="Grid View"
                >
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'list'
                    ? 'bg-accent text-white'
                    : 'text-muted hover:text-foreground'
                    }`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Library Content */}
        <main className="px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {/* Section Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2">{getFilterLabel(activeFilter)}</h2>
              <p className="text-muted">
                {isLoading
                  ? 'Loading...'
                  : `${filteredBooks.length} ${filteredBooks.length === 1 ? 'book' : 'books'}`
                }
              </p>
            </div>

            {/* Error State */}
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3 p-4 mb-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>{error}</p>
                <button
                  onClick={loadBooks}
                  className="ml-auto px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm transition-colors"
                >
                  Retry
                </button>
              </motion.div>
            )}

            {/* Loading Skeleton - Premium Book Shape with Shimmer */}
            {isLoading && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    {/* Book Cover Skeleton with Shimmer */}
                    <div className="relative aspect-[2/3] bg-card rounded-lg overflow-hidden">
                      <div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                        style={{
                          animation: 'shimmer 2s infinite',
                          transform: 'translateX(-100%)',
                        }}
                      />
                    </div>
                    {/* Text Skeleton */}
                    <div className="mt-3 space-y-2">
                      <div className="h-4 bg-card rounded w-3/4" />
                      <div className="h-3 bg-card rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && books.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <div className="w-20 h-20 mb-6 rounded-full bg-card flex items-center justify-center">
                  <Plus className="w-10 h-10 text-muted" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No books yet</h3>
                <p className="text-muted mb-6 max-w-sm">
                  Upload your first book to get started. We support EPUB, Markdown, and PDF files.
                </p>
                <button
                  onClick={handleUploadClick}
                  className="px-6 py-3 bg-accent hover:bg-accent/90 text-white rounded-xl font-medium transition-colors"
                >
                  Upload a Book
                </button>
              </motion.div>
            )}

            {/* Library Grid */}
            {!isLoading && !error && books.length > 0 && (
              viewMode === 'grid' ? (
                <LibraryGrid
                  books={filteredBooks}
                  onBookClick={handleBookClick}
                  onDeleteClick={handleDeleteClick}
                  onEditClick={handleEditClick}
                />
              ) : (
                <div className="space-y-2">
                  {filteredBooks.map((book) => (
                    <motion.div
                      key={book.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => handleBookClick(book)}
                      className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:bg-card/80 cursor-pointer transition-all"
                    >
                      <div className="w-12 h-16 rounded flex-shrink-0 overflow-hidden">
                        {book.coverUrl ? (
                          <img
                            src={book.coverUrl}
                            alt={book.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center">
                            <span className="text-white text-xs font-medium text-center px-1 line-clamp-2">
                              {book.title.slice(0, 20)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{book.title}</h3>
                        <p className="text-sm text-muted truncate">{book.author}</p>
                      </div>
                      <div className="text-sm">
                        {book.formatType === 'epub' ? (
                          book.progress > 0 ? (
                            <span className="text-muted font-medium">{Math.round(book.progress)}%</span>
                          ) : (
                            <span className="font-semibold text-accent uppercase tracking-wide text-xs">NEW</span>
                          )
                        ) : (
                          <span className="text-muted">{book.progress > 0 ? `${Math.round(book.progress)}%` : 'Unread'}</span>
                        )}
                      </div>
                      {/* Edit button for MD files */}
                      {book.formatType === 'md' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(book);
                          }}
                          className="p-2 text-muted hover:text-accent hover:bg-white/10 rounded-lg transition-all"
                          title="Edit Book"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>
              )
            )}
          </motion.div>
        </main>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <UploadModal
            onClose={() => setShowUploadModal(false)}
            onUploadComplete={handleUploadComplete}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {bookToDelete && (
          <DeleteBookModal
            bookTitle={bookToDelete.title}
            bookAuthor={bookToDelete.author}
            chapterCount={bookToDelete.chapterCount}
            onConfirm={handleConfirmDelete}
            onCancel={() => setBookToDelete(null)}
            isDeleting={isDeleting}
          />
        )}
      </AnimatePresence>

      {/* Edit Book Modal (MD only) */}
      <AnimatePresence>
        {bookToEdit && (
          <EditMdBookModal
            book={bookToEdit}
            onClose={() => setBookToEdit(null)}
            onEditComplete={handleEditComplete}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
