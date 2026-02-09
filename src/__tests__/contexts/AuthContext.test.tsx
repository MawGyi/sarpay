import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ─── Mocks ───────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({
  createSupabaseBrowser: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
      onAuthStateChange: mockOnAuthStateChange,
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
    },
  })),
}));

import { AuthProvider, useAuth } from '@/contexts/AuthContext';

// ─── Helpers ─────────────────────────────────────────────

function TestConsumer() {
  const { user, isAdmin, isLoading, signIn, signOut } = useAuth();
  return (
    <div>
      <div data-testid="loading">{String(isLoading)}</div>
      <div data-testid="isAdmin">{String(isAdmin)}</div>
      <div data-testid="email">{user?.email ?? 'none'}</div>
      <button onClick={() => signIn('admin@test.com', 'pass')}>Sign In</button>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
}

// ─── Tests ───────────────────────────────────────────────

describe('AuthContext', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    // Reset env
    delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_ADMIN_EMAIL;
  });

  it('starts with loading=true, then resolves to no user', async () => {
    const { getByTestId } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // After initial load completes
    await act(async () => {
      await Promise.resolve();
    });

    expect(getByTestId('loading').textContent).toBe('false');
    expect(getByTestId('email').textContent).toBe('none');
    expect(getByTestId('isAdmin').textContent).toBe('false');
  });

  it('identifies admin user when email matches env var', async () => {
    process.env.NEXT_PUBLIC_ADMIN_EMAIL = 'admin@test.com';
    mockGetUser.mockResolvedValue({
      data: { user: { id: '1', email: 'admin@test.com' } },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId('isAdmin').textContent).toBe('true');
    expect(screen.getByTestId('email').textContent).toBe('admin@test.com');
  });

  it('non-admin user when email does not match', async () => {
    process.env.NEXT_PUBLIC_ADMIN_EMAIL = 'admin@test.com';
    mockGetUser.mockResolvedValue({
      data: { user: { id: '2', email: 'reader@test.com' } },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId('isAdmin').textContent).toBe('false');
  });

  it('calls signInWithPassword on signIn', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });

    await userEvent.setup().click(screen.getByText('Sign In'));
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'admin@test.com',
      password: 'pass',
    });
  });

  it('calls supabase signOut on signOut', async () => {
    mockSignOut.mockResolvedValue({});

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });

    await userEvent.setup().click(screen.getByText('Sign Out'));
    expect(mockSignOut).toHaveBeenCalled();
  });
});
