import { vi } from 'vitest';

/**
 * Default mock for AuthContext — returns guest (non-admin) by default.
 * Tests can override via vi.mocked(useAuth).mockReturnValue(...)
 */
export const mockSignIn = vi.fn().mockResolvedValue({ error: null });
export const mockSignOut = vi.fn().mockResolvedValue(undefined);

export const useAuth = vi.fn().mockReturnValue({
  user: null,
  isAdmin: false,
  isLoading: false,
  signIn: mockSignIn,
  signOut: mockSignOut,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return children;
}
