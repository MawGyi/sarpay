import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock supabase-server ─────────────────────────────────

const { mockClient, qb } = vi.hoisted(() => {
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

  return { mockClient: client, qb: queryBuilder };
});

vi.mock('@/lib/supabase-server', () => ({
  createSupabaseServer: vi.fn().mockResolvedValue(mockClient),
}));

import {
  fetchBookServer,
  fetchChaptersServer,
  fetchBooksServer,
  fetchProgressServer,
} from '@/lib/api/server-fetchers';

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── fetchBookServer ──────────────────────────────────────

describe('fetchBookServer', () => {
  it('returns book when found', async () => {
    const book = { id: 'b1', title: 'Book 1' };
    qb.single.mockResolvedValueOnce({ data: book, error: null });

    const result = await fetchBookServer('b1');

    expect(result).toEqual(book);
    expect(mockClient.from).toHaveBeenCalledWith('books');
    expect(qb.eq).toHaveBeenCalledWith('id', 'b1');
  });

  it('returns null on error', async () => {
    qb.single.mockResolvedValueOnce({ data: null, error: { message: 'fail' } });

    const result = await fetchBookServer('b1');

    expect(result).toBeNull();
  });

  it('swallows exceptions and returns null', async () => {
    qb.single.mockRejectedValueOnce(new Error('crash'));

    const result = await fetchBookServer('b1');

    expect(result).toBeNull();
  });
});

// ─── fetchChaptersServer ──────────────────────────────────

describe('fetchChaptersServer', () => {
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

    const result = await fetchChaptersServer('b1');

    expect(result).toEqual(chapters);
    expect(mockClient.from).toHaveBeenCalledWith('chapters');
  });

  it('returns empty array on error', async () => {
    qb.select.mockReturnValueOnce({
      ...qb,
      eq: vi.fn().mockReturnValue({
        ...qb,
        order: vi.fn().mockReturnValue({
          ...qb,
          then: (resolve: (v: unknown) => void) =>
            Promise.resolve({ data: null, error: { message: 'err' } }).then(resolve),
        }),
      }),
    });

    const result = await fetchChaptersServer('b1');

    expect(result).toEqual([]);
  });

  it('swallows exceptions and returns empty array', async () => {
    qb.select.mockReturnValueOnce({
      ...qb,
      eq: vi.fn(() => { throw new Error('boom'); }),
    });

    const result = await fetchChaptersServer('b1');

    expect(result).toEqual([]);
  });
});

// ─── fetchBooksServer ─────────────────────────────────────

describe('fetchBooksServer', () => {
  it('returns books without userId filter', async () => {
    const books = [{ id: 'b1' }, { id: 'b2' }];
    qb.select.mockReturnValueOnce({
      ...qb,
      order: vi.fn().mockReturnValue({
        ...qb,
        then: (resolve: (v: unknown) => void) =>
          Promise.resolve({ data: books, error: null }).then(resolve),
      }),
    });

    const result = await fetchBooksServer();

    expect(result).toEqual(books);
    expect(mockClient.from).toHaveBeenCalledWith('books');
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

    await fetchBooksServer('u1');

    expect(qb.eq).toHaveBeenCalledWith('user_id', 'u1');
  });

  it('returns empty array on error', async () => {
    qb.select.mockReturnValueOnce({
      ...qb,
      order: vi.fn().mockReturnValue({
        ...qb,
        then: (resolve: (v: unknown) => void) =>
          Promise.resolve({ data: null, error: { message: 'fail' } }).then(resolve),
      }),
    });

    const result = await fetchBooksServer();

    expect(result).toEqual([]);
  });

  it('swallows exceptions and returns empty array', async () => {
    qb.select.mockReturnValueOnce({
      ...qb,
      order: vi.fn(() => { throw new Error('crash'); }),
    });

    const result = await fetchBooksServer();

    expect(result).toEqual([]);
  });
});

// ─── fetchProgressServer ──────────────────────────────────

describe('fetchProgressServer', () => {
  it('returns progress for a book', async () => {
    const progress = { id: 'p1', book_id: 'b1', percentage: 50 };
    qb.maybeSingle.mockResolvedValueOnce({ data: progress, error: null });

    const result = await fetchProgressServer('b1', 'u1');

    expect(result).toEqual(progress);
    expect(mockClient.from).toHaveBeenCalledWith('user_progress');
    expect(qb.eq).toHaveBeenCalledWith('book_id', 'b1');
    expect(qb.eq).toHaveBeenCalledWith('user_id', 'u1');
  });

  it('omits user_id filter when not provided', async () => {
    qb.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    await fetchProgressServer('b1');

    // eq called only once (for book_id)
    expect(qb.eq).toHaveBeenCalledTimes(1);
    expect(qb.eq).toHaveBeenCalledWith('book_id', 'b1');
  });

  it('returns null on error', async () => {
    qb.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: 'err' } });

    const result = await fetchProgressServer('b1');

    expect(result).toBeNull();
  });

  it('swallows exceptions and returns null', async () => {
    qb.maybeSingle.mockRejectedValueOnce(new Error('timeout'));

    const result = await fetchProgressServer('b1');

    expect(result).toBeNull();
  });
});
