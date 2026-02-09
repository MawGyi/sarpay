import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Wire mock before imports ────────────────────────────
const { qb, mock } = vi.hoisted(() => {
  const terminalResult = { data: null, error: null };
  const queryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
  const chainable = [
    'select','insert','update','upsert','delete','eq','neq','gt','lt','gte','lte',
    'like','ilike','in','is','not','or','and','filter','order','limit','range',
    'count','match','contains','containedBy','overlaps','textSearch',
  ];
  for (const m of chainable) queryBuilder[m] = vi.fn().mockReturnValue(queryBuilder);
  queryBuilder['single'] = vi.fn().mockResolvedValue(terminalResult);
  queryBuilder['maybeSingle'] = vi.fn().mockResolvedValue(terminalResult);
  queryBuilder['then'] = vi.fn((r: (v: unknown) => void) => Promise.resolve(terminalResult).then(r));

  for (const m of ['select','insert','update','delete'] as const) {
    const orig = queryBuilder[m];
    queryBuilder[m] = vi.fn((...a: unknown[]) => {
      orig(...a);
      return { ...queryBuilder, then: (r: (v: unknown) => void) => Promise.resolve(terminalResult).then(r) };
    });
  }

  const client = {
    from: vi.fn(() => queryBuilder),
    storage: { from: vi.fn() },
    _queryBuilder: queryBuilder,
  };

  const mockModule = {
    isSupabaseConfigured: true,
    supabase: client,
    getSupabase: vi.fn(() => client),
    getStorageUrl: vi.fn((_b: string, p: string) => `https://mock.supabase.co/storage/${p}`),
    uploadFile: vi.fn().mockResolvedValue({ url: 'https://mock.supabase.co/storage/mock-path', error: null }),
    deleteFile: vi.fn().mockResolvedValue({ error: null }),
    __mockClient: client,
  };

  return { qb: queryBuilder, mock: mockModule };
});
vi.mock('@/lib/supabase', () => mock);

import {
  fetchBooks,
  fetchBookById,
  createBook,
  updateBook,
  deleteBook,
  uploadBook,
  fetchChapters,
  fetchChapterCounts,
} from '@/lib/api/books';

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── fetchBooks ───────────────────────────────────────────

describe('fetchBooks', () => {
  it('returns books ordered by created_at desc', async () => {
    const rows = [{ id: 'b1' }, { id: 'b2' }];
    qb.select.mockReturnValueOnce({
      ...qb,
      order: vi.fn().mockReturnValue({
        ...qb,
        eq: qb.eq,
        then: (resolve: (v: unknown) => void) =>
          Promise.resolve({ data: rows, error: null }).then(resolve),
      }),
    });

    const { books, error } = await fetchBooks();

    expect(error).toBeNull();
    expect(books).toEqual(rows);
  });

  it('filters by userId when provided', async () => {
    qb.select.mockReturnValueOnce({
      ...qb,
      order: vi.fn().mockReturnValue({
        ...qb,
        eq: qb.eq,
        then: (resolve: (v: unknown) => void) =>
          Promise.resolve({ data: [], error: null }).then(resolve),
      }),
    });

    await fetchBooks('u1');

    expect(qb.eq).toHaveBeenCalledWith('user_id', 'u1');
  });

  it('returns error on query failure', async () => {
    qb.select.mockReturnValueOnce({
      ...qb,
      order: vi.fn().mockReturnValue({
        ...qb,
        then: (resolve: (v: unknown) => void) =>
          Promise.resolve({ data: null, error: { message: 'fail' } }).then(resolve),
      }),
    });

    const { books, error } = await fetchBooks();

    expect(books).toEqual([]);
    expect(error!.message).toBe('fail');
  });

});

// ─── fetchBookById ────────────────────────────────────────

describe('fetchBookById', () => {
  it('returns a book by id', async () => {
    const book = { id: 'b1', title: 'Test' };
    qb.single.mockResolvedValueOnce({ data: book, error: null });

    const { book: result, error } = await fetchBookById('b1');

    expect(error).toBeNull();
    expect(result).toEqual(book);
    expect(qb.eq).toHaveBeenCalledWith('id', 'b1');
  });

  it('returns error when not found', async () => {
    qb.single.mockResolvedValueOnce({ data: null, error: { message: 'not found' } });

    const { book, error } = await fetchBookById('missing');

    expect(book).toBeNull();
    expect(error!.message).toBe('not found');
  });
});

// ─── createBook ───────────────────────────────────────────

