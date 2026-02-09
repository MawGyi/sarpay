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

  // Make select/insert/update/delete thenable
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
  fetchProgress,
  fetchAllProgress,
  upsertProgress,
  deleteProgress,
} from '@/lib/api/progress';

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── fetchProgress ────────────────────────────────────────

describe('fetchProgress', () => {
  it('returns progress when found', async () => {
    const row = { id: 'p1', book_id: 'b1', location: 'cfi', percentage: 50, updated_at: '2025-01-01' };
    qb.maybeSingle.mockResolvedValueOnce({ data: row, error: null });

    const { progress, error } = await fetchProgress('b1', 'u1');

    expect(error).toBeNull();
    expect(progress).toEqual(row);
    expect(mock.__mockClient.from).toHaveBeenCalledWith('user_progress');
    expect(qb.eq).toHaveBeenCalledWith('book_id', 'b1');
    expect(qb.eq).toHaveBeenCalledWith('user_id', 'u1');
  });

  it('omits user_id filter when userId is undefined', async () => {
    qb.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    await fetchProgress('b1');

    // eq called only for book_id (not user_id)
    expect(qb.eq).toHaveBeenCalledTimes(1);
    expect(qb.eq).toHaveBeenCalledWith('book_id', 'b1');
  });

  it('returns error when query fails', async () => {
    qb.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: 'db down' } });

    const { progress, error } = await fetchProgress('b1');

    expect(progress).toBeNull();
    expect(error).toBeInstanceOf(Error);
    expect(error!.message).toBe('db down');
  });

  it('catches thrown exceptions', async () => {
    qb.maybeSingle.mockRejectedValueOnce(new Error('network'));

    const { progress, error } = await fetchProgress('b1');

    expect(progress).toBeNull();
    expect(error!.message).toBe('network');
  });

});

// ─── fetchAllProgress ─────────────────────────────────────

describe('fetchAllProgress', () => {
  it('returns array of progress rows', async () => {
    const rows = [{ id: 'p1' }, { id: 'p2' }];
    const customThen = (resolve: (v: unknown) => void) =>
      Promise.resolve({ data: rows, error: null }).then(resolve);
    qb.select.mockReturnValueOnce({
      ...qb,
      eq: vi.fn().mockReturnValue({ ...qb, then: customThen }),
      then: customThen,
    });

    const { progress, error } = await fetchAllProgress('u1');

    expect(error).toBeNull();
    expect(progress).toEqual(rows);
  });

  it('filters by userId when provided', async () => {
    const eqFn = vi.fn().mockReturnValue({
      ...qb,
      then: (resolve: (v: unknown) => void) =>
        Promise.resolve({ data: [], error: null }).then(resolve),
    });
    qb.select.mockReturnValueOnce({
      ...qb,
      eq: eqFn,
      then: (resolve: (v: unknown) => void) =>
        Promise.resolve({ data: [], error: null }).then(resolve),
    });

    await fetchAllProgress('u1');

    expect(eqFn).toHaveBeenCalledWith('user_id', 'u1');
  });


});

// ─── upsertProgress ──────────────────────────────────────

describe('upsertProgress', () => {
  const progressData = {
    location: 'epubcfi(/6/2)',
    percentage: 42,
    currentLocation: 10,
    totalLocations: 24,
  };

  it('inserts when no existing record found', async () => {
    // First call: maybeSingle for existence check → no record
    qb.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    // Second call: insert → single returns row
    const inserted = { id: 'new', ...progressData };
    qb.single.mockResolvedValueOnce({ data: inserted, error: null });

    const { progress, error } = await upsertProgress('b1', progressData, 'u1');

    expect(error).toBeNull();
    expect(progress).toEqual(inserted);
    expect(qb.insert).toHaveBeenCalled();
    expect(qb.update).not.toHaveBeenCalled();
  });

  it('updates when existing record found', async () => {
    // Existence check returns existing
    qb.maybeSingle.mockResolvedValueOnce({ data: { id: 'existing-id' }, error: null });
    // Update returns updated row
    const updated = { id: 'existing-id', ...progressData };
    qb.single.mockResolvedValueOnce({ data: updated, error: null });

    const { progress, error } = await upsertProgress('b1', progressData, 'u1');

    expect(error).toBeNull();
    expect(progress).toEqual(updated);
    expect(qb.update).toHaveBeenCalled();
  });

  it('uses is(user_id, null) when userId not provided', async () => {
    qb.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    qb.single.mockResolvedValueOnce({ data: { id: 'x' }, error: null });

    await upsertProgress('b1', progressData);

    expect(qb.is).toHaveBeenCalledWith('user_id', null);
  });

  it('returns error when insert/update fails', async () => {
    qb.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    qb.single.mockResolvedValueOnce({ data: null, error: { message: 'insert failed' } });

    const { progress, error } = await upsertProgress('b1', progressData);

    expect(progress).toBeNull();
    expect(error!.message).toBe('insert failed');
  });

  it('catches exceptions', async () => {
    qb.maybeSingle.mockRejectedValueOnce(new Error('boom'));

    const { error } = await upsertProgress('b1', progressData);

    expect(error!.message).toBe('boom');
  });

});

// ─── deleteProgress ───────────────────────────────────────

describe('deleteProgress', () => {
  it('deletes with book_id and user_id filters', async () => {
    // delete returns thenable
    qb.delete.mockReturnValueOnce({
      ...qb,
      eq: qb.eq,
      then: (resolve: (v: unknown) => void) =>
        Promise.resolve({ error: null }).then(resolve),
    });

    const { error } = await deleteProgress('b1', 'u1');

    expect(error).toBeNull();
    expect(mock.__mockClient.from).toHaveBeenCalledWith('user_progress');
    expect(qb.eq).toHaveBeenCalledWith('book_id', 'b1');
    expect(qb.eq).toHaveBeenCalledWith('user_id', 'u1');
  });

  it('returns error on query failure', async () => {
    const errorThen = (resolve: (v: unknown) => void) =>
      Promise.resolve({ error: { message: 'forbidden' } }).then(resolve);
    qb.delete.mockReturnValueOnce({
      ...qb,
      eq: vi.fn().mockReturnValue({ ...qb, then: errorThen }),
      then: errorThen,
    });

    const { error } = await deleteProgress('b1');

    expect(error!.message).toBe('forbidden');
  });

  it('catches exceptions', async () => {
    qb.delete.mockReturnValueOnce({
      ...qb,
      eq: vi.fn(() => { throw new Error('crash'); }),
    });

    const { error } = await deleteProgress('b1');

    expect(error!.message).toBe('crash');
  });
});
