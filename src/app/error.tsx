'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Something went wrong
        </h1>
        <p className="text-muted text-sm mb-6">
          An unexpected error occurred. Please try again.
        </p>
        {error.message && (
          <p className="text-xs text-red-400/60 mb-6 font-mono bg-red-500/5 rounded-lg p-3 border border-red-500/10">
            {error.message}
          </p>
        )}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-5 py-3 bg-accent hover:bg-accent-hover rounded-xl text-white font-medium text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <a
            href="/"
            className="flex items-center gap-2 px-5 py-3 bg-card hover:bg-white/10 border border-border rounded-xl text-foreground font-medium text-sm transition-colors"
          >
            <Home className="w-4 h-4" />
            Home
          </a>
        </div>
      </motion.div>
    </div>
  );
}
