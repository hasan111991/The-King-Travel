import React, { useEffect, useState } from 'react';
import { useAgency } from '../context/AgencyContext';

interface BrandLogoProps {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md';
}

export function BrandLogo({ variant = 'dark', size = 'md' }: BrandLogoProps) {
  const { settings } = useAgency();
  const [imgFailed, setImgFailed] = useState(false);
  const logoSrc = settings.logoUrl?.trim() || `${import.meta.env.BASE_URL}official-logo.png`;
  const agencyLabel = settings.agencyName?.trim() || 'The King Travel';

  useEffect(() => {
    setImgFailed(false);
  }, [logoSrc]);

  const textColor = variant === 'light' ? 'text-white' : 'text-[#0F2942]';
  const imgHeight = size === 'sm' ? 'h-9' : 'h-11';
  const textSize = size === 'sm' ? 'text-lg' : 'text-xl';

  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 select-none">
      {!imgFailed ? (
        <span
          className={`inline-flex items-center justify-center rounded-lg overflow-hidden shrink-0 ${
            variant === 'light' ? 'bg-white px-1.5 py-0.5' : ''
          }`}
        >
          <img
            src={logoSrc}
            alt={`${agencyLabel} Official Logo`}
            onError={() => setImgFailed(true)}
            className={`${imgHeight} w-auto object-contain`}
          />
        </span>
      ) : (
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={size === 'sm' ? 'w-8 h-8 shrink-0' : 'w-9 h-9 shrink-0'}
          aria-hidden="true"
        >
          <rect
            width="40"
            height="40"
            rx="10"
            fill={variant === 'light' ? '#1E3A5F' : '#0F2942'}
          />
          <path d="M10 17L13.5 11L20 15.5L26.5 11L30 17H10Z" fill="#FD8F1C" />
          <rect x="10" y="18.5" width="20" height="2" rx="1" fill="#FD8F1C" />
          <path
            d="M9 27.5L18.5 25L23.5 20.5L25.5 21L22.5 25L29 24L31 25.8L22.5 27.8L19.5 31.5L17.5 31L18.8 28L11.5 29.2L9 27.5Z"
            fill="#FFFFFF"
          />
        </svg>
      )}
      <span className={`font-display font-bold tracking-tight ${textSize} ${textColor}`}>
        {agencyLabel}
      </span>
    </span>
  );
}
