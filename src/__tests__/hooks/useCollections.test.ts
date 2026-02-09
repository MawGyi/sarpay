import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCollections } from '@/hooks/useCollections';

beforeEach(() => {
  localStorage.clear();
  (localStorage.getItem as ReturnType<typeof vi.fn>).mockClear();
  (localStorage.setItem as ReturnType<typeof vi.fn>).mockClear();
});

const COLLECTIONS_KEY = 'sarpay_collections';

describe('useCollections', () => {
  // ─── Create ──────────────────────────────────────────────

  describe('createCollection', () => {
    it('creates a collection with name and default emoji', () => {
      const { result } = renderHook(() => useCollections());

      act(() => {
        result.current.createCollection('Fiction');
      });

      expect(result.current.collections).toHaveLength(1);
      expect(result.current.collections[0]).toMatchObject({
        name: 'Fiction',
        emoji: '📂',
        bookIds: [],
      });
      expect(result.current.collections[0].id).toBeDefined();
      expect(result.current.collections[0].createdAt).toBeDefined();
    });

    it('creates a collection with custom emoji', () => {
      const { result } = renderHook(() => useCollections());

      act(() => {
        result.current.createCollection('Sci-Fi', '🚀');
      });

      expect(result.current.collections[0].emoji).toBe('🚀');
    });

    it('persists to localStorage', () => {
      const { result } = renderHook(() => useCollections());

      act(() => {
        result.current.createCollection('Shelf');
      });

      const stored = JSON.parse(localStorage.getItem(COLLECTIONS_KEY)!);
      expect(stored).toHaveLength(1);
      expect(stored[0].name).toBe('Shelf');
    });

    it('appends to existing collections', () => {
      const { result } = renderHook(() => useCollections());

      act(() => {
        result.current.createCollection('A');
      });
      act(() => {
        result.current.createCollection('B');
      });

      expect(result.current.collections).toHaveLength(2);
      expect(result.current.collections.map((c) => c.name)).toEqual(['A', 'B']);
    });
  });

  // ─── Read / Load ─────────────────────────────────────────

  describe('load from localStorage', () => {
    it('loads existing collections on mount', () => {
      const existing = [
        { id: '1', name: 'Old', emoji: '📚', bookIds: ['b1'], createdAt: '2024-01-01' },
      ];
      localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(existing));

      const { result } = renderHook(() => useCollections());

      expect(result.current.collections).toHaveLength(1);
      expect(result.current.collections[0].name).toBe('Old');
    });

    it('returns empty array when localStorage is empty', () => {
      const { result } = renderHook(() => useCollections());
      expect(result.current.collections).toEqual([]);
    });

    it('returns empty array when localStorage has invalid JSON', () => {
      localStorage.setItem(COLLECTIONS_KEY, 'not-json');
      const { result } = renderHook(() => useCollections());
      expect(result.current.collections).toEqual([]);
    });
  });

  // ─── Delete ──────────────────────────────────────────────

  describe('deleteCollection', () => {
    it('removes a collection by id', () => {
      const seed = [
        { id: 'c1', name: 'A', emoji: '📂', bookIds: [], createdAt: '2024-01-01' },
        { id: 'c2', name: 'B', emoji: '📂', bookIds: [], createdAt: '2024-01-01' },
      ];
      localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(seed));

      const { result } = renderHook(() => useCollections());

      act(() => {
        result.current.deleteCollection('c1');
      });

      expect(result.current.collections).toHaveLength(1);
      expect(result.current.collections[0].id).toBe('c2');
    });

    it('persists deletion to localStorage', () => {
      const seed = [
        { id: 'c1', name: 'A', emoji: '📂', bookIds: [], createdAt: '2024-01-01' },
      ];
      localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(seed));

      const { result } = renderHook(() => useCollections());

      act(() => {
        result.current.deleteCollection('c1');
      });

      const stored = JSON.parse(localStorage.getItem(COLLECTIONS_KEY)!);
      expect(stored).toHaveLength(0);
    });

    it('no-ops if id does not exist', () => {
      const { result } = renderHook(() => useCollections());

      act(() => {
        result.current.createCollection('Keep');
      });

      act(() => {
        result.current.deleteCollection('nonexistent');
      });

      expect(result.current.collections).toHaveLength(1);
    });
  });

  // ─── Rename / Update ────────────────────────────────────

  describe('renameCollection', () => {
    it('renames a collection', () => {
      const seed = [
        { id: 'c1', name: 'Old', emoji: '📂', bookIds: [], createdAt: '2024-01-01' },
      ];
      localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(seed));

      const { result } = renderHook(() => useCollections());

      act(() => {
        result.current.renameCollection('c1', 'New');
      });

      expect(result.current.collections[0].name).toBe('New');
      expect(result.current.collections[0].emoji).toBe('📂'); // unchanged
    });

    it('renames and updates emoji when provided', () => {
      const seed = [
        { id: 'c1', name: 'Old', emoji: '📂', bookIds: [], createdAt: '2024-01-01' },
      ];
      localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(seed));

      const { result } = renderHook(() => useCollections());

      act(() => {
        result.current.renameCollection('c1', 'New', '🎉');
      });

      expect(result.current.collections[0].name).toBe('New');
      expect(result.current.collections[0].emoji).toBe('🎉');
    });

    it('persists rename to localStorage', () => {
      const seed = [
        { id: 'c1', name: 'Old', emoji: '📂', bookIds: [], createdAt: '2024-01-01' },
      ];
      localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(seed));

      const { result } = renderHook(() => useCollections());

      act(() => {
        result.current.renameCollection('c1', 'Renamed');
      });

      const stored = JSON.parse(localStorage.getItem(COLLECTIONS_KEY)!);
      expect(stored[0].name).toBe('Renamed');
    });
  });

  // ─── Add book to collection ─────────────────────────────

  describe('addBookToCollection', () => {
    it('adds a book id to the collection', () => {
      const seed = [
        { id: 'c1', name: 'Shelf', emoji: '📂', bookIds: [], createdAt: '2024-01-01' },
      ];
      localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(seed));

      const { result } = renderHook(() => useCollections());

      act(() => {
        result.current.addBookToCollection('c1', 'book-1');
      });

      expect(result.current.collections[0].bookIds).toEqual(['book-1']);
    });

    it('does not duplicate a book already in the collection', () => {
      const seed = [
        { id: 'c1', name: 'Shelf', emoji: '📂', bookIds: ['book-1'], createdAt: '2024-01-01' },
      ];
      localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(seed));

      const { result } = renderHook(() => useCollections());

      act(() => {
        result.current.addBookToCollection('c1', 'book-1');
      });

      expect(result.current.collections[0].bookIds).toEqual(['book-1']);
    });

    it('adds multiple books', () => {
      const seed = [
        { id: 'c1', name: 'Shelf', emoji: '📂', bookIds: [], createdAt: '2024-01-01' },
      ];
      localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(seed));

      const { result } = renderHook(() => useCollections());

      act(() => {
        result.current.addBookToCollection('c1', 'book-1');
      });
      act(() => {
        result.current.addBookToCollection('c1', 'book-2');
      });

      expect(result.current.collections[0].bookIds).toEqual(['book-1', 'book-2']);
    });
  });

  // ─── Remove book from collection ────────────────────────

  describe('removeBookFromCollection', () => {
    it('removes a book from the collection', () => {
      const seed = [
        { id: 'c1', name: 'Shelf', emoji: '📂', bookIds: ['book-1', 'book-2'], createdAt: '2024-01-01' },
      ];
      localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(seed));

      const { result } = renderHook(() => useCollections());

      act(() => {
        result.current.removeBookFromCollection('c1', 'book-1');
      });

      expect(result.current.collections[0].bookIds).toEqual(['book-2']);
    });

    it('persists removal to localStorage', () => {
      const seed = [
        { id: 'c1', name: 'Shelf', emoji: '📂', bookIds: ['book-1'], createdAt: '2024-01-01' },
      ];
      localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(seed));

      const { result } = renderHook(() => useCollections());

      act(() => {
        result.current.removeBookFromCollection('c1', 'book-1');
      });

      const stored = JSON.parse(localStorage.getItem(COLLECTIONS_KEY)!);
      expect(stored[0].bookIds).toEqual([]);
    });

    it('no-ops if book is not in the collection', () => {
      const seed = [
        { id: 'c1', name: 'Shelf', emoji: '📂', bookIds: ['book-1'], createdAt: '2024-01-01' },
      ];
      localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(seed));

      const { result } = renderHook(() => useCollections());

      act(() => {
        result.current.removeBookFromCollection('c1', 'nonexistent');
      });

      expect(result.current.collections[0].bookIds).toEqual(['book-1']);
    });
  });

  // ─── getCollectionBookCount ─────────────────────────────

  describe('getCollectionBookCount', () => {
    it('returns the number of books in a collection', () => {
      const seed = [
        { id: 'c1', name: 'Shelf', emoji: '📂', bookIds: ['b1', 'b2', 'b3'], createdAt: '2024-01-01' },
      ];
      localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(seed));

      const { result } = renderHook(() => useCollections());

      expect(result.current.getCollectionBookCount('c1')).toBe(3);
    });

    it('returns 0 for nonexistent collection', () => {
      const { result } = renderHook(() => useCollections());
      expect(result.current.getCollectionBookCount('nope')).toBe(0);
    });

    it('returns 0 for empty collection', () => {
      const seed = [
        { id: 'c1', name: 'Empty', emoji: '📂', bookIds: [], createdAt: '2024-01-01' },
      ];
      localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(seed));

      const { result } = renderHook(() => useCollections());

      expect(result.current.getCollectionBookCount('c1')).toBe(0);
    });
  });
});
