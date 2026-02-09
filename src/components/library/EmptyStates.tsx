'use client';

import React from 'react';

export function EmptyLibraryIllustration({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 280 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Shelf */}
      <rect x="30" y="170" width="220" height="6" rx="3" fill="currentColor" opacity="0.15" />
      <rect x="20" y="176" width="240" height="4" rx="2" fill="currentColor" opacity="0.1" />

      {/* Book 1 - leaning left */}
      <g transform="rotate(-8, 80, 170)">
        <rect x="62" y="90" width="36" height="80" rx="3" fill="currentColor" opacity="0.08" stroke="currentColor" strokeOpacity="0.12" strokeWidth="1.5" />
        <line x1="68" y1="100" x2="92" y2="100" stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" />
        <line x1="68" y1="106" x2="86" y2="106" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
      </g>

      {/* Book 2 - upright */}
      <rect x="108" y="100" width="32" height="70" rx="3" fill="currentColor" opacity="0.06" stroke="currentColor" strokeOpacity="0.1" strokeWidth="1.5" strokeDasharray="4 3" />
      <text x="124" y="140" textAnchor="middle" fill="currentColor" opacity="0.12" fontSize="20" fontWeight="bold">?</text>

      {/* Book 3 - leaning right */}
      <g transform="rotate(6, 180, 170)">
        <rect x="162" y="95" width="36" height="75" rx="3" fill="currentColor" opacity="0.08" stroke="currentColor" strokeOpacity="0.12" strokeWidth="1.5" />
        <line x1="168" y1="105" x2="192" y2="105" stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" />
        <line x1="168" y1="111" x2="184" y2="111" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
      </g>

      {/* Sparkle decorations */}
      <circle cx="50" cy="60" r="2" fill="currentColor" opacity="0.15" />
      <circle cx="230" cy="70" r="1.5" fill="currentColor" opacity="0.12" />
      <circle cx="140" cy="40" r="2.5" fill="currentColor" opacity="0.1" />

      {/* Plus icon hint */}
      <g transform="translate(130, 50)">
        <circle cx="10" cy="10" r="14" fill="currentColor" opacity="0.06" stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" />
        <line x1="10" y1="4" x2="10" y2="16" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="4" y1="10" x2="16" y2="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function NoResultsIllustration({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 280 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Magnifying glass */}
      <circle
        cx="130"
        cy="95"
        r="45"
        fill="currentColor"
        opacity="0.04"
        stroke="currentColor"
        strokeOpacity="0.12"
        strokeWidth="2"
      />
      <circle
        cx="130"
        cy="95"
        r="35"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.08"
        strokeWidth="1"
        strokeDasharray="4 4"
      />
      {/* Handle */}
      <line
        x1="163"
        y1="128"
        x2="195"
        y2="160"
        stroke="currentColor"
        strokeOpacity="0.15"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* X in center */}
      <g transform="translate(130, 95)">
        <line x1="-10" y1="-10" x2="10" y2="10" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2" strokeLinecap="round" />
        <line x1="10" y1="-10" x2="-10" y2="10" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* Scattered dots */}
      <circle cx="60" cy="70" r="2" fill="currentColor" opacity="0.1" />
      <circle cx="210" cy="80" r="1.5" fill="currentColor" opacity="0.08" />
      <circle cx="80" cy="160" r="2" fill="currentColor" opacity="0.06" />
      <circle cx="200" cy="150" r="1.5" fill="currentColor" opacity="0.08" />
      <circle cx="140" cy="180" r="2" fill="currentColor" opacity="0.06" />
    </svg>
  );
}

export function EmptyCollectionIllustration({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 280 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Folder shape */}
      <path
        d="M50 80 L50 170 Q50 176 56 176 L224 176 Q230 176 230 170 L230 90 Q230 84 224 84 L150 84 L140 72 Q138 68 132 68 L56 68 Q50 68 50 74 Z"
        fill="currentColor"
        opacity="0.06"
        stroke="currentColor"
        strokeOpacity="0.1"
        strokeWidth="1.5"
      />
      {/* Folder tab */}
      <path
        d="M50 74 Q50 68 56 68 L132 68 Q138 68 140 72 L150 84"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.12"
        strokeWidth="1.5"
      />

      {/* Dashed outline inside - "drop here" area */}
      <rect
        x="70"
        y="100"
        width="140"
        height="60"
        rx="8"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.1"
        strokeWidth="1.5"
        strokeDasharray="6 4"
      />

      {/* Plus icon in center */}
      <g transform="translate(140, 130)">
        <line x1="0" y1="-10" x2="0" y2="10" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="-10" y1="0" x2="10" y2="0" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}
