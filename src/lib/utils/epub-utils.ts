/**
 * EPUB Utilities for Apple Books Style Reader
 * 
 * Provides functions for parsing EPUB files, extracting metadata,
 * and handling cover images with CSS-based fallbacks.
 */

import ePub, { Book, NavItem } from 'epubjs';

export interface EpubMetadata {
  title: string;
  author: string;
  description?: string;
  publisher?: string;
  language?: string;
  pubdate?: string;
  identifier?: string;
}

export interface ParsedEpub {
  book: Book;
  metadata: EpubMetadata;
  coverUrl: string | null;
  toc: NavItem[];
}

/**
 * Parse an EPUB file and extract its contents
 */
export async function parseEpub(file: File): Promise<ParsedEpub> {
  const arrayBuffer = await file.arrayBuffer();
  const book = ePub(arrayBuffer);

  await book.ready;

  const metadata = await extractMetadata(book);
  const coverUrl = await extractCover(book);
  const toc = await extractToc(book);

  return {
    book,
    metadata,
    coverUrl,
    toc,
  };
}

/**
 * Parse EPUB from a URL or path
 */
export async function parseEpubFromUrl(url: string): Promise<ParsedEpub> {
  const book = ePub(url);

  await book.ready;

  const metadata = await extractMetadata(book);
  const coverUrl = await extractCover(book);
  const toc = await extractToc(book);

  return {
    book,
    metadata,
    coverUrl,
    toc,
  };
}

/**
 * Extract metadata from an EPUB book
 */
export async function extractMetadata(book: Book): Promise<EpubMetadata> {
  const metadata = await book.loaded.metadata;

  return {
    title: metadata.title || 'Untitled',
    author: metadata.creator || 'Unknown Author',
    description: metadata.description || undefined,
    publisher: metadata.publisher || undefined,
    language: metadata.language || undefined,
    pubdate: metadata.pubdate || undefined,
    identifier: metadata.identifier || undefined,
  };
}

/**
 * Extract cover image from EPUB as a Blob URL
 */
export async function extractCover(book: Book): Promise<string | null> {
  try {
    const coverUrl = await book.coverUrl();
    return coverUrl;
  } catch (error) {
    console.warn('Could not extract cover from EPUB:', error);
    return null;
  }
}

/**
 * Extract table of contents from EPUB
 */
export async function extractToc(book: Book): Promise<NavItem[]> {
  try {
    const navigation = await book.loaded.navigation;
    return navigation.toc || [];
  } catch (error) {
    console.warn('Could not extract TOC from EPUB:', error);
    return [];
  }
}

/**
 * Generate a CSS-based fallback cover for books without cover images
 * Returns an SVG data URL that can be used as an image source
 */
export function generateFallbackCover(
  title: string,
  author?: string
): string {
  // Generate a consistent color based on the title
  const hue = hashString(title) % 360;
  const saturation = 35 + (hashString(title) % 25);
  const lightness = 25 + (hashString(title) % 15);

  // Truncate title if too long
  const displayTitle = title.length > 40 ? title.substring(0, 37) + '...' : title;
  const displayAuthor = author && author.length > 30 ? author.substring(0, 27) + '...' : author;

  // Escape special characters for SVG
  const escapeXml = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:hsl(${hue}, ${saturation}%, ${lightness}%)" />
          <stop offset="100%" style="stop-color:hsl(${hue}, ${saturation}%, ${lightness - 10}%)" />
        </linearGradient>
      </defs>
      <rect width="300" height="450" fill="url(#bg)" />
      <rect x="0" y="0" width="8" height="450" fill="hsla(${hue}, ${saturation}%, ${lightness - 15}%, 0.8)" />
      <text 
        x="154" 
        y="180" 
        font-family="Georgia, serif" 
        font-size="24" 
        font-weight="bold" 
        fill="rgba(255,255,255,0.95)"
        text-anchor="middle"
      >
        ${wrapText(escapeXml(displayTitle), 14).map((line, i) => 
          `<tspan x="154" dy="${i === 0 ? 0 : 30}">${line}</tspan>`
        ).join('')}
      </text>
      ${displayAuthor ? `
        <text 
          x="154" 
          y="380" 
          font-family="Georgia, serif" 
          font-size="16" 
          fill="rgba(255,255,255,0.7)"
          text-anchor="middle"
        >
          ${escapeXml(displayAuthor)}
        </text>
      ` : ''}
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Simple hash function for generating consistent colors
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Wrap text into lines of max length
 */
function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines.slice(0, 4); // Max 4 lines
}

/**
 * Get cover URL with fallback
 */
export function getCoverUrl(
  coverUrl: string | null,
  title: string,
  author?: string
): string {
  return coverUrl || generateFallbackCover(title, author);
}
