'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Grid3x3, List, RefreshCw, AlertCircle, Menu, ArrowUpDown, BookOpen, FolderPlus, Settings2, Plus } from 'lucide-react';
import { Sidebar, LibraryGrid, DeleteBookModal, EditMdBookModal } from '@/components/library';
import { FilterCategory } from '@/components/library/Sidebar';
import { RecentlyRead } from '@/components/library/RecentlyRead';
import { EmptyLibraryIllustration, NoResultsIllustration, EmptyCollectionIllustration } from '@/components/library/EmptyStates';
import { CollectionManagerModal, AddToCollectionModal } from '@/components/library/CollectionModals';
import { UploadModal } from '@/components/upload/UploadModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { fetchBooks, fetchChapterCounts, deleteBook } from '@/lib/api/books';
import { fetchAllProgress } from '@/lib/api/progress';
import { useCollections } from '@/hooks/useCollections';
import { useAuth } from '@/contexts/AuthContext';
import type { Book, BookRow, UserProgressRow } from '@/types/database';

export type SortOption = 'recent' | 'title-asc' | 'title-desc' | 'progress';

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [lastReadBookId, setLastReadBookId] = useState<string | null>(null);
  const [progressMap, setProgressMap] = useState<Map<string, { percentage: number; updatedAt: string }>>(new Map());
  const [showCollectionManager, setShowCollectionManager] = useState(false);
  const [bookToAddToCollection, setBookToAddToCollection] = useState<Book | null>(null);

  // Admin CRUD state
  const { isAdmin, signOut } = useAuth();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);
  const [bookToEdit, setBookToEdit] = useState<Book | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Collections hook
  const {
    collections,
    createCollection,
    deleteCollection,
    renameCollection,
    addBookToCollection,
    removeBookFromCollection,
  } = useCollections();

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
      const progressDataMap = new Map<string, { percentage: number; updatedAt: string }>();
      progressResult.progress.forEach((p) => {
        progressMap.set(p.book_id, p.percentage);
        progressDataMap.set(p.book_id, { percentage: p.percentage, updatedAt: p.updated_at });
      });
      setProgressMap(progressDataMap);

      // Find the most recently read book (has progress > 0 and < 100)
      const recentlyRead = progressResult.progress
        .filter((p: UserProgressRow) => p.percentage > 0 && p.percentage < 100)
        .sort((a: UserProgressRow, b: UserProgressRow) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];
      setLastReadBookId(recentlyRead?.book_id || null);

      // Fetch chapter counts for all books in a single query
      const bookIds = booksResult.books.map((row: BookRow) => row.id);
      const { counts: chapterCounts } = await fetchChapterCounts(bookIds);

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

  // Delete book handler (admin only)
  const handleConfirmDelete = useCallback(async () => {
    if (!bookToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await deleteBook(bookToDelete.id);
      if (error) {
        console.error('Delete failed:', error);
      } else {
        setBooks((prev) => prev.filter((b) => b.id !== bookToDelete.id));
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
      setBookToDelete(null);
    }
  }, [bookToDelete]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const router = useRouter();

  const handleBookClick = (book: Book) => {
    // For EPUBs, we might keep the modal or also go to details. 
    // Requirement: "Clicking a book card doesn't open the reader... show a list of chapters"
    // So for all books (or specifically MD/Multi-chapter), go to /book/[id]

    // However, for single EPUBs, user might prefer direct read? 
    // Let's stick to the request: "UI Change: The Library Grid should only show one card... instead of going straight to reader, show a list of chapters"
    // So we redirect to /book/[id].
    router.push(`/book/${book.id}`);
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

  // Check if activeFilter is a collection ID
  const activeCollectionId = useMemo(() => {
    if (['all', 'epub', 'md', 'reading', 'finished'].includes(activeFilter)) return null;
    return activeFilter;
  }, [activeFilter]);

  // Filter books based on active filter and search
  const filteredBooks = useMemo(() => {
    let result = books;

    // Apply collection filter
    if (activeCollectionId) {
      const col = collections.find(c => c.id === activeCollectionId);
      if (col) {
        result = result.filter(b => col.bookIds.includes(b.id));
      }
    } else {
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
    }

    // Apply search filter
    if (searchQuery) {
      result = result.filter(
        (book) =>
          book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          book.author.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'progress':
          return b.progress - a.progress;
        case 'recent':
        default:
          return 0; // Keep original order (already sorted by created_at desc)
      }
    });

    return result;
  }, [books, activeFilter, searchQuery, sortBy]);

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'recent', label: 'Recently Added' },
    { value: 'title-asc', label: 'Title A → Z' },
    { value: 'title-desc', label: 'Title Z → A' },
    { value: 'progress', label: 'Most Progress' },
  ];

  // Last-read book for continue reading banner
  const lastReadBook = useMemo(() => {
    if (!lastReadBookId) return null;
    return books.find(b => b.id === lastReadBookId) || null;
  }, [books, lastReadBookId]);

  // Get filter label for display
  const getFilterLabel = (filter: FilterCategory) => {
    if (activeCollectionId) {
      const col = collections.find(c => c.id === activeCollectionId);
      return col ? `${col.emoji} ${col.name}` : 'Collection';
    }
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
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        bookCounts={bookCounts}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collections={collections}
        onManageCollections={() => setShowCollectionManager(true)}
        isAdmin={isAdmin}
        onLogout={signOut}
        onAdminLogin={() => router.push('/admin/login')}
      />

      {/* Main Content Area - responsive margin */}
      <div className="ml-0 sm:ml-64 min-h-screen">
        {/* Mobile Header - visible only on small screens */}
        <div className="sm:hidden sticky top-0 z-30 glass">
          <div className="px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 text-foreground hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="font-semibold text-lg flex-shrink-0">{getFilterLabel(activeFilter)}</h1>
            <div className="flex-1" />
            {/* Mobile Sort Button */}
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="p-2 text-muted hover:text-foreground transition-colors"
                aria-label="Sort"
              >
                <ArrowUpDown className="w-5 h-5" />
              </button>
              {showSortMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                    {sortOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => { setSortBy(opt.value); setShowSortMenu(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                          sortBy === opt.value ? 'bg-accent/20 text-accent font-medium' : 'text-foreground hover:bg-white/5'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          {/* Mobile Search Bar */}
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="Search books..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search books"
                className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Top Navigation Bar - hidden on mobile, visible on desktop */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="hidden sm:block sticky top-0 z-40 glass"
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
                  aria-label="Search books"
                  className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Sort Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted hover:text-foreground bg-card border border-border rounded-xl transition-colors"
                  title="Sort"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">{sortOptions.find(o => o.value === sortBy)?.label}</span>
                </button>
                {showSortMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                      {sortOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => { setSortBy(opt.value); setShowSortMenu(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                            sortBy === opt.value ? 'bg-accent/20 text-accent font-medium' : 'text-foreground hover:bg-white/5'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

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
        <main id="main-content" className="px-4 sm:px-8 py-6 sm:py-8" role="main" aria-label="Book library">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {/* Section Header - hidden on mobile since we show it in mobile header */}
            <div className="mb-6 sm:mb-8 hidden sm:block">
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">{getFilterLabel(activeFilter)}</h2>
              <p className="text-muted">
                {isLoading
                  ? 'Loading...'
                  : `${filteredBooks.length} ${filteredBooks.length === 1 ? 'book' : 'books'}`
                }
              </p>
            </div>

            {/* Recently Read — Horizontal scroll row (#13) */}
            {!isLoading && activeFilter === 'all' && !searchQuery && (
              <RecentlyRead
                books={books}
                progressData={progressMap}
                onBookClick={handleBookClick}
              />
            )}

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

            {/* Loading Skeleton — Refined card-matching shimmer (#16) */}
            {isLoading && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 sm:gap-8">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="group">
                    {/* Cover Skeleton — Sarpay book shape */}
                    <div className="relative book-cover rounded-[4px_8px_8px_4px] overflow-hidden bg-card"
                      style={{ boxShadow: '0 6px 20px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.3)' }}
                    >
                      <div
                        className="absolute inset-0"
                        style={{
                          background: 'linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.04) 50%, transparent 70%)',
                          animation: `shimmer 1.8s infinite ${i * 0.08}s`,
                        }}
                      />
                      {/* Spine accent */}
                      <div className="absolute left-0 top-0 bottom-0 w-3" style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.25), transparent)' }} />
                    </div>
                    {/* Title line */}
                    <div className="mt-3 space-y-1.5 px-0.5">
                      <div className="h-3 rounded-md w-4/5" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div
                          className="h-full rounded-md"
                          style={{
                            background: 'linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.03) 50%, transparent 70%)',
                            animation: `shimmer 1.8s infinite ${i * 0.08 + 0.1}s`,
                          }}
                        />
                      </div>
                      {/* Author line */}
                      <div className="h-2.5 rounded-md w-3/5" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <div
                          className="h-full rounded-md"
                          style={{
                            background: 'linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.03) 50%, transparent 70%)',
                            animation: `shimmer 1.8s infinite ${i * 0.08 + 0.2}s`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State — SVG illustrations (#17) */}
            {!isLoading && !error && books.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                <EmptyLibraryIllustration className="w-56 h-44 text-muted mb-6" />
                <h3 className="text-xl font-semibold mb-2">No books available</h3>
                <p className="text-muted mb-6 max-w-sm">
                  There are no books in the library yet.
                </p>
              </motion.div>
            )}

            {/* No search results empty state */}
            {!isLoading && !error && books.length > 0 && filteredBooks.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                {activeCollectionId ? (
                  <>
                    <EmptyCollectionIllustration className="w-56 h-44 text-muted mb-6" />
                    <h3 className="text-xl font-semibold mb-2">Empty collection</h3>
                    <p className="text-muted mb-6 max-w-sm">
                      Add books to this collection from the book card menu.
                    </p>
                  </>
                ) : searchQuery ? (
                  <>
                    <NoResultsIllustration className="w-56 h-44 text-muted mb-6" />
                    <h3 className="text-xl font-semibold mb-2">No results found</h3>
                    <p className="text-muted max-w-sm">
                      Try a different search term or check your filters.
                    </p>
                  </>
                ) : (
                  <>
                    <NoResultsIllustration className="w-56 h-44 text-muted mb-6" />
                    <h3 className="text-xl font-semibold mb-2">No books match this filter</h3>
                    <p className="text-muted max-w-sm">
                      Try selecting a different category.
                    </p>
                  </>
                )}
              </motion.div>
            )}

            {/* Library Grid */}
            {!isLoading && !error && books.length > 0 && (
              <ErrorBoundary section="library grid">
              {viewMode === 'grid' ? (
                <LibraryGrid
                  books={filteredBooks}
                  onBookClick={handleBookClick}
                  onDeleteClick={isAdmin ? (book) => setBookToDelete(book) : undefined}
                  onEditClick={isAdmin ? (book) => setBookToEdit(book) : undefined}
                  onAddToCollection={(book) => setBookToAddToCollection(book)}
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
                    </motion.div>
                  ))}
                </div>
              )}
              </ErrorBoundary>
            )}
          </motion.div>
        </main>
      </div>

      {/* Collection Manager Modal (#14) */}
      <AnimatePresence>
        {showCollectionManager && (
          <CollectionManagerModal
            collections={collections}
            onClose={() => setShowCollectionManager(false)}
            onCreate={createCollection}
            onDelete={deleteCollection}
            onRename={renameCollection}
          />
        )}
      </AnimatePresence>

      {/* Add to Collection Modal (#14) */}
      <AnimatePresence>
        {bookToAddToCollection && (
          <AddToCollectionModal
            bookTitle={bookToAddToCollection.title}
            bookId={bookToAddToCollection.id}
            collections={collections}
            onClose={() => setBookToAddToCollection(null)}
            onAdd={(colId) => addBookToCollection(colId, bookToAddToCollection.id)}
            onRemove={(colId) => removeBookFromCollection(colId, bookToAddToCollection.id)}
          />
        )}
      </AnimatePresence>

      {/* ===== Admin-Only CRUD UI ===== */}
      {isAdmin && (
        <>
          {/* Floating Upload Button */}
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
            onClick={() => setShowUploadModal(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-[#FF9F0A] to-[#FF6B00] text-white shadow-lg shadow-[#FF9F0A]/30 hover:shadow-[#FF9F0A]/50 hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
            title="Upload Book"
          >
            <Plus className="w-7 h-7" />
          </motion.button>

          {/* Upload Modal */}
          <AnimatePresence>
            {showUploadModal && (
              <UploadModal
                onClose={() => setShowUploadModal(false)}
                onUploadComplete={() => {
                  setShowUploadModal(false);
                  loadBooks();
                }}
              />
            )}
          </AnimatePresence>

          {/* Delete Book Modal */}
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

          {/* Edit Markdown Book Modal */}
          <AnimatePresence>
            {bookToEdit && (
              <EditMdBookModal
                book={bookToEdit}
                onClose={() => setBookToEdit(null)}
                onEditComplete={() => {
                  setBookToEdit(null);
                  loadBooks();
                }}
              />
            )}
          </AnimatePresence>
        </>
      )}

    </div>
  );
}
