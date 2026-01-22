'use client';

import { motion } from 'framer-motion';
import {
  BookOpen,
  Upload,
  CheckCircle2,
  BookMarked,
  FileText,
  Library,
  Layers,
} from 'lucide-react';

export type FilterCategory = 'all' | 'epub' | 'md' | 'reading' | 'finished';

interface SidebarProps {
  onUploadClick?: () => void;
  activeFilter?: FilterCategory;
  onFilterChange?: (filter: FilterCategory) => void;
  bookCounts?: {
    all: number;
    epub: number;
    md: number;
    reading: number;
    finished: number;
  };
}

export function Sidebar({
  onUploadClick,
  activeFilter = 'all',
  onFilterChange,
  bookCounts = { all: 0, epub: 0, md: 0, reading: 0, finished: 0 }
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
  };

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="fixed left-0 top-0 h-screen w-64 bg-zinc-950/80 backdrop-blur-2xl border-r border-white/[0.08] z-50"
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-5 pb-2">
          <h1 className="text-[13px] font-semibold text-white/40 uppercase tracking-wider">
            Library
          </h1>
        </div>

        {/* Library Section */}
        <nav className="px-3 space-y-0.5">
          {libraryItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeFilter === item.id;

            return (
              <motion.button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
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

        <nav className="px-3 space-y-0.5">
          {collectionsItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeFilter === item.id;

            return (
              <motion.button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
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

        {/* Spacer */}
        <div className="flex-1" />

        {/* Upload Button */}
        <div className="p-4">
          <motion.button
            onClick={onUploadClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF9F0A] hover:bg-[#FFB340] text-black font-semibold text-sm transition-colors shadow-lg shadow-[#FF9F0A]/20"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Book</span>
          </motion.button>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-2">
          <p className="text-[10px] text-white/20 text-center">
            Apple Books Style
          </p>
        </div>
      </div>
    </motion.aside>
  );
}
