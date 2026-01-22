'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { fetchBookById, fetchChapters } from '@/lib/api/books';
import { getSupabase } from '@/lib/supabase';
import MdReader from '@/components/reader/MdReader';
import { EpubReader } from '@/components/reader';
import type { BookRow, ChapterRow } from '@/types/database';

export default function ReaderPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { id } = params;
  const chapterId = searchParams.get('chapterId');

  const [book, setBook] = useState<BookRow | null>(null);
  const [content, setContent] = useState<string>('');
  const [currentChapter, setCurrentChapter] = useState<ChapterRow | null>(null);
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReaderData() {
        if (!id) return;
        setIsLoading(true);

        try {
            // 1. Fetch Book & Chapters
            const [bookRes, chaptersRes] = await Promise.all([
                fetchBookById(id as string),
                fetchChapters(id as string)
            ]);

            if (bookRes.error) throw bookRes.error;
            if (!bookRes.book) throw new Error('Book not found');
            
            setBook(bookRes.book);
            const allChapters = (chaptersRes.chapters as ChapterRow[]) || [];
            setChapters(allChapters);

            // 2. Determine Scope (EPUB or Chapter)
            if (bookRes.book.format_type === 'epub') {
                // EPUB reader connects directly to file_url
                setIsLoading(false);
                return;
            }

            // 3. For Markdown: Find specific chapter or default to first
            let targetChapter: ChapterRow | undefined;
            
            if (chapterId) {
                targetChapter = allChapters.find(c => c.id === chapterId);
            } else if (allChapters.length > 0) {
                // Default to first chapter if none selected
                targetChapter = allChapters[0];
            }

            // 4. Fetch Content
            if (targetChapter) {
                setCurrentChapter(targetChapter);
                const text = await fetchFileContent(targetChapter.file_url);
                setContent(text);
            } else if (bookRes.book.file_url) {
                // Fallback to main file if no chapters
                const text = await fetchFileContent(bookRes.book.file_url);
                setContent(text);
            } else {
                setError('No content found for this book.');
            }

        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Failed to load book content');
        } finally {
            setIsLoading(false);
        }
    }

    loadReaderData();
  }, [id, chapterId]);

  // Helper to fetch text content
  const fetchFileContent = async (url: string) => {
      try {
          const res = await fetch(url);
          if (!res.ok) throw new Error('Failed to fetch file');
          return await res.text();
      } catch (e) {
          throw new Error('Could not download book content');
      }
  };

  const handleClose = () => {
    router.push('/');
  };

  const handleNextChapter = () => {
    if (!currentChapter || !chapters.length) return;
    const currentIndex = chapters.findIndex(c => c.id === currentChapter.id);
    if (currentIndex < chapters.length - 1) {
      const nextChapter = chapters[currentIndex + 1];
      router.push(`/reader/${id}?chapterId=${nextChapter.id}`);
    }
  };

  const handlePreviousChapter = () => {
    if (!currentChapter || !chapters.length) return;
    const currentIndex = chapters.findIndex(c => c.id === currentChapter.id);
    if (currentIndex > 0) {
      const prevChapter = chapters[currentIndex - 1];
      router.push(`/reader/${id}?chapterId=${prevChapter.id}`);
    }
  };

  const handleChapterSelect = (chapterId: string) => {
    router.push(`/reader/${id}?chapterId=${chapterId}`);
  };

  const getCurrentChapterNumber = () => {
    if (!currentChapter || !chapters.length) return undefined;
    const index = chapters.findIndex(c => c.id === currentChapter.id);
    return index >= 0 ? index + 1 : undefined;
  };

  if (isLoading) {
      return (
          <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="min-h-screen bg-black flex items-center justify-center"
          >
              <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </motion.div>
      );
  }

  if (error || !book) {
      return (
          <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="min-h-screen bg-black flex flex-col items-center justify-center text-white"
          >
              <p className="text-red-400 mb-4">{error || 'Book not found'}</p>
              <button onClick={() => router.push('/')} className="text-sm underline opacity-60">Return to Library</button>
          </motion.div>
      );
  }

  // Render EPUB Reader
  if (book.format_type === 'epub') {
      return (
          <EpubReader 
              url={book.file_url} 
              bookId={book.id} 
              title={book.title} 
              onClose={handleClose} 
          />
      );
  }

  // Render Markdown Reader
  return (
      <MdReader 
          content={content} 
          bookId={currentChapter ? `${book.id}_${currentChapter.id}` : book.id} 
          title={currentChapter ? currentChapter.title : book.title}
          onClose={handleClose}
          currentChapter={getCurrentChapterNumber()}
          totalChapters={chapters.length > 0 ? chapters.length : undefined}
          onNextChapter={chapters.length > 0 ? handleNextChapter : undefined}
          onPreviousChapter={chapters.length > 0 ? handlePreviousChapter : undefined}
          chapters={chapters.length > 0 ? chapters : undefined}
          currentChapterId={currentChapter?.id}
          onChapterSelect={handleChapterSelect}
      />
  );
}