describe('createBook', () => {
  it('inserts and returns a book', async () => {
    const newBook = { title: 'New', author: 'A', file_url: '/f', format_type: 'epub' as const };
    const inserted = { id: 'b-new', ...newBook };
    qb.single.mockResolvedValueOnce({ data: inserted, error: null });

    const { book, error } = await createBook(newBook);

    expect(error).toBeNull();
    expect(book).toEqual(inserted);
    expect(qb.insert).toHaveBeenCalled();
  });

  it('returns error on insert failure', async () => {
    qb.single.mockResolvedValueOnce({ data: null, error: { message: 'duplicate' } });

    const { book, error } = await createBook({ title: 'X', author: 'A', file_url: '/f', format_type: 'md' });

    expect(book).toBeNull();
    expect(error!.message).toBe('duplicate');
  });
});

// ─── updateBook ───────────────────────────────────────────

describe('updateBook', () => {
  it('updates and returns book', async () => {
    const updated = { id: 'b1', title: 'Updated' };
    qb.single.mockResolvedValueOnce({ data: updated, error: null });

    const { book, error } = await updateBook('b1', { title: 'Updated' });

    expect(error).toBeNull();
    expect(book).toEqual(updated);
    expect(qb.update).toHaveBeenCalled();
    expect(qb.eq).toHaveBeenCalledWith('id', 'b1');
  });
});

// ─── deleteBook (cascading delete) ────────────────────────

describe('deleteBook', () => {
  it('deletes book file, cover, chapter files, and DB record', async () => {
    // fetchBookById → returns book with file_url + cover_url
    const book = {
      id: 'b1',
      title: 'Test',
      file_url: 'https://x.supabase.co/storage/v1/object/public/books/file.epub',
      cover_url: 'https://x.supabase.co/storage/v1/object/public/covers/cover.jpg',
    };
    qb.single.mockResolvedValueOnce({ data: book, error: null });

    // fetchBookById also calls select — consume that call with default chainable
    qb.select.mockReturnValueOnce(qb);

    // fetchChapters → returns chapters with file_url
    qb.select.mockReturnValueOnce({
      ...qb,
      eq: vi.fn().mockReturnValue({
        ...qb,
        order: vi.fn().mockReturnValue({
          ...qb,
          then: (resolve: (v: unknown) => void) =>
            Promise.resolve({
              data: [
                { id: 'ch1', file_url: 'https://x.supabase.co/storage/v1/object/public/books/ch1.md', file_path: undefined },
              ],
              error: null,
            }).then(resolve),
        }),
      }),
    });

    // DB delete
    qb.delete.mockReturnValueOnce({
      ...qb,
      eq: vi.fn().mockReturnValue({
        ...qb,
        then: (resolve: (v: unknown) => void) =>
          Promise.resolve({ error: null }).then(resolve),
      }),
    });

    const { error } = await deleteBook('b1');

    expect(error).toBeNull();
    // deleteFile called for: chapter file, book file, cover file
    expect(mock.deleteFile).toHaveBeenCalledTimes(3);
  });

  it('returns error if book is not found', async () => {
    qb.single.mockResolvedValueOnce({ data: null, error: { message: 'not found' } });

    const { error } = await deleteBook('missing');

    expect(error!.message).toBe('not found');
  });

  it('still deletes DB record even if no chapters exist', async () => {
    const book = { id: 'b1', file_url: 'https://x.supabase.co/storage/v1/object/public/books/f.epub', cover_url: null };
    qb.single.mockResolvedValueOnce({ data: book, error: null });

    // fetchBookById's select — consume with default chainable
    qb.select.mockReturnValueOnce(qb);

    // chapters: empty
    qb.select.mockReturnValueOnce({
      ...qb,
      eq: vi.fn().mockReturnValue({
        ...qb,
        order: vi.fn().mockReturnValue({
          ...qb,
          then: (resolve: (v: unknown) => void) =>
            Promise.resolve({ data: [], error: null }).then(resolve),
        }),
      }),
    });

    // DB delete
    qb.delete.mockReturnValueOnce({
      ...qb,
      eq: vi.fn().mockReturnValue({
        ...qb,
        then: (resolve: (v: unknown) => void) =>
          Promise.resolve({ error: null }).then(resolve),
      }),
    });

    const { error } = await deleteBook('b1');

    expect(error).toBeNull();
    // Only the book file deleted (no cover, no chapters)
    expect(mock.deleteFile).toHaveBeenCalledTimes(1);
  });

});

// ─── uploadBook (upload sequence + rollback) ──────────────

