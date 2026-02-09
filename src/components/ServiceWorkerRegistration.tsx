'use client';

import { useEffect } from 'react';

/**
 * Register the service worker for PWA support.
 * Renders nothing — just a side-effect component.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('SW registered:', reg.scope);
        })
        .catch((err) => {
          console.warn('SW registration failed:', err);
        });
    }
  }, []);

  return null;
}
