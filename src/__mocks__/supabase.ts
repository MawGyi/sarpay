/**
 * Shared Supabase mock factory
 *
 * Usage:
 *   import { createMockSupabaseClient, mockSupabaseModule } from '@/__mocks__/supabase';
 *
 *   vi.mock('@/lib/supabase', () => mockSupabaseModule());
 *   // or for fine-grained control:
 *   const client = createMockSupabaseClient();
 */

import { vi } from 'vitest';

/**
 * Creates a chainable mock Supabase client that mirrors the query builder pattern.
 * Each query method returns `this` so calls can be chained, and terminal methods
 * resolve to `{ data: null, error: null }` by default.
 */
export function createMockSupabaseClient() {
  const storage = {
    upload: vi.fn().mockResolvedValue({ data: { path: 'mock-path' }, error: null }),
    remove: vi.fn().mockResolvedValue({ data: null, error: null }),
    getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://mock.supabase.co/storage/mock-path' } }),
    download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
  };

  const queryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};

  // Terminal methods — these return the final result
  const terminalResult = { data: null, error: null };
  const terminalMethods = ['single', 'maybeSingle', 'csv', 'then'] as const;

  // Chainable methods — these return the builder for further chaining
  const chainableMethods = [
    'select', 'insert', 'update', 'upsert', 'delete',
    'eq', 'neq', 'gt', 'lt', 'gte', 'lte',
    'like', 'ilike', 'in', 'is', 'not',
    'or', 'and', 'filter',
    'order', 'limit', 'range', 'count',
    'match', 'contains', 'containedBy', 'overlaps',
    'textSearch',
  ] as const;

  // Build the query builder with chainable methods
  for (const method of chainableMethods) {
    queryBuilder[method] = vi.fn().mockReturnValue(queryBuilder);
  }

  // Terminal methods resolve to data
  for (const method of terminalMethods) {
    queryBuilder[method] = vi.fn().mockResolvedValue(terminalResult);
  }

  // Make the query builder itself thenable (for `await supabase.from('x').select()`)
  queryBuilder['then'] = vi.fn((resolve: (val: typeof terminalResult) => void) => {
    return Promise.resolve(terminalResult).then(resolve);
  });

  // Override select to be both chainable AND thenable
  const originalSelect = queryBuilder['select'];
  queryBuilder['select'] = vi.fn((...args: unknown[]) => {
    originalSelect(...args);
    return {
      ...queryBuilder,
      then: (resolve: (val: typeof terminalResult) => void) =>
        Promise.resolve(terminalResult).then(resolve),
    };
  });

  // Override insert/update/delete to be thenable too
  for (const method of ['insert', 'update', 'upsert', 'delete'] as const) {
    const original = queryBuilder[method];
    queryBuilder[method] = vi.fn((...args: unknown[]) => {
      original(...args);
      return {
        ...queryBuilder,
        then: (resolve: (val: typeof terminalResult) => void) =>
          Promise.resolve(terminalResult).then(resolve),
      };
    });
  }

  const client = {
    from: vi.fn(() => queryBuilder),
    storage: {
      from: vi.fn(() => storage),
    },
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithOtp: vi.fn().mockResolvedValue({ data: null, error: null }),
      signInWithOAuth: vi.fn().mockResolvedValue({ data: null, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    // Expose internals for assertions
    _queryBuilder: queryBuilder,
    _storage: storage,
  };

  return client;
}

/**
 * Returns a mock module shape for `vi.mock('@/lib/supabase', () => mockSupabaseModule())`
 */
export function mockSupabaseModule(overrides?: { isConfigured?: boolean }) {
  const client = createMockSupabaseClient();
  const isConfigured = overrides?.isConfigured ?? true;

  return {
    isSupabaseConfigured: isConfigured,
    supabase: isConfigured ? client : null,
    getSupabase: vi.fn(() => {
      if (!isConfigured) throw new Error('Supabase is not configured');
      return client;
    }),
    getStorageUrl: vi.fn((_bucket: string, path: string) =>
      `https://mock.supabase.co/storage/${path}`
    ),
    uploadFile: vi.fn().mockResolvedValue({ url: 'https://mock.supabase.co/storage/mock-path', error: null }),
    deleteFile: vi.fn().mockResolvedValue({ error: null }),
    __mockClient: client,
  };
}
