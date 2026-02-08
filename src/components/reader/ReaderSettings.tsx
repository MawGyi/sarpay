'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sun, Minus, Plus, Maximize2, Minimize2, Type, AlignJustify } from 'lucide-react';
import { useReaderPreferences, ThemeMode, FontFamily, FontWeight } from '@/hooks/useLocalStorage';

interface ReaderSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  /** Whether browser is currently in fullscreen mode */
  isFullscreen?: boolean;
  /** Callback to toggle fullscreen mode */
  onToggleFullscreen?: () => void;
}

const themeOptions: Array<{ mode: ThemeMode; label: string; bg: string; text: string }> = [
  { mode: 'original', label: 'Original', bg: '#ffffff', text: '#1a1a1a' },
  { mode: 'quiet', label: 'Quiet', bg: '#e8e8e8', text: '#3a3a3a' },
  { mode: 'paper', label: 'Paper', bg: '#f4ecd8', text: '#5c4b37' },
  { mode: 'focus', label: 'Focus', bg: '#000000', text: '#e5e5e5' },
];

const fontWeightOptions: Array<{ weight: FontWeight; label: string; value: string }> = [
  { weight: 'normal', label: 'Normal', value: '400' },
  { weight: 'medium', label: 'Medium', value: '500' },
  { weight: 'bold', label: 'Bold', value: '700' },
];

