'use client';

import Image from 'next/image';
import { useState } from 'react';

interface BookCoverProps {
  src?: string;
  alt: string;
  /** CSS class for the wrapping div */
  className?: string;
  /** Gradient fallback class name (e.g., 'from-blue-600 to-purple-600') */
  gradientClass?: string;
  /** Priority loading (above the fold) */
  priority?: boolean;
  /** Title text shown on fallback cover */
  fallbackTitle?: string;
  /** Fill container (default true) */
  fill?: boolean;
  /** Fixed width/height (alternative to fill) */
  width?: number;
  height?: number;
}

/**
 * Optimized book cover image with automatic WebP/AVIF conversion,
 * lazy loading, and graceful gradient fallback.
 */
export function BookCover({
  src,
  alt,
  className = '',
  gradientClass = 'from-blue-600 to-purple-600',
  priority = false,
  fallbackTitle,
  fill = true,
  width,
  height,
}: BookCoverProps) {
  const [hasError, setHasError] = useState(false);

  // Show gradient fallback when no src or image fails to load
  if (!src || hasError) {
    return (
      <div
        className={`bg-gradient-to-br ${gradientClass} flex flex-col items-center justify-center p-5 relative ${className}`}
      >
        {/* Faux spine detail */}
        <div className="absolute left-3 top-6 bottom-6 w-px bg-white/10" />
        {fallbackTitle && (
          <h3 className="text-white/90 font-serif font-semibold text-center text-base leading-snug line-clamp-3 pl-3">
            {fallbackTitle}
          </h3>
        )}
      </div>
    );
  }

  // Use next/image for optimized loading
  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={`object-cover ${className}`}
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
        priority={priority}
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width || 200}
      height={height || 300}
      className={`object-cover ${className}`}
      priority={priority}
      onError={() => setHasError(true)}
    />
  );
}
