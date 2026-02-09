import { BookOpen, Home } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-6">
          <BookOpen className="w-8 h-8 text-accent" />
        </div>
        <h1 className="text-5xl font-bold text-foreground mb-2">404</h1>
        <h2 className="text-lg font-semibold text-foreground mb-2">Page Not Found</h2>
        <p className="text-muted text-sm mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-3 bg-accent hover:bg-accent-hover rounded-xl text-white font-medium text-sm transition-colors"
        >
          <Home className="w-4 h-4" />
          Back to Library
        </Link>
      </div>
    </div>
  );
}
