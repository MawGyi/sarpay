'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Collection } from '@/types/database';

const COLLECTIONS_KEY = 'applebook_collections';

function loadCollections(): Collection[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(COLLECTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCollections(collections: Collection[]) {
  localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(collections));
}

export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>([]);

  useEffect(() => {
    setCollections(loadCollections());
  }, []);

  const createCollection = useCallback((name: string, emoji: string = '📂') => {
    setCollections((prev) => {
      const next: Collection[] = [
        ...prev,
        {
          id: crypto.randomUUID(),
          name,
          emoji,
          bookIds: [],
          createdAt: new Date().toISOString(),
        },
      ];
      saveCollections(next);
      return next;
    });
  }, []);

  const deleteCollection = useCallback((id: string) => {
    setCollections((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveCollections(next);
      return next;
    });
  }, []);

  const renameCollection = useCallback((id: string, name: string, emoji?: string) => {
    setCollections((prev) => {
      const next = prev.map((c) =>
        c.id === id ? { ...c, name, ...(emoji !== undefined ? { emoji } : {}) } : c
      );
      saveCollections(next);
      return next;
    });
  }, []);

  const addBookToCollection = useCallback((collectionId: string, bookId: string) => {
    setCollections((prev) => {
      const next = prev.map((c) =>
        c.id === collectionId && !c.bookIds.includes(bookId)
          ? { ...c, bookIds: [...c.bookIds, bookId] }
          : c
      );
      saveCollections(next);
      return next;
    });
  }, []);

  const removeBookFromCollection = useCallback((collectionId: string, bookId: string) => {
    setCollections((prev) => {
      const next = prev.map((c) =>
        c.id === collectionId
          ? { ...c, bookIds: c.bookIds.filter((bid) => bid !== bookId) }
          : c
      );
      saveCollections(next);
      return next;
    });
  }, []);

  const getCollectionBookCount = useCallback(
    (collectionId: string) => {
      const col = collections.find((c) => c.id === collectionId);
      return col ? col.bookIds.length : 0;
    },
    [collections]
  );

  return {
    collections,
    createCollection,
    deleteCollection,
    renameCollection,
    addBookToCollection,
    removeBookFromCollection,
    getCollectionBookCount,
  };
}