describe('uploadBook', () => {
  const metadata = {
    title: 'My Book',
    author: 'Author',
    description: 'desc',
    formatType: 'epub' as const,
  };

  it('uploads file, cover, creates DB record, and calls onProgress', async () => {
    const file = new File(['content'], 'book.epub', { type: 'application/epub+zip' });
    const cover = new Blob(['img'], { type: 'image/jpeg' });
    const onProgress = vi.fn();

    // uploadFile for book file
    mock.uploadFile.mockResolvedValueOnce({ url: 'https://s.co/books/file.epub', error: null });
    // uploadFile for cover
    mock.uploadFile.mockResolvedValueOnce({ url: 'https://s.co/covers/cover.jpg', error: null });
    // createBook → insert → single
    qb.single.mockResolvedValueOnce({
      data: { id: 'b1', title: 'My Book' },
      error: null,
    });

    const { book, error } = await uploadBook(file, cover, metadata, 'u1', onProgress);

    expect(error).toBeNull();
    expect(book).toBeDefined();
    expect(mock.uploadFile).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenCalledWith(10);
    expect(onProgress).toHaveBeenCalledWith(50);
    expect(onProgress).toHaveBeenCalledWith(80);
    expect(onProgress).toHaveBeenCalledWith(100);
  });

  it('returns error if file upload fails', async () => {
    const file = new File(['x'], 'book.epub');
    mock.uploadFile.mockResolvedValueOnce({ url: '', error: new Error('upload failed') });

    const { book, error } = await uploadBook(file, null, metadata);

    expect(book).toBeNull();
    expect(error!.message).toBe('upload failed');
  });

  it('rolls back uploaded files if DB insert fails', async () => {
    const file = new File(['x'], 'book.epub');
    // File upload succeeds
    mock.uploadFile.mockResolvedValueOnce({ url: 'https://s.co/books/f.epub', error: null });
    // No cover
    // createBook fails
    qb.single.mockResolvedValueOnce({ data: null, error: { message: 'insert failed' } });

    const { book, error } = await uploadBook(file, null, metadata);

    expect(book).toBeNull();
    expect(error!.message).toBe('insert failed');
    // Should have attempted to clean up the uploaded file
    expect(mock.deleteFile).toHaveBeenCalled();
  });

  it('rolls back both file and cover if DB insert fails', async () => {
    const file = new File(['x'], 'book.epub');
    const cover = new Blob(['img']);

    mock.uploadFile
      .mockResolvedValueOnce({ url: 'https://s.co/books/f.epub', error: null })
      .mockResolvedValueOnce({ url: 'https://s.co/covers/c.jpg', error: null });

    qb.single.mockResolvedValueOnce({ data: null, error: { message: 'db error' } });

    const { error } = await uploadBook(file, cover, metadata);

    expect(error!.message).toBe('db error');
    // deleteFile called for both book file and cover
    expect(mock.deleteFile).toHaveBeenCalledTimes(2);
  });

});

// ─── fetchChapters ────────────────────────────────────────

describe('fetchChapters', () => {
  it('returns chapters ordered by sequence_order', async () => {
    const chapters = [{ id: 'ch1', sequence_order: 0 }, { id: 'ch2', sequence_order: 1 }];
    qb.select.mockReturnValueOnce({
      ...qb,
      eq: vi.fn().mockReturnValue({
        ...qb,
        order: vi.fn().mockReturnValue({
          ...qb,
          then: (resolve: (v: unknown) => void) =>
            Promise.resolve({ data: chapters, error: null }).then(resolve),
        }),
      }),
    });

    const { chapters: result, error } = await fetchChapters('b1');

    expect(error).toBeNull();
    expect(result).toEqual(chapters);
  });

  it('returns error on failure', async () => {
    qb.select.mockReturnValueOnce({
      ...qb,
      eq: vi.fn().mockReturnValue({
        ...qb,
        order: vi.fn().mockReturnValue({
          ...qb,
          then: (resolve: (v: unknown) => void) =>
            Promise.resolve({ data: null, error: { message: 'fail' } }).then(resolve),
        }),
      }),
    });

    const { chapters, error } = await fetchChapters('b1');

    expect(chapters).toEqual([]);
    expect(error!.message).toBe('fail');
  });
});

// ─── fetchChapterCounts ───────────────────────────────────

describe('fetchChapterCounts', () => {
  it('counts chapters per book_id', async () => {
    const data = [
      { book_id: 'b1' }, { book_id: 'b1' }, { book_id: 'b1' },
      { book_id: 'b2' },
    ];
    qb.select.mockReturnValueOnce({
      ...qb,
      in: vi.fn().mockReturnValue({
        ...qb,
        then: (resolve: (v: unknown) => void) =>
          Promise.resolve({ data, error: null }).then(resolve),
      }),
    });

    const { counts, error } = await fetchChapterCounts(['b1', 'b2']);

    expect(error).toBeNull();
    expect(counts.get('b1')).toBe(3);
    expect(counts.get('b2')).toBe(1);
  });

  it('returns empty map for empty bookIds', async () => {
    const { counts } = await fetchChapterCounts([]);
    expect(counts.size).toBe(0);
  });
});
