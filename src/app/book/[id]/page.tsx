import type { Metadata } from 'next';
import { fetchBookServer, fetchChaptersServer, fetchProgressServer } from '@/lib/api/server-fetchers';
import BookDetailClient from './BookDetailClient';

/**
 * Server Component wrapper for Book Detail page.
 * - Generates dynamic metadata (title, description, OG image) for SEO
 * - Pre-fetches book data on the server to avoid client loading flicker
 * - Passes data as props to the interactive client component
 */

interface BookPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: BookPageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const book = await fetchBookServer(id);
    if (!book) {
      return { title: 'Book Not Found — AppleBook' };
    }

    return {
      title: `${book.title} — AppleBook`,
      description: book.description
        ? book.description.replace(/<[^>]*>/g, '').slice(0, 160)
        : `Read ${book.title} by ${book.author}`,
      openGraph: {
        title: book.title,
        description: book.description
          ? book.description.replace(/<[^>]*>/g, '').slice(0, 160)
          : `Read ${book.title} by ${book.author}`,
        images: book.cover_url ? [{ url: book.cover_url }] : undefined,
      },
    };
  } catch {
    return { title: 'AppleBook' };
  }
}

export default async function BookPage({ params }: BookPageProps) {
  const { id } = await params;

  // Parallel server-side data fetching
  const [book, chapters, progress] = await Promise.all([
    fetchBookServer(id),
    fetchChaptersServer(id),
    fetchProgressServer(id),
  ]);

  return (
    <BookDetailClient
      initialBook={book}
      initialChapters={chapters}
      initialProgress={progress}
    />
  );
}
