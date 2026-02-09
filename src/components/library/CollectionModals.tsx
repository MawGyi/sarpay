'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, FolderPlus } from 'lucide-react';
import type { Collection } from '@/types/database';

const EMOJI_OPTIONS = ['📂', '📚', '⭐', '❤️', '🎯', '🔥', '🌙', '🎨', '🧠', '💡', '🏆', '📖'];

interface CollectionManagerModalProps {
  collections: Collection[];
  onClose: () => void;
  onCreate: (name: string, emoji: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string, emoji?: string) => void;
}

export function CollectionManagerModal({
  collections,
  onClose,
  onCreate,
  onDelete,
  onRename,
}: CollectionManagerModalProps) {
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('📂');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = () => {
    if (newName.trim()) {
      onCreate(newName.trim(), newEmoji);
      setNewName('');
      setNewEmoji('📂');
    }
  };

  const handleStartEdit = (col: Collection) => {
    setEditingId(col.id);
    setEditName(col.name);
  };

  const handleSaveEdit = (id: string) => {
    if (editName.trim()) {
      onRename(id, editName.trim());
    }
    setEditingId(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Manage Collections</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Create new */}
        <div className="px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-lg transition-colors"
              >
                {newEmoji}
              </button>
              {showEmojiPicker && (
                <div className="absolute top-full left-0 mt-1 p-2 bg-zinc-800 border border-white/10 rounded-xl shadow-xl z-10 grid grid-cols-6 gap-1 w-[200px]">
                  {EMOJI_OPTIONS.map((e) => (
                    <button
                      key={e}
                      onClick={() => {
                        setNewEmoji(e);
                        setShowEmojiPicker(false);
                      }}
                      className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-base transition-colors"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="New collection name..."
              className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="p-2.5 rounded-xl bg-accent hover:bg-accent/80 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Collection list */}
        <div className="px-6 py-3 max-h-[300px] overflow-y-auto custom-scrollbar">
          {collections.length === 0 ? (
            <div className="py-8 text-center">
              <FolderPlus className="w-8 h-8 text-white/20 mx-auto mb-2" />
              <p className="text-sm text-white/40">No collections yet</p>
              <p className="text-xs text-white/25 mt-1">Create one to organize your books</p>
            </div>
          ) : (
            <div className="space-y-1">
              {collections.map((col) => (
                <div
                  key={col.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 group transition-colors"
                >
                  <span className="text-lg">{col.emoji}</span>
                  {editingId === col.id ? (
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(col.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      onBlur={() => handleSaveEdit(col.id)}
                      className="flex-1 px-2 py-1 bg-white/10 border border-white/20 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-accent/50"
                    />
                  ) : (
                    <span
                      onClick={() => handleStartEdit(col)}
                      className="flex-1 text-sm text-white/80 cursor-pointer hover:text-white"
                    >
                      {col.name}
                    </span>
                  )}
                  <span className="text-xs text-white/30 font-medium">
                    {col.bookIds.length}
                  </span>
                  <button
                    onClick={() => onDelete(col.id)}
                    className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/5">
          <p className="text-[10px] text-white/25 text-center">
            Click a name to rename &middot; Collections are saved locally
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface AddToCollectionModalProps {
  bookTitle: string;
  collections: Collection[];
  bookId: string;
  onClose: () => void;
  onAdd: (collectionId: string) => void;
  onRemove: (collectionId: string) => void;
}

export function AddToCollectionModal({
  bookTitle,
  collections,
  bookId,
  onClose,
  onAdd,
  onRemove,
}: AddToCollectionModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="text-base font-semibold text-white">Add to Collection</h2>
            <p className="text-xs text-white/40 truncate mt-0.5">{bookTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 max-h-[250px] overflow-y-auto custom-scrollbar">
          {collections.length === 0 ? (
            <p className="text-sm text-white/40 text-center py-6">
              No collections yet. Create one first.
            </p>
          ) : (
            <div className="space-y-1">
              {collections.map((col) => {
                const isIn = col.bookIds.includes(bookId);
                return (
                  <button
                    key={col.id}
                    onClick={() => (isIn ? onRemove(col.id) : onAdd(col.id))}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
                      isIn
                        ? 'bg-accent/15 border border-accent/30'
                        : 'hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <span className="text-lg">{col.emoji}</span>
                    <span className="flex-1 text-sm text-white/80">{col.name}</span>
                    {isIn && (
                      <span className="text-xs text-accent font-medium">Added</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
