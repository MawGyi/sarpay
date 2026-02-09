/**
 * Reader Pure Helpers
 *
 * Pure utility functions extracted from EpubReader and MdReader.
 * Keeps rendering components lean and makes logic independently testable.
 */

import type { ThemeMode, FontFamily, FontWeight } from '@/hooks/useLocalStorage';

// ─── Theme style maps ───────────────────────────────────

export const epubThemeStyles: Record<ThemeMode, { bg: string; text: string; accent: string }> = {
  original: { bg: '#ffffff', text: '#1a1a1a', accent: '#007aff' },
  quiet:    { bg: '#e8e8e8', text: '#3a3a3a', accent: '#007aff' },
  paper:    { bg: '#f4ecd8', text: '#5c4b37', accent: '#8b7355' },
  focus:    { bg: '#000000', text: '#e5e5e5', accent: '#0a84ff' },
};

export const mdThemeStyles: Record<ThemeMode, { bg: string; text: string; accent: string; prose: string }> = {
  original: { bg: 'bg-white',      text: 'text-gray-900', accent: 'text-blue-600', prose: 'prose-gray'   },
  quiet:    { bg: 'bg-gray-200',   text: 'text-gray-800', accent: 'text-blue-600', prose: 'prose-gray'   },
  paper:    { bg: 'bg-[#f4ecd8]',  text: 'text-[#5c4b37]', accent: 'text-[#8b7355]', prose: 'prose-stone' },
  focus:    { bg: 'bg-black',      text: 'text-gray-100', accent: 'text-blue-400', prose: 'prose-invert' },
};

// ─── Font helpers ────────────────────────────────────────

/** Return a CSS font-family string for the given setting. */
export function getFontFamilyCss(fontFamily: FontFamily): string {
  switch (fontFamily) {
    case 'serif':
      return "'Lora', 'Georgia', 'Times New Roman', serif";
    case 'sans':
      return "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    case 'pyidaungsu':
      return "'Pyidaungsu', 'Padauk', serif";
    case 'noto-sans-myanmar':
      return "'Noto Sans Myanmar', 'Padauk', sans-serif";
    default:
      return "'Lora', serif";
  }
}

/** Map a weight name to a numeric CSS value. */
export function getFontWeightValue(weight: FontWeight): string {
  const map: Record<FontWeight, string> = { normal: '400', medium: '500', bold: '700' };
  return map[weight];
}

// ─── Line-height helper ─────────────────────────────────

/** For Burmese fonts enforce a higher minimum line-height. */
export function getEffectiveLineHeight(fontFamily: FontFamily, lineHeight: number): number {
  if (fontFamily === 'pyidaungsu' || fontFamily === 'noto-sans-myanmar') {
    return Math.max(lineHeight, 2.0);
  }
  return lineHeight;
}

// ─── Reading-time estimate ──────────────────────────────

export interface ReadingTimeEstimate {
  wordCount: number;
  totalMinutes: number;
  remainingMinutes: number;
}

/** Estimate reading time at ~200 wpm. */
export function estimateReadingTime(content: string, progressPercent: number): ReadingTimeEstimate {
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const totalMinutes = Math.ceil(wordCount / 200);
  const remainingMinutes = Math.ceil(totalMinutes * (1 - progressPercent / 100));
  return { wordCount, totalMinutes, remainingMinutes };
}

// ─── Swipe gesture detection ────────────────────────────

export interface SwipeResult {
  direction: 'left' | 'right' | 'none';
}

/**
 * Determine swipe direction from touch deltas and elapsed time.
 * A valid swipe must be fast (<500ms), far enough (≥80px), and
 * predominantly horizontal.
 */
export function detectSwipe(
  deltaX: number,
  deltaY: number,
  elapsedMs: number,
): SwipeResult {
  if (elapsedMs > 500 || Math.abs(deltaX) < 80 || Math.abs(deltaY) > Math.abs(deltaX) * 0.6) {
    return { direction: 'none' };
  }
  return { direction: deltaX > 0 ? 'right' : 'left' };
}

// ─── Font size / line-height clamping ───────────────────

/** Clamp font size within [14, 48] range with a given delta. */
export function clampFontSize(current: number, delta: number): number {
  return Math.max(14, Math.min(48, current + delta));
}

/** Clamp line height within [1.2, 2.4] range with a given delta, rounded to 1 decimal. */
export function clampLineHeight(current: number, delta: number): number {
  return Math.max(1.2, Math.min(2.4, Math.round((current + delta) * 10) / 10));
}
