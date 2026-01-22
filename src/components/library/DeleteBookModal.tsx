'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteBookModalProps {
  bookTitle: string;
  bookAuthor?: string;
  chapterCount?: number;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export function DeleteBookModal({
  bookTitle,
  bookAuthor = 'Unknown Author',
  chapterCount,
  onConfirm,
  onCancel,
  isDeleting = false,
}: DeleteBookModalProps) {
  return (
    <AnimatePresence>
      <>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        />

        {/* Modal */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-white/10"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-red-500/10">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Delete Book</h2>
                    <p className="text-sm text-white/60 mt-1">This action cannot be undone</p>
                  </div>
                </div>
                <button
                  onClick={onCancel}
                  disabled={isDeleting}
                  className="p-1 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <h3 className="font-semibold text-white text-lg mb-1">{bookTitle}</h3>
                <p className="text-sm text-white/60">{bookAuthor}</p>
                {chapterCount && chapterCount > 1 && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-sm text-orange-400 font-medium">
                      ⚠ {chapterCount} chapters will be deleted
                    </p>
                  </div>
                )}
              </div>

              <div className="text-sm text-white/80 space-y-2">
                <p>Are you sure you want to delete this book?</p>
                {chapterCount && chapterCount > 1 && (
                  <p className="text-white/60">
                    All {chapterCount} associated files will be permanently removed from storage.
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 bg-white/5 flex items-center justify-end gap-3">
              <button
                onClick={onCancel}
                disabled={isDeleting}
                className="px-6 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={isDeleting}
                className="px-6 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Book</span>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      </>
    </AnimatePresence>
  );
}