export default function ReaderSettings({
  isOpen,
  onClose,
  isFullscreen,
  onToggleFullscreen,
}: ReaderSettingsProps) {
  const { preferences, updatePreference } = useReaderPreferences();

  const handleThemeChange = (theme: ThemeMode) => {
    updatePreference('theme', theme);
  };

  const handleFontFamilyChange = (fontFamily: FontFamily) => {
    updatePreference('fontFamily', fontFamily);
  };

  const handleFontWeightChange = (fontWeight: FontWeight) => {
    updatePreference('fontWeight', fontWeight);
  };

  const handleFontSizeChange = (delta: number) => {
    const newSize = Math.max(14, Math.min(48, preferences.fontSize + delta)); // Increased range for Burmese legibility
    updatePreference('fontSize', newSize);
  };

  const handleBrightnessChange = (value: number) => {
    updatePreference('brightness', value);
  };

  const handleLineHeightChange = (delta: number) => {
    const newHeight = Math.max(1.2, Math.min(2.4, Math.round((preferences.lineHeight + delta) * 10) / 10));
    updatePreference('lineHeight', newHeight);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-transparent z-40"
          />

          {/* Settings Panel - Bottom sheet on mobile, popover on desktop */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed z-50 inset-x-3 bottom-3 sm:inset-auto sm:top-16 sm:right-4 sm:w-80 rounded-2xl shadow-2xl glass overflow-hidden border border-white/10 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: preferences.theme === 'focus' ? 'rgba(30, 30, 30, 0.95)' :
                preferences.theme === 'quiet' ? 'rgba(240, 240, 240, 0.95)' :
                  preferences.theme === 'paper' ? 'rgba(244, 236, 216, 0.95)' :
                    'rgba(255, 255, 255, 0.95)',
              color: preferences.theme === 'focus' ? 'white' : 'black'
            }}
          >
            <div className="p-4 space-y-5">

              {/* Themes Row */}
              <div className="flex justify-between items-center gap-2 p-1 bg-black/5 dark:bg-white/10 rounded-xl">
                {themeOptions.map((theme) => (
                  <button
                    key={theme.mode}
                    onClick={() => handleThemeChange(theme.mode)}
                    className={`
                      flex-1 h-10 rounded-lg transition-colors duration-500 flex items-center justify-center
                      ${preferences.theme === theme.mode ? 'shadow-sm ring-1 ring-black/5' : 'hover:bg-black/5 dark:hover:bg-white/5'}
                    `}
                    style={{
                      backgroundColor: theme.bg,
                      color: theme.text,
                      border: preferences.theme === theme.mode ? '2px solid #007aff' : '1px solid transparent'
                    }}
                    title={theme.label}
                  >
                    <span className="font-bold text-lg">Aa</span>
                  </button>
                ))}
              </div>

              {/* Font Size & Brightness */}
              <div className="space-y-4">
                {/* Size Control */}
                <div className="flex items-center justify-between bg-black/5 dark:bg-white/10 rounded-xl p-1">
                  <button
                    onClick={() => handleFontSizeChange(-2)}
                    disabled={preferences.fontSize <= 14}
                    className="flex-1 py-2 flex items-center justify-center text-sm font-medium opacity-70 hover:opacity-100 disabled:opacity-30"
                  >
                    <span className="text-xs font-bold">A</span>
                  </button>
                  <div className="w-[1px] h-4 bg-black/10 dark:bg-white/10"></div>
                  <button
                    onClick={() => handleFontSizeChange(2)}
                    disabled={preferences.fontSize >= 48}
                    className="flex-1 py-2 flex items-center justify-center text-xl font-medium opacity-70 hover:opacity-100 disabled:opacity-30"
                  >
                    <span className="text-lg font-bold">A</span>
                  </button>
                </div>
              </div>

              {/* Font Selection */}
              <div>
                <h3 className="text-xs font-semibold uppercase opacity-50 mb-2 pl-1">Font</h3>
                <div className="grid grid-cols-1 gap-1">
                  {[
                    { id: 'serif', label: 'Original (Serif)', font: 'font-serif' },
                    { id: 'sans', label: 'Pro (Sans)', font: 'font-sans' },
                    { id: 'pyidaungsu', label: 'Pyidaungsu', font: 'font-[Pyidaungsu,Padauk]' },
                    { id: 'noto-sans-myanmar', label: 'Noto Sans Myanmar', font: 'font-[Noto_Sans_Myanmar]' }
                  ].map((font) => (
                    <button
                      key={font.id}
                      onClick={() => handleFontFamilyChange(font.id as FontFamily)}
                      className={`
                        w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between
                        ${preferences.fontFamily === font.id
                          ? 'bg-black/5 dark:bg-white/10 font-bold'
                          : 'hover:bg-black/5 dark:hover:bg-white/5'}
                      `}
                    >
                      <span className={font.font}>{font.label}</span>
                      {preferences.fontFamily === font.id && (
                        <div className="text-blue-500">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fullscreen Toggle */}
              {onToggleFullscreen && (
                <div>
                  <button
                    onClick={onToggleFullscreen}
                    className="w-full flex items-center justify-between px-3 py-3 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                  >
                    <span className="font-medium">
                      {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    </span>
                    {isFullscreen ? (
                      <Minimize2 className="w-5 h-5 opacity-70" />
                    ) : (
                      <Maximize2 className="w-5 h-5 opacity-70" />
                    )}
                  </button>
                </div>
              )}

              {/* Line Height */}
              <div>
                <h3 className="text-xs font-semibold uppercase opacity-50 mb-2 pl-1">Line Height</h3>
                <div className="flex items-center justify-between bg-black/5 dark:bg-white/10 rounded-xl p-1">
                  <button
                    onClick={() => handleLineHeightChange(-0.1)}
                    disabled={preferences.lineHeight <= 1.2}
                    className="flex-1 py-2 flex items-center justify-center text-sm font-medium opacity-70 hover:opacity-100 disabled:opacity-30"
                  >
                    <AlignJustify className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-medium opacity-60 min-w-[3rem] text-center">{preferences.lineHeight.toFixed(1)}</span>
                  <button
                    onClick={() => handleLineHeightChange(0.1)}
                    disabled={preferences.lineHeight >= 2.4}
                    className="flex-1 py-2 flex items-center justify-center text-sm font-medium opacity-70 hover:opacity-100 disabled:opacity-30"
                  >
                    <AlignJustify className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Font Weight */}
              <div>
                <h3 className="text-xs font-semibold uppercase opacity-50 mb-2 pl-1">Weight</h3>
                <div className="flex items-center gap-1 bg-black/5 dark:bg-white/10 rounded-xl p-1">
                  {fontWeightOptions.map((opt) => (
                    <button
                      key={opt.weight}
                      onClick={() => handleFontWeightChange(opt.weight)}
                      className={`
                        flex-1 py-2 rounded-lg text-sm transition-colors
                        ${preferences.fontWeight === opt.weight
                          ? 'bg-blue-500 text-white shadow-sm'
                          : 'hover:bg-black/5 dark:hover:bg-white/5'}
                      `}
                      style={{ fontWeight: opt.value }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brightness */}
              <div>
                <h3 className="text-xs font-semibold uppercase opacity-50 mb-2 pl-1">Brightness</h3>
                <div className="flex items-center gap-3 px-1">
                  <Sun className="w-4 h-4 opacity-40" />
                  <input
                    type="range"
                    min={40}
                    max={100}
                    value={preferences.brightness}
                    onChange={(e) => handleBrightnessChange(Number(e.target.value))}
                    className="flex-1 accent-blue-500 h-1 cursor-pointer"
                  />
                  <Sun className="w-5 h-5 opacity-70" />
                </div>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
