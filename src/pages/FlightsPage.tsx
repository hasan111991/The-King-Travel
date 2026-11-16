import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Briefcase, Clock, Filter, Info, Plane, ShieldCheck } from 'lucide-react';
import { FlightSearchWidget } from '../components/FlightSearchWidget';
import { useAgency } from '../context/AgencyContext';
import { convertMoney, formatMoney } from '../lib/defaultData';
import type { CabinClass, FlightOfferResult, TripType } from '../types/travel';

type SortOption = 'recommended' | 'cheapest' | 'fastest' | 'earliest';
type TimeSlot = 'all' | 'morning' | 'afternoon' | 'evening' | 'night';

function getHourFromIso(iso: string): number {
  const match = iso.match(/T(\d{2}):/);
  return match ? Number(match[1]) : 12;
}

function matchesTimeSlot(iso: string, slot: TimeSlot): boolean {
  if (slot === 'all') return true;
  const h = getHourFromIso(iso);
  if (slot === 'morning') return h >= 5 && h < 12;
  if (slot === 'afternoon') return h >= 12 && h < 17;
  if (slot === 'evening') return h >= 17 && h < 21;
  return h >= 21 || h < 5;
}

function formatTime(iso: string): string {
  const m = iso.match(/T(\d{2}:\d{2})/);
  return m ? m[1] : iso.slice(11, 16) || '00:00';
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

export function FlightsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { settings, currency, manualFlightOffers } = useAgency();

  const tripType = (searchParams.get('tripType') as TripType) || 'round-trip';
  const fromCode = (searchParams.get('from') || 'DFW').toUpperCase();
  const toCode = (searchParams.get('to') || 'DXB').toUpperCase();
  const depDate =
    searchParams.get('dep') ||
    new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const retDate =
    searchParams.get('ret') ||
    new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10);
  const adults = Math.max(1, Number(searchParams.get('adults') || 1));
  const children = Math.max(0, Number(searchParams.get('children') || 0));
  const infants = Math.max(0, Number(searchParams.get('infants') || 0));
  const cabinParam = (searchParams.get('cabin') as CabinClass) || 'Economy';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offers, setOffers] = useState<FlightOfferResult[]>([]);
  const [notice, setNotice] = useState<string>('');
  const [hasLiveSupplier, setHasLiveSupplier] = useState(false);

  // Filters & Sorting
  const [sortBy, setSortBy] = useState<SortOption>('recommended');
  const [stopsFilter, setStopsFilter] = useState<'all' | '0' | '1'>('all');
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>([]);
  const [depSlot, setDepSlot] = useState<TimeSlot>('all');
  const [arrSlot, setArrSlot] = useState<TimeSlot>('all');
  const [cabinFilter, setCabinFilter] = useState<string>('all');
  const [maxPrice, setMaxPrice] = useState<number>(0);

  useEffect(() => {
    let active = true;
    const runSearch = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/flights/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tripType,
            originCode: fromCode,
            destinationCode: toCode,
            departureDate: depDate,
            returnDate: tripType === 'round-trip' ? retDate : undefined,
            adults,
            children,
            infants,
            cabinClass: cabinParam,
            currency,
            mode: settings.operatingMode,
          }),
        });
        const isJson = res.headers.get('content-type')?.includes('application/json');
        const data = isJson ? await res.json() : { offers: [], notice: '', hasLiveSupplier: false };
        if (res.ok === false && isJson) {
          throw new Error(data.error || 'Flight search failed');
        }
        if (!active) return;

        // Convert active admin manual flight offers into FlightOfferResult clearly labeled as Manual Quotation
        const manualMapped: FlightOfferResult[] = manualFlightOffers
          .filter(
            (m) =>
              m.status === 'active' &&
              (!m.originCode || m.originCode === fromCode) &&
              (!m.destinationCode || m.destinationCode === toCode)
          )
          .map((m) => {
            const convertedTotal =
              m.currency === currency ? m.price : convertMoney(m.price, m.currency || 'USD', currency);
            return {
              id: `manual_${m.offerId}`,
              provider: 'manual_offer',
              isDemo: false,
              pricingType: 'manual_quotation',
              airline: m.airline,
              airlineCode: m.airlineCode || 'KT',
              flightNumber: m.flightNumber || 'QUOTATION',
              origin: m.origin,
              originCode: m.originCode || fromCode,
              destination: m.destination,
              destinationCode: m.destinationCode || toCode,
              departureDate: m.departureDate || depDate,
              departureTime: `${m.departureDate || depDate}T09:30:00`,
              arrivalTime: `${m.departureDate || depDate}T13:15:00`,
              durationMinutes: 225,
              stops: 0,
              stopDetails: 'Agency Quotation',
              baggageAllowance: m.baggage,
              cabinClass: m.cabinClass || cabinParam,
              refundable: false,
              refundRules: m.notes || 'Manual agency quotation subject to seat confirmation.',
              fareBreakdown: {
                baseFare: Math.round(convertedTotal * 0.8),
                taxes: Math.round(convertedTotal * 0.15),
                serviceCharges: Math.round(convertedTotal * 0.05),
                totalAmount: convertedTotal,
                currency,
              },
              totalPrice: convertedTotal,
              currency,
              segments: [
                {
                  airline: m.airline,
                  airlineCode: m.airlineCode || 'KT',
                  flightNumber: m.flightNumber || 'QUOTATION',
                  origin: m.origin,
                  originCode: m.originCode || fromCode,
                  destination: m.destination,
                  destinationCode: m.destinationCode || toCode,
                  departureTime: `${m.departureDate || depDate}T09:30:00`,
                  arrivalTime: `${m.departureDate || depDate}T13:15:00`,
                  durationMinutes: 225,
                },
              ],
              disclaimer:
                'MANUAL AGENCY QUOTATION: Posted by The King Travel desk. Not live airline inventory; final fare and seat confirmed after booking review.',
            };
          });

        const combined = [...manualMapped, ...(data.offers || [])];
        setOffers(combined);
        setNotice(data.notice || '');
        setHasLiveSupplier(Boolean(data.hasLiveSupplier));
        const highest = combined.reduce((acc, o) => Math.max(acc, o.totalPrice), 0);
        setMaxPrice(highest || 500000);
        setSelectedAirlines([]);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to fetch flights.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    runSearch();
    return () => {
      active = false;
    };
  }, [
    tripType,
    fromCode,
    toCode,
    depDate,
    retDate,
    adults,
    children,
    infants,
    cabinParam,
    currency,
    settings.operatingMode,
    manualFlightOffers,
  ]);

  const airlinesList = useMemo(() => {
    const set = new Set<string>();
    offers.forEach((o) => set.add(o.airline));
    return Array.from(set);
  }, [offers]);

  const absoluteMaxPrice = useMemo(
    () => offers.reduce((acc, o) => Math.max(acc, o.totalPrice), 100000),
    [offers]
  );

  const filteredOffers = useMemo(() => {
    let list = offers.filter((o) => {
      if (stopsFilter === '0' && o.stops !== 0) return false;
      if (stopsFilter === '1' && o.stops === 0) return false;
      if (selectedAirlines.length > 0 && !selectedAirlines.includes(o.airline)) return false;
      if (!matchesTimeSlot(o.departureTime, depSlot)) return false;
      if (!matchesTimeSlot(o.arrivalTime, arrSlot)) return false;
      if (cabinFilter !== 'all' && o.cabinClass !== cabinFilter) return false;
      if (maxPrice > 0 && o.totalPrice > maxPrice) return false;
      return true;
    });

    if (sortBy === 'cheapest') {
      list = [...list].sort((a, b) => a.totalPrice - b.totalPrice);
    } else if (sortBy === 'fastest') {
      list = [...list].sort((a, b) => a.durationMinutes - b.durationMinutes);
    } else if (sortBy === 'earliest') {
      list = [...list].sort((a, b) => a.departureTime.localeCompare(b.departureTime));
    }
    return list;
  }, [offers, stopsFilter, selectedAirlines, depSlot, arrSlot, cabinFilter, maxPrice, sortBy]);

  const handleSelectOffer = (offer: FlightOfferResult) => {
    sessionStorage.setItem(
      'kt_selected_flight',
      JSON.stringify({
        offer,
        searchMeta: {
          tripType,
          adults,
          children,
          infants,
          returnDate: tripType === 'round-trip' ? retDate : undefined,
        },
      })
    );
    navigate('/book');
  };

  const handleRequestCustomQuote = () => {
    const qs = new URLSearchParams({
      tripType,
      from: fromCode,
      to: toCode,
      dep: depDate,
      ...(tripType === 'round-trip' ? { ret: retDate } : {}),
      adults: String(adults),
      children: String(children),
      infants: String(infants),
      cabin: cabinParam,
    });
    const rawLegs = searchParams.get('legs');
    if (rawLegs) qs.set('legs', rawLegs);
    navigate(`/flight-request?${qs.toString()}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Compact Search Bar */}
      <div className="mb-8">
        <FlightSearchWidget
          compact
          showServiceTabs={false}
          initialOrigin={fromCode}
          initialDestination={toCode}
          initialDepartureDate={depDate}
          initialReturnDate={retDate}
          initialTripType={tripType}
          initialAdults={adults}
          initialChildren={children}
          initialInfants={infants}
          initialCabin={cabinParam}
        />
      </div>

      {/* Mode & Inventory Transparency Notice */}
      <div className="mb-6 bg-white border border-[#D9E2EC] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          {settings.operatingMode === 'demo' || !hasLiveSupplier ? (
            <AlertTriangle className="w-5 h-5 text-[#D4AF37] shrink-0 mt-0.5" aria-hidden="true" />
          ) : (
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
          )}
          <div>
            <p className="text-sm font-bold text-[#102A43]">
              {settings.operatingMode === 'demo'
                ? 'Demo Mode — Sample Flight Estimates'
                : hasLiveSupplier
                ? 'Live Supplier Inventory Connected'
                : 'Live Mode — Manual Agency Quotation Workflow'}
            </p>
            <p className="text-xs text-[#486581] mt-0.5 leading-relaxed">{notice}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRequestCustomQuote}
          className="px-4 py-2 rounded-lg border border-[#102A43] text-[#102A43] hover:bg-[#102A43] hover:text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          Request Custom Quotation
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Filters */}
        <aside className="lg:col-span-3 space-y-6">
          <div className="bg-white border border-[#D9E2EC] rounded-xl p-5 space-y-6">
            <div className="flex items-center justify-between border-b border-[#E6ECF2] pb-3">
              <h2 className="text-sm font-bold text-[#102A43] inline-flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#168AAD]" aria-hidden="true" />
                Filters
              </h2>
              <button
                type="button"
                onClick={() => {
                  setStopsFilter('all');
                  setSelectedAirlines([]);
                  setDepSlot('all');
                  setArrSlot('all');
                  setCabinFilter('all');
                  setMaxPrice(absoluteMaxPrice);
                  setSortBy('recommended');
                }}
                className="text-xs font-medium text-[#168AAD] hover:underline"
              >
                Reset
              </button>
            </div>

            {/* Quick Mode Filter */}
            <div>
              <p className="text-xs font-semibold text-[#486581] mb-2">Quick Priority</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSortBy('cheapest')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                    sortBy === 'cheapest'
                      ? 'bg-[#102A43] text-white border-[#102A43]'
                      : 'bg-[#F7F9FC] text-[#243B53] border-[#D9E2EC]'
                  }`}
                >
                  Cheapest
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy('fastest')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                    sortBy === 'fastest'
                      ? 'bg-[#102A43] text-white border-[#102A43]'
                      : 'bg-[#F7F9FC] text-[#243B53] border-[#D9E2EC]'
                  }`}
                >
                  Fastest
                </button>
              </div>
            </div>

            {/* Stops */}
            <div>
              <p className="text-xs font-semibold text-[#486581] mb-2">Stops</p>
              <div className="space-y-1.5 text-sm">
                {[
                  { val: 'all', label: 'Any stops' },
                  { val: '0', label: 'Non-stop only' },
                  { val: '1', label: '1 or more stops' },
                ].map((opt) => (
                  <label key={opt.val} className="flex items-center gap-2 cursor-pointer text-xs text-[#243B53]">
                    <input
                      type="radio"
                      name="stops"
                      checked={stopsFilter === opt.val}
                      onChange={() => setStopsFilter(opt.val as any)}
                      className="accent-[#102A43]"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Departure Time */}
            <div>
              <label htmlFor="dep-slot" className="block text-xs font-semibold text-[#486581] mb-1.5">
                Departure Time
              </label>
              <select
                id="dep-slot"
                value={depSlot}
                onChange={(e) => setDepSlot(e.target.value as TimeSlot)}
                className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] bg-[#F7F9FC] text-xs text-[#102A43]"
              >
                <option value="all">Any time</option>
                <option value="morning">Morning (05:00 – 12:00)</option>
                <option value="afternoon">Afternoon (12:00 – 17:00)</option>
                <option value="evening">Evening (17:00 – 21:00)</option>
                <option value="night">Night (21:00 – 05:00)</option>
              </select>
            </div>

            {/* Arrival Time */}
            <div>
              <label htmlFor="arr-slot" className="block text-xs font-semibold text-[#486581] mb-1.5">
                Arrival Time
              </label>
              <select
                id="arr-slot"
                value={arrSlot}
                onChange={(e) => setArrSlot(e.target.value as TimeSlot)}
                className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] bg-[#F7F9FC] text-xs text-[#102A43]"
              >
                <option value="all">Any time</option>
                <option value="morning">Morning (05:00 – 12:00)</option>
                <option value="afternoon">Afternoon (12:00 – 17:00)</option>
                <option value="evening">Evening (17:00 – 21:00)</option>
                <option value="night">Night (21:00 – 05:00)</option>
              </select>
            </div>

            {/* Travel Class */}
            <div>
              <label htmlFor="class-filter" className="block text-xs font-semibold text-[#486581] mb-1.5">
                Travel Class
              </label>
              <select
                id="class-filter"
                value={cabinFilter}
                onChange={(e) => setCabinFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] bg-[#F7F9FC] text-xs text-[#102A43]"
              >
                <option value="all">All Classes</option>
                <option value="Economy">Economy</option>
                <option value="Premium Economy">Premium Economy</option>
                <option value="Business">Business</option>
                <option value="First Class">First Class</option>
              </select>
            </div>

            {/* Price Range */}
            {absoluteMaxPrice > 0 && (
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-[#486581]">Max Price</span>
                  <span className="font-mono font-semibold text-[#102A43] tabular-nums">
                    {formatMoney(maxPrice, currency)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={absoluteMaxPrice}
                  step={Math.max(500, Math.round(absoluteMaxPrice / 40))}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-[#102A43]"
                />
              </div>
            )}

            {/* Airlines */}
            {airlinesList.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[#486581] mb-2">Airlines</p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {airlinesList.map((airline) => (
                    <label key={airline} className="flex items-center gap-2 cursor-pointer text-xs text-[#243B53]">
                      <input
                        type="checkbox"
                        checked={selectedAirlines.includes(airline)}
                        onChange={() =>
                          setSelectedAirlines((prev) =>
                            prev.includes(airline)
                              ? prev.filter((a) => a !== airline)
                              : [...prev, airline]
                          )
                        }
                        className="accent-[#102A43]"
                      />
                      <span className="truncate">{airline}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Results Column */}
        <div className="lg:col-span-9 space-y-4">
          {/* Sort Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-[#D9E2EC] rounded-xl px-5 py-3.5">
            <p className="text-sm text-[#243B53]">
              <span className="font-bold text-[#102A43] tabular-nums">{filteredOffers.length}</span>{' '}
              options for{' '}
              <span className="font-mono font-semibold text-[#102A43]">
                {fromCode} → {toCode}
              </span>{' '}
              · {depDate}
            </p>
            <div className="flex items-center gap-2">
              <label htmlFor="sort-flights" className="text-xs font-semibold text-[#486581]">
                Sort by:
              </label>
              <select
                id="sort-flights"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-1.5 rounded-lg border border-[#D9E2EC] bg-[#F7F9FC] text-xs font-semibold text-[#102A43]"
              >
                <option value="recommended">Recommended</option>
                <option value="cheapest">Cheapest</option>
                <option value="fastest">Fastest</option>
                <option value="earliest">Earliest Departure</option>
              </select>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="bg-white border border-[#D9E2EC] rounded-xl p-6 animate-pulse h-36"
                />
              ))}
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="bg-white border border-red-200 rounded-xl p-6 text-center">
              <p className="text-sm font-semibold text-red-700">{error}</p>
              <p className="text-xs text-[#627D98] mt-1">
                You can adjust your search dates or submit a manual quotation request directly.
              </p>
              <button
                type="button"
                onClick={handleRequestCustomQuote}
                className="mt-4 px-5 py-2.5 rounded-lg bg-[#102A43] text-white text-xs font-semibold"
              >
                Submit Manual Quotation Request
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredOffers.length === 0 && (
            <div className="bg-white border border-[#D9E2EC] rounded-xl p-10 text-center">
              <Plane className="w-8 h-8 text-[#627D98] mx-auto mb-3" aria-hidden="true" />
              <h3 className="text-base font-bold text-[#102A43]">No matching flights found</h3>
              <p className="text-sm text-[#486581] mt-1 max-w-md mx-auto">
                No offers matched your active filters or live supplier availability. Clear filters or submit a custom booking quotation request to our ticketing desk.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStopsFilter('all');
                    setSelectedAirlines([]);
                    setDepSlot('all');
                    setArrSlot('all');
                    setMaxPrice(absoluteMaxPrice);
                  }}
                  className="px-4 py-2 rounded-lg border border-[#D9E2EC] text-xs font-semibold text-[#102A43]"
                >
                  Clear All Filters
                </button>
                <button
                  type="button"
                  onClick={handleRequestCustomQuote}
                  className="px-4 py-2 rounded-lg bg-[#102A43] text-white text-xs font-semibold"
                >
                  Request Custom Quotation
                </button>
              </div>
            </div>
          )}

          {/* Flight Result Cards */}
          {!loading &&
            !error &&
            filteredOffers.map((offer) => (
              <article
                key={offer.id}
                className="bg-white border border-[#D9E2EC] rounded-xl p-5 sm:p-6 hover:border-[#168AAD] transition-colors"
              >
                {/* Unboxed metadata top line */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-[#E6ECF2] text-xs text-[#627D98]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[#102A43]">
                      {offer.pricingType === 'demo_sample'
                        ? 'Demo Estimate'
                        : offer.pricingType === 'manual_quotation'
                        ? 'Manual Agency Quotation'
                        : 'Supplier API Fare'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{offer.cabinClass}</span>
                    <span aria-hidden="true">·</span>
                    <span>{offer.refundable ? 'Refundable' : 'Restricted Fare'}</span>
                  </div>
                  <span className="font-mono text-[#486581]">{offer.flightNumber}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                  {/* Airline */}
                  <div className="md:col-span-3 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg bg-[#102A43] text-[#D4AF37] font-mono font-bold text-sm flex items-center justify-center shrink-0">
                      {offer.airlineCode}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-[#102A43] truncate">{offer.airline}</h3>
                      <p className="text-xs text-[#627D98] mt-0.5 truncate">
                        {offer.stopDetails || (offer.stops === 0 ? 'Non-stop' : `${offer.stops} Stop`)}
                      </p>
                    </div>
                  </div>

                  {/* Schedule */}
                  <div className="md:col-span-6 grid grid-cols-3 items-center gap-2 text-center">
                    <div className="text-left">
                      <p className="font-mono text-lg font-bold text-[#102A43] tabular-nums">
                        {formatTime(offer.departureTime)}
                      </p>
                      <p className="font-mono text-xs font-semibold text-[#486581]">
                        {offer.originCode}
                      </p>
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="text-[11px] font-medium text-[#627D98] inline-flex items-center gap-1 tabular-nums">
                        <Clock className="w-3 h-3" aria-hidden="true" />
                        {formatDuration(offer.durationMinutes)}
                      </span>
                      <div className="w-full h-px bg-[#D9E2EC] my-1.5 relative">
                        <Plane
                          className="w-3.5 h-3.5 text-[#168AAD] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-0.5"
                          aria-hidden="true"
                        />
                      </div>
                      <span className="text-[11px] text-[#627D98]">
                        {offer.stops === 0 ? 'Direct' : `${offer.stops} Stop`}
                      </span>
                    </div>

                    <div className="text-right">
                      <p className="font-mono text-lg font-bold text-[#102A43] tabular-nums">
                        {formatTime(offer.arrivalTime)}
                      </p>
                      <p className="font-mono text-xs font-semibold text-[#486581]">
                        {offer.destinationCode}
                      </p>
                    </div>
                  </div>

                  {/* Price & Book Action */}
                  <div className="md:col-span-3 flex md:flex-col items-center md:items-end justify-between gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-[#E6ECF2]">
                    <div className="md:text-right">
                      <p className="text-[11px] text-[#627D98]">
                        {offer.pricingType === 'confirmed_supplier' ? 'Supplier Total' : 'Estimated Total'}
                      </p>
                      <p className="font-mono text-xl font-bold text-[#102A43] tabular-nums">
                        {formatMoney(offer.totalPrice, offer.currency)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectOffer(offer)}
                      className="px-5 py-2.5 rounded-lg bg-[#FD8F1C] hover:bg-[#E07A0E] text-white text-xs font-bold transition-colors whitespace-nowrap"
                    >
                      Book Now
                    </button>
                  </div>
                </div>

                {/* Baggage & Disclaimer */}
                <div className="mt-4 pt-3 border-t border-[#F0F4F8] flex flex-wrap items-center justify-between gap-2 text-xs text-[#627D98]">
                  <span className="inline-flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-[#168AAD]" aria-hidden="true" />
                    {offer.baggageAllowance}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px]">
                    <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    {offer.disclaimer}
                  </span>
                </div>
              </article>
            ))}
        </div>
      </div>
    </div>
  );
}
