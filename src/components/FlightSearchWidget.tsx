import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  Building2,
  Calendar,
  Compass,
  MapPin,
  Plane,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import type { CabinClass, TripType } from '../types/travel';

interface AirportOption {
  code: string;
  city: string;
  name: string;
  country: string;
}

type SearchServiceTab = 'flights' | 'hotels' | 'packages' | 'hajj-umrah';

interface FlightSearchWidgetProps {
  initialOrigin?: string;
  initialDestination?: string;
  initialDepartureDate?: string;
  initialReturnDate?: string;
  initialTripType?: TripType;
  initialAdults?: number;
  initialChildren?: number;
  initialInfants?: number;
  initialCabin?: CabinClass;
  compact?: boolean;
  showServiceTabs?: boolean;
}

const DEFAULT_AIRPORTS: AirportOption[] = [
  { code: 'DFW', city: 'Dallas', name: 'Dallas Fort Worth International Airport', country: 'USA' },
  { code: 'JFK', city: 'New York', name: 'John F. Kennedy International Airport', country: 'USA' },
  { code: 'IAD', city: 'Washington D.C.', name: 'Washington Dulles International Airport', country: 'USA' },
  { code: 'DXB', city: 'Dubai', name: 'Dubai International Airport', country: 'UAE' },
  { code: 'JED', city: 'Jeddah', name: 'King Abdulaziz International Airport', country: 'Saudi Arabia' },
  { code: 'IST', city: 'Istanbul', name: 'Istanbul Airport', country: 'Turkey' },
  { code: 'LHR', city: 'London', name: 'London Heathrow Airport', country: 'UK' },
  { code: 'CDG', city: 'Paris', name: 'Charles de Gaulle Airport', country: 'France' },
  { code: 'FCO', city: 'Rome', name: 'Fiumicino Airport', country: 'Italy' },
  { code: 'ATH', city: 'Athens', name: 'Athens International Airport', country: 'Greece' },
  { code: 'GRU', city: 'Sao Paulo', name: 'Guarulhos International Airport', country: 'Brazil' },
  { code: 'MLE', city: 'Male', name: 'Velana International Airport', country: 'Maldives' },
  { code: 'KUL', city: 'Kuala Lumpur', name: 'Kuala Lumpur International Airport', country: 'Malaysia' },
  { code: 'SIN', city: 'Singapore', name: 'Changi Airport', country: 'Singapore' },
  { code: 'ISB', city: 'Islamabad', name: 'Islamabad International Airport', country: 'Pakistan' },
  { code: 'LHE', city: 'Lahore', name: 'Allama Iqbal International Airport', country: 'Pakistan' },
  { code: 'KHI', city: 'Karachi', name: 'Jinnah International Airport', country: 'Pakistan' },
];

function getDefaultDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

