import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Plane, Search, X } from 'lucide-react';
import { AIRLINES } from '../lib/airlines';

interface AirlineSelectorProps {
  value: string;
  onChange: (airline: string) => void;
  id?: string;
}

export function AirlineSelector({ value, onChange, id = 'preferred-airline' }: AirlineSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const filteredAirlines = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return AIRLINES;
    return AIRLINES.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q) ||
        a.country.toLowerCase().includes(q)
    );
  }, [search]);

  const handleSelect = (label: string) => {
    onChange(label);
    setSearch('');
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        id={id}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg border border-[#D9E2EC] bg-[#F9F9FA] hover:bg-white text-left text-sm font-medium text-[#0F2942] focus:outline-none focus:border-[#FD8F1C]"
      >
        <span className="inline-flex items-center gap-2 min-w-0">
          <Plane className="w-4 h-4 text-[#FD8F1C] shrink-0" aria-hidden="true" />
          <span className="truncate">{value || 'Any Airline'}</span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-[#627D98] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1.5 bg-white border border-[#D9E2EC] rounded-xl shadow-xl z-40 overflow-hidden">
          <div className="p-2.5 border-b border-[#E6ECF2] bg-[#F9F9FA]">
            <div className="relative">
              <Search
                className="w-3.5 h-3.5 text-[#627D98] absolute left-3 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search airline or code (e.g. Emirates, EK, Delta)..."
                className="w-full pl-8 pr-8 py-2 rounded-lg border border-[#D9E2EC] bg-white text-xs text-[#0F2942] focus:outline-none focus:border-[#FD8F1C]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear airline search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#627D98] hover:text-[#0F2942]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <ul role="listbox" className="max-h-64 overflow-y-auto divide-y divide-[#F0F4F8]">
            {filteredAirlines.map((airline) => {
              const displayLabel =
                airline.code === 'ANY' ? 'Any Airline' : `${airline.name} (${airline.code})`;
              const isSelected = value === displayLabel || (airline.code === 'ANY' && !value);
              return (
                <li key={airline.code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(displayLabel)}
                    className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs hover:bg-[#F0F4F8] transition-colors ${
                      isSelected ? 'bg-[#FFF5EA] text-[#0F2942] font-semibold' : 'text-[#243B53]'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-[#0F2942] truncate">{airline.name}</p>
                      <p className="text-[11px] text-[#627D98] truncate">{airline.country}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-[11px] font-semibold text-[#FD8F1C]">
                        {airline.code}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#FD8F1C]" />}
                    </div>
                  </button>
                </li>
              );
            })}

            {search.trim().length >= 2 && (
              <li>
                <button
                  type="button"
                  onClick={() => handleSelect(search.trim())}
                  className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-[#168AAD] hover:bg-[#F0F4F8]"
                >
                  Use custom preference: &ldquo;{search.trim()}&rdquo;
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
