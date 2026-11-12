import React from 'react';

/**
 * PALS mark: a shopping bag with a check, white on PayPal navy. One colour plus white, so it
 * reads cleanly at any size. Keep in sync with the favicon in index.html.
 */
export const LogoMark: React.FC<{ className?: string }> = ({ className = 'h-8 w-8' }) => (
  <svg viewBox="0 0 32 32" className={className} role="img" aria-label="PALS">
    <rect width="32" height="32" rx="8" fill="#003087" />
    <path d="M10.5 12.5h11l-.9 11.2a1.5 1.5 0 0 1-1.5 1.3h-6.2a1.5 1.5 0 0 1-1.5-1.3z" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M13 12.5V11a3 3 0 0 1 6 0v1.5" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    <path d="m13.4 18.6 1.9 1.9 3.4-3.6" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Logo: React.FC = () => (
  <span className="flex items-center gap-2">
    <LogoMark className="h-7 w-7" />
    <span className="text-lg font-bold tracking-tight text-[#003087] dark:text-white">PALS</span>
  </span>
);
