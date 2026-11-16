import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SafeImage } from '../components/SafeImage';
import { useAgency } from '../context/AgencyContext';
import { convertMoney, formatMoney } from '../lib/defaultData';

export function DestinationsPage() {
  const { destinations, currency } = useAgency();
  const navigate = useNavigate();
  const [regionFilter, setRegionFilter] = useState<'all' | 'international' | 'usa_featured' | 'domestic'>('all');

  const handleExplore = (code: string) => {
    const dep = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    const ret = new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10);
    const origin = code === 'DFW' ? 'JFK' : 'DFW';
    navigate(`/flights?tripType=round-trip&from=${origin}&to=${code}&dep=${dep}&ret=${ret}&adults=1&cabin=Economy`);
  };

  const visibleDestinations = destinations.filter((d) => {
    if (regionFilter === 'all') return true;
    return (d.region || 'international') === regionFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold text-[#FD8F1C] mb-2">Global Routes & Packages</p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#0F2942]">
          International & Domestic Destinations
        </h1>
        <p className="text-sm text-[#486581] mt-3 leading-relaxed">
          Explore flights, curated tour guides, and holiday packages across the Middle East, Europe, Southeast Asia, Top Destinations From USA, and Northern Pakistan.
        </p>
      </div>

      {/* Region Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: 'All Destinations' },
          { id: 'international', label: 'Popular International' },
          { id: 'usa_featured', label: 'Top From USA' },
          { id: 'domestic', label: 'Pakistan & Northern Valleys' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setRegionFilter(tab.id as any)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              regionFilter === tab.id
                ? 'bg-[#0F2942] text-white'
                : 'bg-white border border-[#D9E2EC] text-[#486581] hover:border-[#FD8F1C]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleDestinations.map((d) => {
          const slug = d.slug || d.name.toLowerCase().replace(/\s+/g, '-');
          return (
            <article key={d.destinationId} className="bg-white border border-[#D9E2EC] rounded-xl overflow-hidden flex flex-col">
              <Link to={`/destinations/${slug}`} className="aspect-[4/3] w-full bg-[#0F2942] block">
                <SafeImage src={d.imageUrl} alt={`${d.name}, ${d.country}`} code={d.airportCode} city={d.name} />
              </Link>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <Link to={`/destinations/${slug}`} className="text-lg font-bold text-[#0F2942] hover:text-[#FD8F1C]">
                      {d.name}
                    </Link>
                    <span className="font-mono text-xs font-semibold text-[#FD8F1C]">{d.airportCode}</span>
                  </div>
                  <p className="text-xs text-[#627D98]">{d.country}</p>
                  <p className="text-sm text-[#486581] mt-3 leading-relaxed">{d.description}</p>
                </div>
                <div className="mt-5 pt-4 border-t border-[#E6ECF2] flex items-center justify-between gap-2">
                  <span className="text-xs text-[#486581] tabular-nums">
                    {d.startingFare
                      ? `From ${formatMoney(convertMoney(d.startingFare, d.currency || 'USD', currency), currency)}`
                      : 'Custom Quote'}
                  </span>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/destinations/${slug}`}
                      className="px-3 py-2 rounded-lg border border-[#D9E2EC] text-xs font-semibold text-[#0F2942] hover:border-[#FD8F1C]"
                    >
                      Guide
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleExplore(d.airportCode)}
                      className="px-4 py-2 rounded-lg bg-[#FD8F1C] hover:bg-[#E07A0E] text-white text-xs font-semibold"
                    >
                      Explore Flights
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
