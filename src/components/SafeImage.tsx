import React, { useState } from 'react';
import { Plane } from 'lucide-react';

interface SafeImageProps {
  src?: string;
  alt: string;
  code?: string;
  city?: string;
  className?: string;
}

export function SafeImage({ src, alt, code, city, className = 'w-full h-full object-cover' }: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className="w-full h-full bg-gradient-to-br from-[#102A43] via-[#1C3D5A] to-[#168AAD] flex flex-col justify-between p-5 text-white relative overflow-hidden"
        role="img"
        aria-label={alt}
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs tracking-widest text-[#D4AF37] font-semibold">
            {code || 'INTL'}
          </span>
          <Plane className="w-4 h-4 text-white/70" aria-hidden="true" />
        </div>
        {/* Minimalist horizon line motif */}
        <svg
          viewBox="0 0 200 60"
          className="w-full h-14 opacity-25 my-auto"
          fill="none"
          aria-hidden="true"
        >
          <path d="M0 50 Q60 20 120 42 T200 28" stroke="#D4AF37" strokeWidth="1.5" />
          <path d="M0 56 H200" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="3 3" />
        </svg>
        <div>
          <p className="font-display text-lg font-semibold leading-tight text-white">
            {city || alt}
          </p>
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
