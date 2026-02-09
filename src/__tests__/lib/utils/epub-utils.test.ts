import { describe, it, expect } from 'vitest';
import { generateFallbackCover, getCoverUrl } from '@/lib/utils/epub-utils';

describe('generateFallbackCover', () => {
  it('returns a data URI SVG', () => {
    const result = generateFallbackCover('Test Title');
    expect(result).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
  });

  it('includes the title in the SVG', () => {
    const result = generateFallbackCover('My Book');
    const decoded = decodeURIComponent(result);
    expect(decoded).toContain('My Book');
  });

  it('includes the author when provided', () => {
    const result = generateFallbackCover('Title', 'Jane Doe');
    const decoded = decodeURIComponent(result);
    expect(decoded).toContain('Jane Doe');
  });

  it('omits author text element when not provided', () => {
    const result = generateFallbackCover('Title');
    const decoded = decodeURIComponent(result);
    // Should not have the author text block
    expect(decoded).not.toContain('y="380"');
  });

  it('produces deterministic output for same title', () => {
    const a = generateFallbackCover('Consistent Title', 'Author');
    const b = generateFallbackCover('Consistent Title', 'Author');
    expect(a).toBe(b);
  });

  it('produces different colors for different titles', () => {
    const a = generateFallbackCover('Book A');
    const b = generateFallbackCover('Book B');
    expect(a).not.toBe(b);
  });

  it('truncates long titles with ellipsis', () => {
    const longTitle = 'A'.repeat(50);
    const result = generateFallbackCover(longTitle);
    const decoded = decodeURIComponent(result);
    expect(decoded).toContain('...');
    // Should contain first 37 chars + ...
    expect(decoded).toContain('A'.repeat(37) + '...');
  });

  it('truncates long author names with ellipsis', () => {
    const longAuthor = 'B'.repeat(35);
    const result = generateFallbackCover('Title', longAuthor);
    const decoded = decodeURIComponent(result);
    expect(decoded).toContain('B'.repeat(27) + '...');
  });

  it('does not truncate short titles', () => {
    const result = generateFallbackCover('Short');
    const decoded = decodeURIComponent(result);
    expect(decoded).toContain('Short');
    expect(decoded).not.toContain('...');
  });

  it('escapes XML special characters in title', () => {
    const result = generateFallbackCover('Tom & Jerry <3');
    const decoded = decodeURIComponent(result);
    expect(decoded).toContain('&amp;');
    expect(decoded).toContain('&lt;');
    // Raw & and < should not appear unescaped inside the text
    expect(decoded).not.toMatch(/Tom & Jerry/);
  });

  it('escapes XML special characters in author', () => {
    const result = generateFallbackCover('Title', 'O\'Brien & Co');
    const decoded = decodeURIComponent(result);
    expect(decoded).toContain('&apos;');
    expect(decoded).toContain('&amp;');
  });

  it('contains valid SVG structure', () => {
    const result = generateFallbackCover('Test', 'Author');
    const decoded = decodeURIComponent(result);
    expect(decoded).toContain('<svg');
    expect(decoded).toContain('</svg>');
    expect(decoded).toContain('width="300"');
    expect(decoded).toContain('height="450"');
    expect(decoded).toContain('linearGradient');
  });

  it('wraps long titles across multiple lines using tspan', () => {
    const result = generateFallbackCover('This Is A Long Multi Word Title');
    const decoded = decodeURIComponent(result);
    // Multiple tspan elements indicate text wrapping
    const tspanCount = (decoded.match(/<tspan/g) || []).length;
    expect(tspanCount).toBeGreaterThan(1);
  });

  it('limits wrapped title to 4 lines max', () => {
    // Very long title with many words — should cap at 4 tspans
    const result = generateFallbackCover('Word '.repeat(20).trim());
    const decoded = decodeURIComponent(result);
    const tspanCount = (decoded.match(/<tspan/g) || []).length;
    expect(tspanCount).toBeLessThanOrEqual(4);
  });

  it('handles single word titles', () => {
    const result = generateFallbackCover('Raven');
    const decoded = decodeURIComponent(result);
    const tspanCount = (decoded.match(/<tspan/g) || []).length;
    expect(tspanCount).toBe(1);
  });
});

describe('getCoverUrl', () => {
  it('returns coverUrl when provided', () => {
    const result = getCoverUrl('https://example.com/cover.jpg', 'Title', 'Author');
    expect(result).toBe('https://example.com/cover.jpg');
  });

  it('returns fallback cover when coverUrl is null', () => {
    const result = getCoverUrl(null, 'My Book', 'Author');
    expect(result).toMatch(/^data:image\/svg\+xml/);
    expect(decodeURIComponent(result)).toContain('My Book');
  });

  it('returns fallback cover when coverUrl is empty string', () => {
    // empty string is falsy, so getCoverUrl should fall back
    const result = getCoverUrl('' as unknown as null, 'Title');
    expect(result).toMatch(/^data:image\/svg\+xml/);
  });

  it('generates fallback without author', () => {
    const result = getCoverUrl(null, 'Solo Book');
    expect(result).toMatch(/^data:image\/svg\+xml/);
    const decoded = decodeURIComponent(result);
    expect(decoded).toContain('Solo Book');
  });
});
