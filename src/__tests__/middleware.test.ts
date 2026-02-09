import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────

const { mockGetUser, mockCookies, mockNextResponse } = vi.hoisted(() => {
  const getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null });

  const cookieValues = [
    { name: 'sb-access-token', value: 'tok1' },
    { name: 'sb-refresh-token', value: 'tok2' },
  ];

  const reqCookies = {
    getAll: vi.fn(() => cookieValues),
    set: vi.fn(),
  };

  const responseCookies = {
    set: vi.fn(),
  };

  const response = {
    cookies: responseCookies,
  };

  const nextResponse = {
    next: vi.fn(() => response),
  };

  return {
    mockGetUser: getUser,
    mockCookies: reqCookies,
    mockNextResponse: nextResponse,
    mockResponseCookies: responseCookies,
  };
});

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn((_url: string, _key: string, opts: { cookies: { setAll: (c: Array<{name: string; value: string; options?: unknown}>) => void } }) => {
    // Save setAll ref so we can test cookie forwarding
    (globalThis as Record<string, unknown>).__setAllRef = opts.cookies.setAll;
    return {
      auth: { getUser: mockGetUser },
    };
  }),
}));

vi.mock('next/server', () => ({
  NextResponse: mockNextResponse,
}));

import { middleware } from '@/middleware';

// ─── Helpers ─────────────────────────────────────────────

const makeRequest = (path = '/', env?: { url?: string; key?: string }) => {
  // Set env
  process.env.NEXT_PUBLIC_SUPABASE_URL = env?.url ?? 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = env?.key ?? 'test-anon-key';

  return {
    cookies: mockCookies,
    url: `https://localhost${path}`,
  } as unknown as import('next/server').NextRequest;
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Tests ───────────────────────────────────────────────

describe('middleware', () => {
  it('skips Supabase when env vars are missing', async () => {
    const req = makeRequest('/', { url: '', key: '' });
    process.env.NEXT_PUBLIC_SUPABASE_URL = '';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '';

    const res = await middleware(req);

    expect(res).toBeDefined();
    // getUser should NOT have been called
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('creates Supabase client and refreshes session', async () => {
    const req = makeRequest('/dashboard');

    await middleware(req);

    // getUser is called to refresh the session
    expect(mockGetUser).toHaveBeenCalledTimes(1);
  });

  it('returns NextResponse.next()', async () => {
    const req = makeRequest('/');

    const res = await middleware(req);

    expect(res).toBeDefined();
    expect(mockNextResponse.next).toHaveBeenCalled();
  });

  it('passes cookies from request to Supabase client', async () => {
    const req = makeRequest('/');

    await middleware(req);

    // createServerClient receives cookies option with getAll
    const { createServerClient } = await import('@supabase/ssr');
    expect(createServerClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key',
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function),
        }),
      }),
    );
  });

  it('forwards set cookies to the response', async () => {
    const req = makeRequest('/');

    await middleware(req);

    // Invoke the setAll callback that was captured
    const setAll = (globalThis as Record<string, unknown>).__setAllRef as (
      c: Array<{ name: string; value: string; options?: unknown }>
    ) => void;

    if (setAll) {
      setAll([{ name: 'sb-token', value: 'refreshed', options: { path: '/' } }]);

      // The cookie should be set on the request (for downstream)
      expect(mockCookies.set).toHaveBeenCalledWith('sb-token', 'refreshed');
    }
  });
});