export function FlightSearchWidget({
  initialOrigin = 'DFW',
  initialDestination = 'DXB',
  initialDepartureDate = getDefaultDate(14),
  initialReturnDate = getDefaultDate(21),
  initialTripType = 'round-trip',
  initialAdults = 1,
  initialChildren = 0,
  initialInfants = 0,
  initialCabin = 'Economy',
  compact = false,
  showServiceTabs = !compact,
}: FlightSearchWidgetProps) {
  const navigate = useNavigate();
  const [serviceTab, setServiceTab] = useState<SearchServiceTab>('flights');

  // Flight search state
  const [tripType, setTripType] = useState<TripType>(initialTripType);
  const [originInput, setOriginInput] = useState(initialOrigin);
  const [destInput, setDestInput] = useState(initialDestination);
  const [departureDate, setDepartureDate] = useState(initialDepartureDate);
  const [returnDate, setReturnDate] = useState(initialReturnDate);
  const [adults, setAdults] = useState(initialAdults);
  const [children, setChildren] = useState(initialChildren);
  const [infants, setInfants] = useState(initialInfants);
  const [cabinClass, setCabinClass] = useState<CabinClass>(initialCabin);
  const [multiLegs, setMultiLegs] = useState([
    { origin: initialOrigin, destination: initialDestination, date: initialDepartureDate },
    { origin: initialDestination, destination: 'LHR', date: getDefaultDate(18) },
  ]);

  // Hotel tab state
  const [hotelCity, setHotelCity] = useState('Dubai');
  const [hotelCheckIn, setHotelCheckIn] = useState(getDefaultDate(14));
  const [hotelCheckOut, setHotelCheckOut] = useState(getDefaultDate(19));
  const [hotelGuests, setHotelGuests] = useState('2 Guests · 1 Room');

  // Packages tab state
  const [packageCategory, setPackageCategory] = useState('all');
  const [packageDest, setPackageDest] = useState('');

  // Hajj & Umrah tab state
  const [umrahType, setUmrahType] = useState('Umrah Season Package');
  const [umrahOrigin, setUmrahOrigin] = useState('Dallas (DFW)');
  const [umrahMonth, setUmrahMonth] = useState('Flexible / Next Season');

  const [originSuggestions, setOriginSuggestions] = useState<AirportOption[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<AirportOption[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<'origin' | 'dest' | 'passengers' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const fetchAirports = async (q: string, target: 'origin' | 'dest') => {
    try {
      const res = await fetch(`/api/flights/airports?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = (await res.json()) as { airports: AirportOption[] };
        if (target === 'origin') setOriginSuggestions(data.airports);
        else setDestSuggestions(data.airports);
        return;
      }
    } catch {
      // Fallback to local list
    }
    const lower = q.trim().toLowerCase();
    const filtered = DEFAULT_AIRPORTS.filter(
      (a) =>
        a.code.toLowerCase().includes(lower) ||
        a.city.toLowerCase().includes(lower) ||
        a.country.toLowerCase().includes(lower)
    );
    if (target === 'origin') setOriginSuggestions(filtered);
    else setDestSuggestions(filtered);
  };

  const extractAirportCode = (val: string): string => {
    const paren = val.match(/\(([A-Z]{3})\)/);
    if (paren) return paren[1];
    const clean = val.trim().toUpperCase();
    if (/^[A-Z]{3}$/.test(clean)) return clean;
    const match = DEFAULT_AIRPORTS.find(
      (a) => a.city.toLowerCase() === val.trim().toLowerCase() || a.code === clean
    );
    return match ? match.code : clean.slice(0, 3);
  };

  const swapAirports = () => {
    const temp = originInput;
    setOriginInput(destInput);
    setDestInput(temp);
    setErrorMsg(null);
  };

  const handleFlightSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (tripType === 'multi-city') {
      for (let i = 0; i < multiLegs.length; i++) {
        const o = extractAirportCode(multiLegs[i].origin);
        const d = extractAirportCode(multiLegs[i].destination);
        if (!o || !d || o.length < 3 || d.length < 3) {
          setErrorMsg(`Please enter valid 3-letter airport codes for Leg ${i + 1}.`);
          return;
        }
        if (o === d) {
          setErrorMsg(`Departure and destination cannot be identical on Leg ${i + 1}.`);
          return;
        }
        if (!multiLegs[i].date) {
          setErrorMsg(`Please select a departure date for Leg ${i + 1}.`);
          return;
        }
      }
      const firstLeg = multiLegs[0];
      const qs = new URLSearchParams({
        tripType: 'multi-city',
        from: extractAirportCode(firstLeg.origin),
        to: extractAirportCode(firstLeg.destination),
        dep: firstLeg.date,
        adults: String(adults),
        children: String(children),
        infants: String(infants),
        cabin: cabinClass,
        legs: JSON.stringify(
          multiLegs.map((l) => ({
            originCode: extractAirportCode(l.origin),
            destinationCode: extractAirportCode(l.destination),
            departureDate: l.date,
          }))
        ),
      });
      navigate(`/flights?${qs.toString()}`);
      return;
    }

    const fromCode = extractAirportCode(originInput);
    const toCode = extractAirportCode(destInput);

    if (!fromCode || fromCode.length < 3) {
      setErrorMsg('Please select a valid departure city or 3-letter airport code.');
      return;
    }
    if (!toCode || toCode.length < 3) {
      setErrorMsg('Please select a valid destination city or 3-letter airport code.');
      return;
    }
    if (fromCode === toCode) {
      setErrorMsg('Departure and destination airports cannot be identical.');
      return;
    }
    if (!departureDate) {
      setErrorMsg('Please choose a departure date.');
      return;
    }
    if (tripType === 'round-trip') {
      if (!returnDate) {
        setErrorMsg('Please choose a return date for a round trip.');
        return;
      }
      if (returnDate < departureDate) {
        setErrorMsg('Return date cannot be earlier than the departure date.');
        return;
      }
    }
    if (infants > adults) {
      setErrorMsg('Each infant must be accompanied by an adult passenger.');
      return;
    }

    const qs = new URLSearchParams({
      tripType,
      from: fromCode,
      to: toCode,
      dep: departureDate,
      ...(tripType === 'round-trip' ? { ret: returnDate } : {}),
      adults: String(adults),
      children: String(children),
      infants: String(infants),
      cabin: cabinClass,
    });
    navigate(`/flights?${qs.toString()}`);
  };

  const handleHotelsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qs = new URLSearchParams({
      destination: hotelCity.trim() || 'Dubai',
      checkin: hotelCheckIn,
      checkout: hotelCheckOut,
      guests: hotelGuests,
    });
    navigate(`/hotels?${qs.toString()}`);
  };

  const handlePackagesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qs = new URLSearchParams();
    if (packageCategory !== 'all') qs.set('category', packageCategory);
    if (packageDest.trim()) qs.set('q', packageDest.trim());
    navigate(`/packages${qs.toString() ? `?${qs.toString()}` : ''}`);
  };

  const handleHajjUmrahSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qs = new URLSearchParams({
      program: umrahType,
      from: umrahOrigin,
      season: umrahMonth,
    });
    navigate(`/hajj-umrah?${qs.toString()}`);
  };

  const totalPassengers = adults + children + infants;

  return (
    <div
      ref={containerRef}
      className={`bg-white rounded-2xl border border-[#D9E2EC] shadow-xl ${
        compact ? 'p-4 sm:p-5' : 'p-5 sm:p-7'
      }`}
    >
      {/* Service Category Tabs: Flights | Hotels | Holiday Packages | Hajj & Umrah */}
      {showServiceTabs && (
        <div
          className="flex flex-wrap items-center gap-2 pb-4 mb-5 border-b border-[#E6ECF2]"
          role="tablist"
          aria-label="Booking Service Categories"
        >
          {(
            [
              { id: 'flights', label: 'Flights', icon: Plane },
              { id: 'hotels', label: 'Hotels', icon: Building2 },
              { id: 'packages', label: 'Holiday Packages', icon: Compass },
              { id: 'hajj-umrah', label: 'Hajj & Umrah', icon: Sparkles },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = serviceTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setServiceTab(item.id);
                  setErrorMsg(null);
                }}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#FD8F1C] text-white shadow-xs'
                    : 'bg-[#F9F9FA] text-[#486581] hover:bg-[#F0F4F8] hover:text-[#0F2942]'
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </div>
      )}

      {/* TAB 1: FLIGHTS */}
      {serviceTab === 'flights' && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div
              className="inline-flex items-center p-1 bg-[#F0F4F8] rounded-lg"
              role="tablist"
              aria-label="Trip Type"
            >
              {(
                [
                  { id: 'round-trip', label: 'Round Trip' },
                  { id: 'one-way', label: 'One Way' },
                  { id: 'multi-city', label: 'Multi City' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={tripType === tab.id}
                  onClick={() => {
                    setTripType(tab.id);
                    setErrorMsg(null);
                  }}
                  className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    tripType === tab.id
                      ? 'bg-[#0F2942] text-white shadow-xs'
                      : 'text-[#486581] hover:text-[#0F2942]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <label htmlFor="cabin-select" className="sr-only">
                Travel Class
              </label>
              <select
                id="cabin-select"
                value={cabinClass}
                onChange={(e) => setCabinClass(e.target.value as CabinClass)}
                className="text-xs sm:text-sm font-medium text-[#0F2942] bg-[#F9F9FA] border border-[#D9E2EC] rounded-lg px-3 py-2 focus:outline-none focus:border-[#FD8F1C]"
              >
                <option value="Economy">Economy</option>
                <option value="Premium Economy">Premium Economy</option>
                <option value="Business">Business</option>
                <option value="First Class">First Class</option>
              </select>

              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setActiveDropdown(activeDropdown === 'passengers' ? null : 'passengers')
                  }
                  className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-[#0F2942] bg-[#F9F9FA] border border-[#D9E2EC] rounded-lg px-3 py-2 hover:border-[#829AB1] whitespace-nowrap"
                >
                  <Users className="w-4 h-4 text-[#FD8F1C]" aria-hidden="true" />
                  <span className="tabular-nums">
                    {totalPassengers} {totalPassengers === 1 ? 'Passenger' : 'Passengers'}
                  </span>
                </button>

                {activeDropdown === 'passengers' && (
                  <div className="absolute right-0 mt-2 w-72 bg-white border border-[#D9E2EC] rounded-xl shadow-xl p-4 z-30 space-y-3">
                    {[
                      { label: 'Adults', sub: '12+ years', value: adults, min: 1, max: 9, setter: setAdults },
                      { label: 'Children', sub: '2–11 years', value: children, min: 0, max: 8, setter: setChildren },
                      { label: 'Infants', sub: 'Under 2 years', value: infants, min: 0, max: 4, setter: setInfants },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-[#0F2942]">{row.label}</p>
                          <p className="text-xs text-[#627D98]">{row.sub}</p>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => row.setter(Math.max(row.min, row.value - 1))}
                            className="w-8 h-8 rounded-lg border border-[#D9E2EC] text-[#0F2942] hover:bg-[#F0F4F8] font-semibold"
                            aria-label={`Decrease ${row.label}`}
                          >
                            -
                          </button>
                          <span className="w-5 text-center text-sm font-semibold tabular-nums text-[#0F2942]">
                            {row.value}
                          </span>
                          <button
                            type="button"
                            onClick={() => row.setter(Math.min(row.max, row.value + 1))}
                            className="w-8 h-8 rounded-lg border border-[#D9E2EC] text-[#0F2942] hover:bg-[#F0F4F8] font-semibold"
                            aria-label={`Increase ${row.label}`}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setActiveDropdown(null)}
                      className="w-full py-2 bg-[#0F2942] text-white text-xs font-semibold rounded-lg"
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleFlightSubmit}>
            {tripType !== 'multi-city' ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                {/* From */}
                <div className="md:col-span-3 relative">
                  <label htmlFor="from-airport" className="block text-xs font-semibold text-[#486581] mb-1.5">
                    From
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-[#627D98] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                    <input
                      id="from-airport"
                      type="text"
                      value={originInput}
                      onFocus={() => {
                        setActiveDropdown('origin');
                        fetchAirports(originInput, 'origin');
                      }}
                      onChange={(e) => {
                        setOriginInput(e.target.value);
                        setActiveDropdown('origin');
                        fetchAirports(e.target.value, 'origin');
                      }}
                      placeholder="City or Airport (e.g. DFW)"
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#D9E2EC] bg-[#F9F9FA] text-sm font-medium text-[#0F2942] focus:outline-none focus:bg-white focus:border-[#FD8F1C]"
                      required
                    />
                  </div>
                  {activeDropdown === 'origin' && originSuggestions.length > 0 && (
                    <ul className="absolute left-0 right-0 mt-1 bg-white border border-[#D9E2EC] rounded-xl shadow-lg max-h-56 overflow-y-auto z-30">
                      {originSuggestions.map((a) => (
                        <li key={a.code}>
                          <button
                            type="button"
                            onClick={() => {
                              setOriginInput(`${a.city} (${a.code})`);
                              setActiveDropdown(null);
                            }}
                            className="w-full text-left px-3.5 py-2.5 hover:bg-[#F0F4F8] flex items-center justify-between gap-2 text-sm"
                          >
                            <span className="truncate">
                              <span className="font-semibold text-[#0F2942]">{a.city}</span>{' '}
                              <span className="text-xs text-[#627D98]">{a.country}</span>
                            </span>
                            <span className="font-mono text-xs font-semibold text-[#FD8F1C] shrink-0">
                              {a.code}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Swap */}
                <div className="md:col-span-1 flex justify-center">
                  <button
                    type="button"
                    onClick={swapAirports}
                    aria-label="Swap departure and destination airports"
                    className="p-2.5 rounded-lg border border-[#D9E2EC] bg-white hover:bg-[#F0F4F8] text-[#0F2942] transition-colors"
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                  </button>
                </div>

                {/* To */}
                <div className="md:col-span-3 relative">
                  <label htmlFor="to-airport" className="block text-xs font-semibold text-[#486581] mb-1.5">
                    To
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-[#FD8F1C] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                    <input
                      id="to-airport"
                      type="text"
                      value={destInput}
                      onFocus={() => {
                        setActiveDropdown('dest');
                        fetchAirports(destInput, 'dest');
                      }}
                      onChange={(e) => {
                        setDestInput(e.target.value);
                        setActiveDropdown('dest');
                        fetchAirports(e.target.value, 'dest');
                      }}
                      placeholder="City or Airport (e.g. DXB)"
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#D9E2EC] bg-[#F9F9FA] text-sm font-medium text-[#0F2942] focus:outline-none focus:bg-white focus:border-[#FD8F1C]"
                      required
                    />
                  </div>
                  {activeDropdown === 'dest' && destSuggestions.length > 0 && (
                    <ul className="absolute left-0 right-0 mt-1 bg-white border border-[#D9E2EC] rounded-xl shadow-lg max-h-56 overflow-y-auto z-30">
                      {destSuggestions.map((a) => (
                        <li key={a.code}>
                          <button
                            type="button"
                            onClick={() => {
                              setDestInput(`${a.city} (${a.code})`);
                              setActiveDropdown(null);
                            }}
                            className="w-full text-left px-3.5 py-2.5 hover:bg-[#F0F4F8] flex items-center justify-between gap-2 text-sm"
                          >
                            <span className="truncate">
                              <span className="font-semibold text-[#0F2942]">{a.city}</span>{' '}
                              <span className="text-xs text-[#627D98]">{a.country}</span>
                            </span>
                            <span className="font-mono text-xs font-semibold text-[#FD8F1C] shrink-0">
                              {a.code}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Departure Date */}
                <div className={tripType === 'round-trip' ? 'md:col-span-2' : 'md:col-span-3'}>
                  <label htmlFor="dep-date" className="block text-xs font-semibold text-[#486581] mb-1.5">
                    Departure Date
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-[#627D98] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                    <input
                      id="dep-date"
                      type="date"
                      value={departureDate}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setDepartureDate(e.target.value)}
                      className="w-full pl-9 pr-2.5 py-2.5 rounded-lg border border-[#D9E2EC] bg-[#F9F9FA] text-sm font-medium text-[#0F2942] tabular-nums focus:outline-none focus:bg-white focus:border-[#FD8F1C]"
                      required
                    />
                  </div>
                </div>

                {/* Return Date */}
                {tripType === 'round-trip' && (
                  <div className="md:col-span-2">
                    <label htmlFor="ret-date" className="block text-xs font-semibold text-[#486581] mb-1.5">
                      Return Date
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-[#627D98] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                      <input
                        id="ret-date"
                        type="date"
                        value={returnDate}
                        min={departureDate}
                        onChange={(e) => setReturnDate(e.target.value)}
                        className="w-full pl-9 pr-2.5 py-2.5 rounded-lg border border-[#D9E2EC] bg-[#F9F9FA] text-sm font-medium text-[#0F2942] tabular-nums focus:outline-none focus:bg-white focus:border-[#FD8F1C]"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Search Button */}
                <div className={tripType === 'round-trip' ? 'md:col-span-12 lg:col-span-1' : 'md:col-span-2'}>
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#FD8F1C] hover:bg-[#E07A0E] text-white text-sm font-bold transition-colors whitespace-nowrap shadow-sm min-h-[42px]"
                  >
                    <Search className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className={tripType === 'round-trip' ? 'lg:hidden xl:inline' : ''}>Search</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {multiLegs.map((leg, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-4">
                      <label className="block text-xs font-semibold text-[#486581] mb-1">
                        Leg {idx + 1} From
                      </label>
                      <input
                        type="text"
                        value={leg.origin}
                        onChange={(e) => {
                          const next = [...multiLegs];
                          next[idx].origin = e.target.value;
                          setMultiLegs(next);
                        }}
                        placeholder="e.g. DFW"
                        className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] bg-[#F9F9FA] text-sm text-[#0F2942]"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <label className="block text-xs font-semibold text-[#486581] mb-1">
                        Leg {idx + 1} To
                      </label>
                      <input
                        type="text"
                        value={leg.destination}
                        onChange={(e) => {
                          const next = [...multiLegs];
                          next[idx].destination = e.target.value;
                          setMultiLegs(next);
                        }}
                        placeholder="e.g. DXB"
                        className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] bg-[#F9F9FA] text-sm text-[#0F2942]"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-semibold text-[#486581] mb-1">Date</label>
                      <input
                        type="date"
                        value={leg.date}
                        min={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => {
                          const next = [...multiLegs];
                          next[idx].date = e.target.value;
                          setMultiLegs(next);
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] bg-[#F9F9FA] text-sm text-[#0F2942] tabular-nums"
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      {multiLegs.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setMultiLegs(multiLegs.filter((_, i) => i !== idx))}
                          aria-label={`Remove leg ${idx + 1}`}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  {multiLegs.length < 4 && (
                    <button
                      type="button"
                      onClick={() =>
                        setMultiLegs([
                          ...multiLegs,
                          { origin: '', destination: '', date: getDefaultDate(25) },
                        ])
                      }
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-[#FD8F1C] hover:text-[#0F2942]"
                    >
                      <Plus className="w-4 h-4" /> Add Flight Segment
                    </button>
                  )}
                  <button
                    type="submit"
                    className="ml-auto inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#FD8F1C] hover:bg-[#E07A0E] text-white text-sm font-bold"
                  >
                    <Search className="w-4 h-4" /> Search Multi-City Flights
                  </button>
                </div>
              </div>
            )}

            {errorMsg && (
              <p role="alert" className="mt-3 text-xs font-medium text-red-600">
                {errorMsg}
              </p>
            )}

            <div className="mt-4 pt-3.5 border-t border-[#F0F4F8] flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-[#627D98]">
                Prefer personalized airline options, 3 Check Bags deals, or flexible dates?
              </span>
              <button
                type="button"
                onClick={() => {
                  const qs = new URLSearchParams({
                    tripType,
                    from: originInput || 'DFW',
                    to: destInput || 'DXB',
                    dep: departureDate,
                    ...(tripType === 'round-trip' ? { ret: returnDate } : {}),
                    adults: String(adults),
                    children: String(children),
                    infants: String(infants),
                    cabin: cabinClass,
                    ...(tripType === 'multi-city'
                      ? {
                          legs: JSON.stringify(
                            multiLegs.map((l) => ({
                              originCode: l.origin,
                              destinationCode: l.destination,
                              departureDate: l.date,
                            }))
                          ),
                        }
                      : {}),
                  });
                  navigate(`/flight-request?${qs.toString()}`);
                }}
                className="font-semibold text-[#0F2942] hover:text-[#FD8F1C] underline underline-offset-4 transition-colors"
              >
                Submit Custom Flight Booking Request →
              </button>
            </div>
          </form>
        </>
      )}

      {/* TAB 2: HOTELS */}
      {serviceTab === 'hotels' && (
        <form onSubmit={handleHotelsSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-[#486581] mb-1.5">
              Destination City or Resort
            </label>
            <input
              type="text"
              required
              value={hotelCity}
              onChange={(e) => setHotelCity(e.target.value)}
              placeholder="e.g. Dubai, Istanbul, Maldives, Makkah"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#D9E2EC] bg-[#F9F9FA] text-sm font-medium text-[#0F2942]"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-[#486581] mb-1.5">Check-in</label>
            <input
              type="date"
              required
              value={hotelCheckIn}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setHotelCheckIn(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-[#D9E2EC] bg-[#F9F9FA] text-sm font-medium text-[#0F2942] tabular-nums"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-[#486581] mb-1.5">Check-out</label>
            <input
              type="date"
              required
              value={hotelCheckOut}
              min={hotelCheckIn}
              onChange={(e) => setHotelCheckOut(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-[#D9E2EC] bg-[#F9F9FA] text-sm font-medium text-[#0F2942] tabular-nums"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-[#486581] mb-1.5">Guests & Rooms</label>
            <select
              value={hotelGuests}
              onChange={(e) => setHotelGuests(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-[#D9E2EC] bg-[#F9F9FA] text-sm font-medium text-[#0F2942]"
            >
              <option value="2 Guests · 1 Room">2 Guests · 1 Room</option>
              <option value="1 Guest · 1 Room">1 Guest · 1 Room</option>
              <option value="4 Guests · 2 Rooms">4 Guests · 2 Rooms</option>
              <option value="Family / Group Stay">Family / Group Stay</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#FD8F1C] hover:bg-[#E07A0E] text-white text-sm font-bold min-h-[42px]"
            >
              <Search className="w-4 h-4" /> Explore Hotels
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: HOLIDAY PACKAGES */}
      {serviceTab === 'packages' && (
        <form onSubmit={handlePackagesSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-5">
            <label className="block text-xs font-semibold text-[#486581] mb-1.5">
              Package Type
            </label>
            <select
              value={packageCategory}
              onChange={(e) => setPackageCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#D9E2EC] bg-[#F9F9FA] text-sm font-medium text-[#0F2942]"
            >
              <option value="all">All Tour & Holiday Packages</option>
              <option value="tour">Guided Tour Packages</option>
              <option value="honeymoon">Honeymoon Packages</option>
              <option value="holiday">Beach & Resort Holidays</option>
            </select>
          </div>
          <div className="md:col-span-5">
            <label className="block text-xs font-semibold text-[#486581] mb-1.5">
              Destination (Optional)
            </label>
            <input
              type="text"
              value={packageDest}
              onChange={(e) => setPackageDest(e.target.value)}
              placeholder="e.g. Dubai, Istanbul, Maldives, Switzerland, Northern Pakistan"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#D9E2EC] bg-[#F9F9FA] text-sm font-medium text-[#0F2942]"
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#FD8F1C] hover:bg-[#E07A0E] text-white text-sm font-bold min-h-[42px]"
            >
              <Search className="w-4 h-4" /> View Packages
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: HAJJ & UMRAH */}
      {serviceTab === 'hajj-umrah' && (
        <form onSubmit={handleHajjUmrahSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-[#486581] mb-1.5">
              Pilgrimage Program
            </label>
            <select
              value={umrahType}
              onChange={(e) => setUmrahType(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#D9E2EC] bg-[#F9F9FA] text-sm font-medium text-[#0F2942]"
            >
              <option value="Umrah Season Package">Umrah Season — Guided Package</option>
              <option value="Family Umrah & Ziyarat">Family Umrah & Haram Proximity</option>
              <option value="Hajj Travel Assistance">Hajj Travel & Advisory</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-[#486581] mb-1.5">
              Departure Hub
            </label>
            <input
              type="text"
              value={umrahOrigin}
              onChange={(e) => setUmrahOrigin(e.target.value)}
              placeholder="Dallas (DFW), New York (JFK)..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#D9E2EC] bg-[#F9F9FA] text-sm font-medium text-[#0F2942]"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-[#486581] mb-1.5">
              Preferred Travel Window
            </label>
            <input
              type="text"
              value={umrahMonth}
              onChange={(e) => setUmrahMonth(e.target.value)}
              placeholder="e.g. Ramadan / December"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#D9E2EC] bg-[#F9F9FA] text-sm font-medium text-[#0F2942]"
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#FD8F1C] hover:bg-[#E07A0E] text-white text-sm font-bold min-h-[42px]"
            >
              <Search className="w-4 h-4" /> Explore
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
