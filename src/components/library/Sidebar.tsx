'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  CheckCircle2,
  BookMarked,
  FileText,
  Library,
  Layers,
  X,
  FolderPlus,
  Settings2,
  LogIn,
  LogOut,
  Shield,
} from 'lucide-react';
import type { Collection } from '@/types/database';

export type FilterCategory = 'all' | 'epub' | 'md' | 'reading' | 'finished' | string;

interface SidebarProps {
  activeFilter?: FilterCategory;
  onFilterChange?: (filter: FilterCategory) => void;
  bookCounts?: {
    all: number;
    epub: number;
    md: number;
    reading: number;
    finished: number;
  };
  /** Mobile: whether sidebar is open */
  isOpen?: boolean;
  /** Mobile: callback to close sidebar */
  onClose?: () => void;
  /** User collections */
  collections?: Collection[];
  /** Callback to open collection manager */
  onManageCollections?: () => void;
  /** Whether current user is admin */
  isAdmin?: boolean;
  /** Callback to log out */
  onLogout?: () => void;
  /** Callback to navigate to admin login */
  onAdminLogin?: () => void;
}

export function Sidebar({
  activeFilter = 'all',
  onFilterChange,
  bookCounts = { all: 0, epub: 0, md: 0, reading: 0, finished: 0 },
  isOpen = false,
  onClose,
  collections = [],
  onManageCollections,
  isAdmin = false,
  onLogout,
  onAdminLogin,
}: SidebarProps) {

  const libraryItems = [
    {
      id: 'all' as FilterCategory,
      label: 'All',
      icon: Library,
      count: bookCounts.all,
    },
    {
      id: 'reading' as FilterCategory,
      label: 'Want to Read',
      icon: BookMarked,
      count: bookCounts.reading,
    },
    {
      id: 'finished' as FilterCategory,
      label: 'Finished',
      icon: CheckCircle2,
      count: bookCounts.finished,
    },
  ];

  const collectionsItems = [
    {
      id: 'epub' as FilterCategory,
      label: 'EPUBs',
      icon: BookOpen,
      count: bookCounts.epub,
    },
    {
      id: 'md' as FilterCategory,
      label: 'Markdown',
      icon: FileText,
      count: bookCounts.md,
    },
  ];

  const handleItemClick = (filter: FilterCategory) => {
    onFilterChange?.(filter);
    // Close sidebar on mobile after selection
    onClose?.();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 sm:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{
          x: 0,
          opacity: 1,
        }}
        aria-label="Library navigation"
        role="navigation"
        className={`
          fixed left-0 top-0 h-screen bg-zinc-950/95 sm:bg-zinc-950/80 backdrop-blur-2xl 
          border-r border-white/[0.08] z-50
          w-[280px] sm:w-64
          transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          sm:translate-x-0
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header with close button for mobile */}
          <div className="p-5 pb-2 flex items-center justify-between">
            <h1 className="text-[13px] font-semibold text-white/40 uppercase tracking-wider">
              Library
            </h1>
            {/* Close button - mobile only */}
            <button
              onClick={onClose}
              className="sm:hidden p-2 -mr-2 text-white/40 hover:text-white/80 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Library Section */}
          <nav className="px-3 space-y-0.5" aria-label="Library categories">
            {libraryItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeFilter === item.id;

              return (
                <motion.button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  whileTap={{ scale: 0.98 }}
                  aria-current={isActive ? 'page' : undefined}
                  className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-lg
                  transition-all duration-150 group
                  ${isActive
                      ? 'bg-white/10 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                    }
                `}
                >
                  <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-[#FF9F0A]' : 'text-white/50 group-hover:text-white/70'}`} />
                  <span className="flex-1 text-left text-[13px] font-medium">{item.label}</span>
                  {item.count > 0 && (
                    <span className={`text-[11px] font-medium ${isActive ? 'text-white/70' : 'text-white/30'}`}>
                      {item.count}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </nav>

          {/* Divider */}
          <div className="mx-5 my-4 border-t border-white/[0.06]" />

          {/* Collections Section */}
          <div className="px-5 pb-2">
            <h2 className="text-[11px] font-semibold text-white/30 uppercase tracking-wider">
              Collections
            </h2>
          </div>

          <nav className="px-3 space-y-0.5" aria-label="Format collections">
            {collectionsItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeFilter === item.id;

              return (
                <motion.button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  whileTap={{ scale: 0.98 }}
                  aria-current={isActive ? 'page' : undefined}
                  className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-lg
                  transition-all duration-150 group
                  ${isActive
                      ? 'bg-white/10 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                    }
                `}
                >
                  <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-[#FF9F0A]' : 'text-white/50 group-hover:text-white/70'}`} />
                  <span className="flex-1 text-left text-[13px] font-medium">{item.label}</span>
                  {item.count > 0 && (
                    <span className={`text-[11px] font-medium ${isActive ? 'text-white/70' : 'text-white/30'}`}>
                      {item.count}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </nav>

          {/* User Collections Section (#14) */}
          {(collections.length > 0 || onManageCollections) && (
            <>
              <div className="mx-5 my-4 border-t border-white/[0.06]" />
              <div className="px-5 pb-2 flex items-center justify-between">
                <h2 className="text-[11px] font-semibold text-white/30 uppercase tracking-wider">
                  My Shelves
                </h2>
                {onManageCollections && (
                  <button
                    onClick={onManageCollections}
                    className="p-1 text-white/30 hover:text-white/60 transition-colors"
                    title="Manage collections"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <nav className="px-3 space-y-0.5">
                {collections.map((col) => {
                  const isActive = activeFilter === col.id;
                  return (
                    <motion.button
                      key={col.id}
                      onClick={() => handleItemClick(col.id)}
                      whileTap={{ scale: 0.98 }}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 rounded-lg
                        transition-all duration-150 group
                        ${isActive
                          ? 'bg-white/10 text-white'
                          : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                        }
                      `}
                    >
                      <span className="text-base w-[18px] text-center">{col.emoji}</span>
                      <span className="flex-1 text-left text-[13px] font-medium truncate">{col.name}</span>
                      {col.bookIds.length > 0 && (
                        <span className={`text-[11px] font-medium ${isActive ? 'text-white/70' : 'text-white/30'}`}>
                          {col.bookIds.length}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
                {onManageCollections && (
                  <motion.button
                    onClick={() => { onManageCollections(); onClose?.(); }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/40 hover:text-white/60 hover:bg-white/[0.05] transition-all duration-150"
                  >
                    <FolderPlus className="w-[18px] h-[18px]" />
                    <span className="text-[13px] font-medium">New Collection</span>
                  </motion.button>
                )}
              </nav>
            </>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Admin Section */}
          <div className="px-3 pb-3 pt-2">
            {isAdmin ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#FF9F0A]/10 border border-[#FF9F0A]/20">
                  <Shield className="w-3.5 h-3.5 text-[#FF9F0A]" />
                  <span className="text-[11px] font-semibold text-[#FF9F0A]">Admin Mode</span>
                </div>
                <button
                  onClick={() => { onLogout?.(); onClose?.(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all text-[12px] font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => { onAdminLogin?.(); onClose?.(); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/20 hover:text-white/40 transition-all text-[11px]"
              >
                <LogIn className="w-3 h-3" />
                Admin
              </button>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 pb-5 pt-1">
            <p className="text-[10px] text-white/20 text-center">
              Apple Books Style
            </p>
          </div>
        </div>
      </motion.aside>
    </>
  );
}
