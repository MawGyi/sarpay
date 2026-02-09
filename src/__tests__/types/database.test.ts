import { describe, it, expect } from 'vitest';
import { toBook, BookRow } from '@/types/database';

function makeBookRow(overrides: Partial<BookRow> = {}): BookRow {
  return {
    id: 'book-1',
    user_id: 'user-1',
    title: 'Test Book',
    author: 'Test Author',
    description: 'A test description',
    file_url: 'https://example.com/book.epub',
    cover_url: 'https://example.com/cover.jpg',
    format_type: 'epub',
    file_size: 1024,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('toBook', () => {
  it('converts a BookRow to Book with all fields', () => {
    const row = makeBookRow();
    const book = toBook(row);

    expect(book).toEqual({
      id: 'book-1',
      title: 'Test Book',
      author: 'Test Author',
      coverUrl: 'https://example.com/cover.jpg',
      fileUrl: 'https://example.com/book.epub',
      formatType: 'epub',
      progress: 0,
      description: 'A test description',
    });
  });

  it('defaults progress to 0 when not provided', () => {
    const book = toBook(makeBookRow());
    expect(book.progress).toBe(0);
  });

  it('uses provided progress value', () => {
    const book = toBook(makeBookRow(), 0.75);
    expect(book.progress).toBe(0.75);
  });

  it('accepts progress of 0 explicitly', () => {
    const book = toBook(makeBookRow(), 0);
    expect(book.progress).toBe(0);
  });

  it('converts null cover_url to undefined', () => {
    const book = toBook(makeBookRow({ cover_url: null }));
    expect(book.coverUrl).toBeUndefined();
  });

  it('converts empty string cover_url to undefined', () => {
    const book = toBook(makeBookRow({ cover_url: '' }));
    expect(book.coverUrl).toBeUndefined();
  });

  it('converts null description to undefined', () => {
    const book = toBook(makeBookRow({ description: null }));
    expect(book.description).toBeUndefined();
  });

  it('converts empty string description to undefined', () => {
    const book = toBook(makeBookRow({ description: '' }));
    expect(book.description).toBeUndefined();
  });

  it('preserves format_type as formatType', () => {
    const mdBook = toBook(makeBookRow({ format_type: 'md' }));
    expect(mdBook.formatType).toBe('md');

    const pdfBook = toBook(makeBookRow({ format_type: 'pdf' }));
    expect(pdfBook.formatType).toBe('pdf');
  });

  it('does not include database-only fields', () => {
    const book = toBook(makeBookRow());
    expect(book).not.toHaveProperty('user_id');
    expect(book).not.toHaveProperty('file_size');
    expect(book).not.toHaveProperty('created_at');
    expect(book).not.toHaveProperty('updated_at');
  });
});
