import { describe, it, expect } from 'vitest';
import {
  epubThemeStyles,
  mdThemeStyles,
  getFontFamilyCss,
  getFontWeightValue,
  getEffectiveLineHeight,
  estimateReadingTime,
  detectSwipe,
  clampFontSize,
  clampLineHeight,
} from '@/lib/utils/reader-helpers';

// ─── Theme maps ─────────────────────────────────────────

describe('epubThemeStyles', () => {
  it('has all four theme modes', () => {
    expect(Object.keys(epubThemeStyles)).toEqual(['original', 'quiet', 'paper', 'focus']);
  });

  it('focus theme uses dark background', () => {
    expect(epubThemeStyles.focus.bg).toBe('#000000');
  });
});

describe('mdThemeStyles', () => {
  it('includes a prose class for each theme', () => {
    for (const key of Object.keys(mdThemeStyles) as Array<keyof typeof mdThemeStyles>) {
      expect(mdThemeStyles[key].prose).toBeTruthy();
    }
  });
});

// ─── getFontFamilyCss ───────────────────────────────────

describe('getFontFamilyCss', () => {
  it('returns Lora-based stack for serif', () => {
    expect(getFontFamilyCss('serif')).toContain('Lora');
  });

  it('returns Inter-based stack for sans', () => {
    expect(getFontFamilyCss('sans')).toContain('Inter');
  });

  it('returns Pyidaungsu for pyidaungsu', () => {
    expect(getFontFamilyCss('pyidaungsu')).toContain('Pyidaungsu');
  });

  it('returns Noto Sans Myanmar for noto-sans-myanmar', () => {
    expect(getFontFamilyCss('noto-sans-myanmar')).toContain('Noto Sans Myanmar');
  });

  it('returns serif fallback for unknown value', () => {
    // @ts-expect-error: testing invalid input
    expect(getFontFamilyCss('comic')).toContain('Lora');
  });
});

// ─── getFontWeightValue ─────────────────────────────────

describe('getFontWeightValue', () => {
  it.each([
    ['normal', '400'],
    ['medium', '500'],
    ['bold', '700'],
  ] as const)('%s → %s', (weight, expected) => {
    expect(getFontWeightValue(weight)).toBe(expected);
  });
});

// ─── getEffectiveLineHeight ─────────────────────────────

describe('getEffectiveLineHeight', () => {
  it('returns original value for serif font', () => {
    expect(getEffectiveLineHeight('serif', 1.5)).toBe(1.5);
  });

  it('enforces 2.0 minimum for pyidaungsu', () => {
    expect(getEffectiveLineHeight('pyidaungsu', 1.5)).toBe(2.0);
  });

  it('enforces 2.0 minimum for noto-sans-myanmar', () => {
    expect(getEffectiveLineHeight('noto-sans-myanmar', 1.8)).toBe(2.0);
  });

  it('keeps value above 2.0 unchanged for Burmese fonts', () => {
    expect(getEffectiveLineHeight('pyidaungsu', 2.2)).toBe(2.2);
  });
});

// ─── estimateReadingTime ────────────────────────────────

describe('estimateReadingTime', () => {
  it('returns 0 words for empty string', () => {
    const r = estimateReadingTime('', 0);
    expect(r.wordCount).toBe(0);
    expect(r.totalMinutes).toBe(0);
  });

  it('estimates ~1 min for 200 words', () => {
    const text = Array(200).fill('word').join(' ');
    const r = estimateReadingTime(text, 0);
    expect(r.wordCount).toBe(200);
    expect(r.totalMinutes).toBe(1);
    expect(r.remainingMinutes).toBe(1);
  });

  it('calculates remaining time from progress', () => {
    const text = Array(400).fill('word').join(' ');
    const r = estimateReadingTime(text, 50);
    expect(r.totalMinutes).toBe(2);
    expect(r.remainingMinutes).toBe(1);
  });

  it('remaining is 0 when progress is 100%', () => {
    const text = Array(1000).fill('word').join(' ');
    const r = estimateReadingTime(text, 100);
    expect(r.remainingMinutes).toBe(0);
  });
});

// ─── detectSwipe ────────────────────────────────────────

describe('detectSwipe', () => {
  it('detects right swipe', () => {
    expect(detectSwipe(120, 10, 200)).toEqual({ direction: 'right' });
  });

  it('detects left swipe', () => {
    expect(detectSwipe(-100, 20, 150)).toEqual({ direction: 'left' });
  });

  it('rejects slow gesture (>500ms)', () => {
    expect(detectSwipe(150, 10, 600)).toEqual({ direction: 'none' });
  });

  it('rejects short gesture (<80px)', () => {
    expect(detectSwipe(50, 5, 100)).toEqual({ direction: 'none' });
  });

  it('rejects vertical-dominant gesture', () => {
    // deltaY > deltaX * 0.6
    expect(detectSwipe(100, 80, 200)).toEqual({ direction: 'none' });
  });

  it('allows diagonal when horizontal dominates', () => {
    // deltaY = 40, threshold = 80 * 0.6 = 48 → passes
    expect(detectSwipe(80, 40, 200)).toEqual({ direction: 'right' });
  });
});

// ─── clampFontSize ──────────────────────────────────────

describe('clampFontSize', () => {
  it('increases size', () => {
    expect(clampFontSize(16, 2)).toBe(18);
  });

  it('does not go below 14', () => {
    expect(clampFontSize(14, -2)).toBe(14);
  });

  it('does not exceed 48', () => {
    expect(clampFontSize(48, 2)).toBe(48);
  });
});

// ─── clampLineHeight ────────────────────────────────────

describe('clampLineHeight', () => {
  it('increases line height', () => {
    expect(clampLineHeight(1.5, 0.1)).toBe(1.6);
  });

  it('does not go below 1.2', () => {
    expect(clampLineHeight(1.2, -0.1)).toBe(1.2);
  });

  it('does not exceed 2.4', () => {
    expect(clampLineHeight(2.4, 0.1)).toBe(2.4);
  });

  it('rounds to one decimal place', () => {
    expect(clampLineHeight(1.55, 0.1)).toBe(1.7);
  });
});
