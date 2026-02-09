import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Env helper ───────────────────────────────────────────

const ORIG_ENV = { ...process.env };

function setSupabaseEnv(url?: string, key?: string) {
  if (url) process.env.NEXT_PUBLIC_SUPABASE_URL = url;
  else delete process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (key) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = key;
  else delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ORIG_ENV };
});

afterEach(() => {
  process.env = ORIG_ENV;
});

// ─── isSupabaseConfigured / supabase / getSupabase ────────

describe('supabase module exports', () => {
  it('isSupabaseConfigured is false when env vars are missing', async () => {
    setSupabaseEnv(undefined, undefined);
    const { isSupabaseConfigured, supabase } = await import('@/lib/supabase');

    expect(isSupabaseConfigured).toBe(false);
    expect(supabase).toBeNull();
  });

  it('getSupabase throws when not configured', async () => {
    setSupabaseEnv(undefined, undefined);
    const { getSupabase } = await import('@/lib/supabase');

    expect(() => getSupabase()).toThrow('Supabase is not configured');
  });

  it('isSupabaseConfigured is true when env vars are set', async () => {
    setSupabaseEnv('https://test.supabase.co', 'anon-key-123');
    const { isSupabaseConfigured, supabase } = await import('@/lib/supabase');

    expect(isSupabaseConfigured).toBe(true);
    expect(supabase).not.toBeNull();
  });

  it('getSupabase returns client when configured', async () => {
    setSupabaseEnv('https://test.supabase.co', 'anon-key-123');
    const { getSupabase } = await import('@/lib/supabase');

    const client = getSupabase();
    expect(client).toBeDefined();
    expect(typeof client.from).toBe('function');
  });
});

// ─── getStorageUrl ────────────────────────────────────────

describe('getStorageUrl', () => {
  it('returns empty string with warning when not configured', async () => {
    setSupabaseEnv(undefined, undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { getStorageUrl } = await import('@/lib/supabase');

    const url = getStorageUrl('books', 'file.epub');

    expect(url).toBe('');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('not configured'));
    warn.mockRestore();
  });

  it('returns a public URL when configured', async () => {
    setSupabaseEnv('https://test.supabase.co', 'anon-key-123');
    const { getStorageUrl } = await import('@/lib/supabase');

    const url = getStorageUrl('books', 'file.epub');

    expect(url).toContain('file.epub');
    expect(typeof url).toBe('string');
  });
});

// ─── uploadFile ───────────────────────────────────────────

describe('uploadFile', () => {
  it('returns error when not configured', async () => {
    setSupabaseEnv(undefined, undefined);
    const { uploadFile } = await import('@/lib/supabase');

    const file = new File(['data'], 'test.epub');
    const { url, error } = await uploadFile('books', 'test.epub', file);

    expect(url).toBe('');
    expect(error!.message).toContain('not configured');
  });

  it('uploads file and returns public URL when configured', async () => {
    setSupabaseEnv('https://test.supabase.co', 'anon-key-123');
    const { uploadFile, supabase } = await import('@/lib/supabase');

    // Mock the storage upload
    const mockUpload = vi.fn().mockResolvedValue({
      data: { path: 'uploaded/test.epub' },
      error: null,
    });
    const mockGetPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: 'https://test.supabase.co/storage/v1/object/public/books/uploaded/test.epub' },
    });

    vi.spyOn(supabase!.storage, 'from').mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
    } as never);

    const file = new File(['data'], 'test.epub');
    const onProgress = vi.fn();
    const { url, error } = await uploadFile('books', 'test.epub', file, onProgress);

    expect(error).toBeNull();
    expect(url).toContain('test.epub');
    expect(mockUpload).toHaveBeenCalledWith('test.epub', file, {
      cacheControl: '3600',
      upsert: true,
    });
    expect(onProgress).toHaveBeenCalledWith(100);
  });

  it('returns error when storage upload fails', async () => {
    setSupabaseEnv('https://test.supabase.co', 'anon-key-123');
    const { uploadFile, supabase } = await import('@/lib/supabase');

    vi.spyOn(supabase!.storage, 'from').mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: null, error: { message: 'quota exceeded' } }),
    } as never);

    const file = new File(['data'], 'test.epub');
    const { url, error } = await uploadFile('books', 'test.epub', file);

    expect(url).toBe('');
    expect(error!.message).toBe('quota exceeded');
  });

  it('catches thrown exceptions during upload', async () => {
    setSupabaseEnv('https://test.supabase.co', 'anon-key-123');
    const { uploadFile, supabase } = await import('@/lib/supabase');

    vi.spyOn(supabase!.storage, 'from').mockReturnValue({
      upload: vi.fn().mockRejectedValue(new Error('network')),
    } as never);

    const file = new File(['data'], 'test.epub');
    const { url, error } = await uploadFile('books', 'test.epub', file);

    expect(url).toBe('');
    expect(error!.message).toBe('network');
  });
});

// ─── deleteFile ───────────────────────────────────────────

describe('deleteFile', () => {
  it('returns error when not configured', async () => {
    setSupabaseEnv(undefined, undefined);
    const { deleteFile } = await import('@/lib/supabase');

    const { error } = await deleteFile('books', 'file.epub');

    expect(error!.message).toContain('not configured');
  });

  it('deletes file from storage bucket', async () => {
    setSupabaseEnv('https://test.supabase.co', 'anon-key-123');
    const { deleteFile, supabase } = await import('@/lib/supabase');

    const mockRemove = vi.fn().mockResolvedValue({ data: null, error: null });
    vi.spyOn(supabase!.storage, 'from').mockReturnValue({
      remove: mockRemove,
    } as never);

    const { error } = await deleteFile('books', 'file.epub');

    expect(error).toBeNull();
    expect(mockRemove).toHaveBeenCalledWith(['file.epub']);
  });

  it('returns error when storage delete fails', async () => {
    setSupabaseEnv('https://test.supabase.co', 'anon-key-123');
    const { deleteFile, supabase } = await import('@/lib/supabase');

    vi.spyOn(supabase!.storage, 'from').mockReturnValue({
      remove: vi.fn().mockResolvedValue({ error: { message: 'not found' } }),
    } as never);

    const { error } = await deleteFile('books', 'missing.epub');

    expect(error!.message).toBe('not found');
  });

  it('catches thrown exceptions', async () => {
    setSupabaseEnv('https://test.supabase.co', 'anon-key-123');
    const { deleteFile, supabase } = await import('@/lib/supabase');

    vi.spyOn(supabase!.storage, 'from').mockReturnValue({
      remove: vi.fn().mockRejectedValue(new Error('crash')),
    } as never);

    const { error } = await deleteFile('books', 'file.epub');

    expect(error!.message).toBe('crash');
  });
});
