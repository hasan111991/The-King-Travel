import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  ArrowLeftRight,
  Calendar,
  CheckCircle2,
  Mail,
  MapPin,
  Phone,
  Plane,
  Plus,
  Send,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import { useAgency } from '../context/AgencyContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { db, generateId, handleFirestoreError, OperationType } from '../lib/firebase';
import { searchAirportsFallback } from '../lib/staticFallbacks';
import type {
  CabinClass,
  FlightRequestRecord,
  FlightRequestSegment,
  TripType,
} from '../types/travel';
import { AirlineSelector } from './AirlineSelector';

interface AirportOption {
  code: string;
  city: string;
  name: string;
  country: string;
}

const FALLBACK_AIRPORTS: AirportOption[] = [
  { code: 'DFW', city: 'Dallas', name: 'Dallas Fort Worth International Airport', country: 'United States' },
  { code: 'JFK', city: 'New York', name: 'John F. Kennedy International Airport', country: 'United States' },
  { code: 'IAD', city: 'Washington D.C.', name: 'Washington Dulles International Airport', country: 'United States' },
  { code: 'ORD', city: 'Chicago', name: "O'Hare International Airport", country: 'United States' },
  { code: 'LAX', city: 'Los Angeles', name: 'Los Angeles International Airport', country: 'United States' },
  { code: 'DXB', city: 'Dubai', name: 'Dubai International Airport', country: 'United Arab Emirates' },
  { code: 'JED', city: 'Jeddah', name: 'King Abdulaziz International Airport', country: 'Saudi Arabia' },
  { code: 'MED', city: 'Madinah', name: 'Prince Mohammad bin Abdulaziz Airport', country: 'Saudi Arabia' },
  { code: 'IST', city: 'Istanbul', name: 'Istanbul Airport', country: 'Turkey' },
  { code: 'LHR', city: 'London', name: 'London Heathrow Airport', country: 'United Kingdom' },
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

function defaultDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

function generateRequestReference(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `KT-REQ-${suffix}`;
}

interface FlightBookingRequestFormProps {
  initialTripType?: TripType;
  initialOrigin?: string;
  initialDestination?: string;
  initialDepartureDate?: string;
  initialReturnDate?: string;
  initialAdults?: number;
  initialChildren?: number;
  initialInfants?: number;
  initialCabin?: CabinClass;
  initialSegments?: FlightRequestSegment[];
  onSubmitted?: (record: FlightRequestRecord) => void;
}

export function FlightBookingRequestForm({
  initialTripType = 'round-trip',
  initialOrigin = 'Dallas (DFW)',
  initialDestination = 'Dubai (DXB)',
  initialDepartureDate = defaultDate(14),
  initialReturnDate = defaultDate(21),
  initialAdults = 1,
  initialChildren = 0,
  initialInfants = 0,
  initialCabin = 'Economy',
  initialSegments,
  onSubmitted,
}: FlightBookingRequestFormProps) {
  const { user, profile } = useAuth();
  const { settings } = useAgency();
  const { showToast } = useToast();

  const [tripType, setTripType] = useState<TripType>(initialTripType);
  const [departureCity, setDepartureCity] = useState(initialOrigin);
  const [destinationCity, setDestinationCity] = useState(initialDestination);
  const [departureDate, setDepartureDate] = useState(initialDepartureDate);
  const [returnDate, setReturnDate] = useState(initialReturnDate);
  const [segments, setSegments] = useState<FlightRequestSegment[]>(
    initialSegments && initialSegments.length >= 2
      ? initialSegments
      : [
          { origin: initialOrigin, destination: initialDestination, departureDate: initialDepartureDate },
          { origin: initialDestination, destination: 'London (LHR)', departureDate: defaultDate(20) },
        ]
  );

  const [preferredAirline, setPreferredAirline] = useState('Any Airline');
  const [adults, setAdults] = useState(Math.max(1, initialAdults));
  const [children, setChildren] = useState(Math.max(0, initialChildren));
  const [infants, setInfants] = useState(Math.max(0, initialInfants));
  const [cabinClass, setCabinClass] = useState<CabinClass>(initialCabin);

  const [passengerName, setPassengerName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneWhatsapp, setPhoneWhatsapp] = useState('');
  const [additionalRequirements, setAdditionalRequirements] = useState('');

  // Airport autocomplete state: target can be 'origin' | 'dest' | 'seg-0-origin' | 'seg-0-dest'
  const [activeField, setActiveField] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<AirportOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedRecord, setSubmittedRecord] = useState<FlightRequestRecord | null>(null);
  const [emailDispatchNote, setEmailDispatchNote] = useState<string>('');
  const formContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user || profile) {
      setPassengerName((prev) => prev || profile?.name || user?.displayName || '');
      setEmail((prev) => prev || profile?.email || user?.email || '');
      setPhoneWhatsapp((prev) => prev || profile?.whatsapp || profile?.phone || '');
    }
  }, [user, profile]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (formContainerRef.current && !formContainerRef.current.contains(e.target as Node)) {
        setActiveField(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const loadAirports = async (q: string, fieldKey: string) => {
    setActiveField(fieldKey);
    try {
      const res = await fetch(`/api/flights/airports?q=${encodeURIComponent(q)}`);
      const isJson = Boolean(res.headers.get('content-type')?.includes('application/json'));
      if (res.ok && isJson) {
        const data = (await res.json()) as { airports: AirportOption[] };
        setSuggestions(data.airports);
        return;
      }
    } catch {
      // fallback below
    }
    setSuggestions(searchAirportsFallback(q).slice(0, 12));
  };

  const applyAirportChoice = (fieldKey: string, airport: AirportOption) => {
    const formatted = `${airport.city} (${airport.code})`;
    if (fieldKey === 'origin') {
      setDepartureCity(formatted);
    } else if (fieldKey === 'dest') {
      setDestinationCity(formatted);
    } else if (fieldKey.startsWith('seg-')) {
      const [, idxStr, prop] = fieldKey.split('-');
      const idx = Number(idxStr);
      setSegments((prev) =>
        prev.map((seg, i) =>
          i === idx ? { ...seg, [prop === 'origin' ? 'origin' : 'destination']: formatted } : seg
        )
      );
    }
    setActiveField(null);
  };

  const swapCities = () => {
    const prevOrigin = departureCity;
    setDepartureCity(destinationCity);
    setDestinationCity(prevOrigin);
    setFormError(null);
  };

  const addSegment = () => {
    if (segments.length >= 6) return;
    const prevSeg = segments[segments.length - 1];
    setSegments((prev) => [
      ...prev,
      {
        origin: prevSeg?.destination || '',
        destination: '',
        departureDate: prevSeg?.departureDate || defaultDate(24),
      },
    ]);
  };

  const removeSegment = (idx: number) => {
    if (segments.length <= 2) return;
    setSegments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (infants > adults) {
      setFormError('Infants count cannot exceed the number of adult passengers.');
      return;
    }

    let finalOrigin = departureCity.trim();
    let finalDest = destinationCity.trim();
    let finalDepDate = departureDate;
    let finalReturnDate = tripType === 'round-trip' ? returnDate : '';
    let cleanedSegments: FlightRequestSegment[] = [];

    if (tripType === 'multi-city') {
      for (let i = 0; i < segments.length; i++) {
        const s = segments[i];
        if (!s.origin.trim() || !s.destination.trim()) {
          setFormError(`Please enter both departure and destination cities for Segment ${i + 1}.`);
          return;
        }
        if (s.origin.trim().toLowerCase() === s.destination.trim().toLowerCase()) {
          setFormError(`Departure and destination cannot be identical on Segment ${i + 1}.`);
          return;
        }
        if (!s.departureDate) {
          setFormError(`Please choose a departure date for Segment ${i + 1}.`);
          return;
        }
      }
      cleanedSegments = segments.map((s) => ({
        origin: s.origin.trim(),
        destination: s.destination.trim(),
        departureDate: s.departureDate,
      }));
      finalOrigin = cleanedSegments[0].origin;
      finalDest = cleanedSegments[cleanedSegments.length - 1].destination;
      finalDepDate = cleanedSegments[0].departureDate;
      finalReturnDate = '';
    } else {
      if (!finalOrigin || !finalDest) {
        setFormError('Please specify both departure and destination cities or airports.');
        return;
      }
      if (finalOrigin.toLowerCase() === finalDest.toLowerCase()) {
        setFormError('Departure and destination cities cannot be identical.');
        return;
      }
      if (!finalDepDate) {
        setFormError('Please select a departure date.');
        return;
      }
      if (tripType === 'round-trip') {
        if (!finalReturnDate) {
          setFormError('Please select a return date for a round-trip request.');
          return;
        }
        if (finalReturnDate < finalDepDate) {
          setFormError('Return date cannot be earlier than the departure date.');
          return;
        }
      }
    }

    if (passengerName.trim().length < 2) {
      setFormError('Please enter the lead passenger full name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError('Please enter a valid email address so we can send quotations.');
      return;
    }
    if (phoneWhatsapp.replace(/[^\d+]/g, '').length < 7) {
      setFormError('Please enter a valid WhatsApp or phone number.');
      return;
    }

    setSubmitting(true);
    const requestId = generateId('freq');
    const requestReference = generateRequestReference();

    const docPayload = {
      requestId,
      requestReference,
      userId: user ? user.uid : null,
      tripType,
      departureCity: finalOrigin,
      destinationCity: finalDest,
      departureDate: finalDepDate,
      returnDate: finalReturnDate,
      segments: cleanedSegments,
      preferredAirline: preferredAirline.trim() || 'Any Airline',
      passengersCount: { adults, children, infants },
      cabinClass,
      passengerName: passengerName.trim(),
      email: email.trim(),
      phoneWhatsapp: phoneWhatsapp.trim(),
      additionalRequirements: additionalRequirements.trim(),
      status: 'New Request' as const,
      quotations: [],
      selectedQuotationId: '',
      selectedQuotation: null,
      paymentMethod: '',
      paymentStatus: 'unpaid' as const,
      transactionReference: '',
      paymentReceiptUrl: '',
      paymentReceiptFileName: '',
      supplierProvider: '',
      supplierReference: '',
      ticketFileUrl: '',
      ticketFileName: '',
      adminNotes: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'flightRequests', requestId), docPayload);

      // Record in-portal confirmation notification if user is signed in
      if (user) {
        const notifId = generateId('ntf');
        setDoc(doc(db, 'notifications', notifId), {
          notificationId: notifId,
          userId: user.uid,
          bookingId: requestId,
          type: 'New Flight Request',
          title: `${requestReference}: Request Submitted`,
          message: `Your flight request (${finalOrigin} -> ${finalDest}) is now New Request. Our specialists will send airline quotations shortly.`,
          read: false,
          createdAt: serverTimestamp(),
        }).catch(() => {});
      }

      // Notify configured agency email & customer
      try {
        const notifyRes = await fetch('/api/flight-requests/notify-agency', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestId,
            requestReference,
            tripType,
            departureCity: finalOrigin,
            destinationCity: finalDest,
            departureDate: finalDepDate,
            returnDate: finalReturnDate,
            segmentsSummary: cleanedSegments
              .map((s, i) => `Segment ${i + 1}: ${s.origin} -> ${s.destination} (${s.departureDate})`)
              .join('\n'),
            preferredAirline: docPayload.preferredAirline,
            passengersCount: docPayload.passengersCount,
            cabinClass,
            passengerName: docPayload.passengerName,
            email: docPayload.email,
            phoneWhatsapp: docPayload.phoneWhatsapp,
            additionalRequirements: docPayload.additionalRequirements,
            agencyEmail: settings.contactEmail,
          }),
        });
        const isJson = Boolean(notifyRes.headers.get('content-type')?.includes('application/json'));
        if (notifyRes.ok && isJson) {
          const notifyJson = await notifyRes.json();
          if (notifyJson?.agencyNotification?.emailSent) {
            setEmailDispatchNote(`Email alert delivered to agency desk (${notifyJson.targetAgencyEmail}).`);
          } else {
            setEmailDispatchNote(
              `Request saved for agency desk (${notifyJson?.targetAgencyEmail || settings.contactEmail}). Live email relay will deliver automatically when RESEND_API_KEY is active.`
            );
          }
        } else {
          setEmailDispatchNote(
            `Saved to agency dashboard (${settings.contactEmail}) for immediate review.`
          );
        }
      } catch {
        setEmailDispatchNote('Saved to agency dashboard for immediate review.');
      }

      const localCopy: FlightRequestRecord = {
        ...docPayload,
        createdAt: { seconds: Math.floor(Date.now() / 1000) },
        updatedAt: { seconds: Math.floor(Date.now() / 1000) },
      };
      setSubmittedRecord(localCopy);
      showToast('Flight Request Submitted', `Reference ID: ${requestReference}`, 'success');
      if (onSubmitted) onSubmitted(localCopy);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.CREATE, `flightRequests/${requestId}`);
      } catch {
        setFormError('Unable to submit your flight request right now. Please try again.');
        showToast('Submission Error', 'Could not save flight request.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedRecord) {
    return (
      <div className="bg-white border border-[#D9E2EC] rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-start gap-4 pb-5 border-b border-[#E6ECF2]">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-7 h-7" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-700">Flight Request Submitted Successfully</p>
            <h2 className="font-display text-2xl font-bold text-[#0F2942] mt-0.5">
              Request Reference:{' '}
              <span className="font-mono text-[#FD8F1C]">{submittedRecord.requestReference}</span>
            </h2>
            <p className="text-xs text-[#486581] mt-1 leading-relaxed">
              Status set to <strong className="text-[#0F2942]">New Request</strong>. Our ticketing team will
              manually verify live airline supplier fares and send you multiple tailored quotation options to
              compare. No ticket is issued until you approve a quotation and complete payment verification.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-[#F9F9FA] border border-[#E6ECF2] rounded-xl p-5 text-xs">
          <div>
            <p className="text-[#627D98]">Route &amp; Trip Type</p>
            <p className="font-bold text-[#0F2942] mt-0.5">
              {submittedRecord.departureCity} → {submittedRecord.destinationCity}
            </p>
            <p className="text-[#486581] capitalize mt-0.5">{submittedRecord.tripType.replace('-', ' ')}</p>
          </div>
          <div>
            <p className="text-[#627D98]">Travel Dates &amp; Cabin</p>
            <p className="font-bold text-[#0F2942] mt-0.5 tabular-nums">
              {submittedRecord.departureDate}
              {submittedRecord.returnDate ? ` → ${submittedRecord.returnDate}` : ''}
            </p>
            <p className="text-[#486581] mt-0.5">{submittedRecord.cabinClass}</p>
          </div>
          <div>
            <p className="text-[#627D98]">Preferred Airline &amp; Travelers</p>
            <p className="font-bold text-[#0F2942] mt-0.5">{submittedRecord.preferredAirline}</p>
            <p className="text-[#486581] mt-0.5 tabular-nums">
              {submittedRecord.passengersCount.adults} Adult(s), {submittedRecord.passengersCount.children}{' '}
              Child(ren), {submittedRecord.passengersCount.infants} Infant(s)
            </p>
          </div>
        </div>

        {submittedRecord.segments && submittedRecord.segments.length > 0 && (
          <div className="bg-[#F9F9FA] border border-[#E6ECF2] rounded-xl p-4 space-y-1.5 text-xs">
            <p className="font-bold text-[#0F2942]">Multi-City Flight Segments</p>
            {submittedRecord.segments.map((seg, i) => (
              <p key={i} className="text-[#243B53] tabular-nums">
                Segment {i + 1}: <strong>{seg.origin}</strong> → <strong>{seg.destination}</strong> ·{' '}
                {seg.departureDate}
              </p>
            ))}
          </div>
        )}

        {emailDispatchNote && (
          <p className="text-xs text-[#486581] bg-[#F7F9FC] border border-[#E6ECF2] rounded-lg px-4 py-2.5">
            {emailDispatchNote}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            to="/my-bookings?tab=requests"
            className="px-5 py-2.5 rounded-lg bg-[#0F2942] hover:bg-[#193B5C] text-white text-xs font-bold transition-colors"
          >
            Track Request in Customer Portal
          </Link>
          <button
            type="button"
            onClick={() => {
              setSubmittedRecord(null);
              setAdditionalRequirements('');
              setEmailDispatchNote('');
            }}
            className="px-5 py-2.5 rounded-lg border border-[#D9E2EC] text-xs font-semibold text-[#0F2942] hover:bg-[#F9F9FA]"
          >
            Submit Another Flight Request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={formContainerRef} className="bg-white border border-[#D9E2EC] rounded-2xl p-6 sm:p-8 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-7">
        {/* Step 1: Trip Type & Cabin */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#E6ECF2]">
          <div>
            <p className="text-xs font-semibold text-[#486581] mb-2">1. Trip Type *</p>
            <div
              className="inline-flex items-center p-1 bg-[#F0F4F8] rounded-lg"
              role="tablist"
              aria-label="Flight Request Trip Type"
            >
              {(
                [
                  { id: 'one-way', label: 'One Way' },
                  { id: 'round-trip', label: 'Round Trip' },
                  { id: 'multi-city', label: 'Multi City' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tripType === t.id}
                  onClick={() => {
                    setTripType(t.id);
                    setFormError(null);
                  }}
                  className={`px-4 py-2 rounded-md text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    tripType === t.id
                      ? 'bg-[#0F2942] text-white shadow-xs'
                      : 'text-[#486581] hover:text-[#0F2942]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full sm:w-56">
            <label htmlFor="req-cabin" className="block text-xs font-semibold text-[#486581] mb-2">
              Cabin Class *
            </label>
            <select
              id="req-cabin"
              value={cabinClass}
              onChange={(e) => setCabinClass(e.target.value as CabinClass)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#D9E2EC] bg-[#F9F9FA] text-sm font-medium text-[#0F2942] focus:outline-none focus:border-[#FD8F1C]"
            >
              <option value="Economy">Economy</option>
              <option value="Premium Economy">Premium Economy</option>
              <option value="Business">Business</option>
              <option value="First Class">First Class</option>
            </select>
          </div>
        </div>

        {/* Step 2: Route & Dates */}
        {tripType !== 'multi-city' ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-4 relative">
              <label htmlFor="req-origin" className="block text-xs font-semibold text-[#486581] mb-1.5">
                Departure City / Airport *
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-[#627D98] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  id="req-origin"
                  type="text"
                  required
                  value={departureCity}
                  onFocus={() => loadAirports(departureCity, 'origin')}
                  onChange={(e) => {
                    setDepartureCity(e.target.value);
                    loadAirports(e.target.value, 'origin');
                  }}
                  placeholder="City or Airport Code (e.g. Dallas DFW)"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#D9E2EC] bg-[#F9F9FA] focus:bg-white text-sm font-medium text-[#0F2942] focus:outline-none focus:border-[#FD8F1C]"
                />
              </div>
              {activeField === 'origin' && suggestions.length > 0 && (
                <ul className="absolute left-0 right-0 mt-1 bg-white border border-[#D9E2EC] rounded-xl shadow-lg max-h-56 overflow-y-auto z-30">
                  {suggestions.map((a) => (
                    <li key={a.code}>
                      <button
                        type="button"
                        onClick={() => applyAirportChoice('origin', a)}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-[#F0F4F8] flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="truncate">
                          <span className="font-semibold text-[#0F2942]">{a.city}</span>{' '}
                          <span className="text-[#627D98]">· {a.country}</span>
                        </span>
                        <span className="font-mono font-bold text-[#FD8F1C] shrink-0">{a.code}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="md:col-span-1 flex justify-center">
              <button
                type="button"
                onClick={swapCities}
                aria-label="Swap departure and destination cities"
                className="p-2.5 rounded-lg border border-[#D9E2EC] bg-white hover:bg-[#F0F4F8] text-[#0F2942] transition-colors"
              >
                <ArrowLeftRight className="w-4 h-4" />
              </button>
            </div>

            <div className="md:col-span-4 relative">
              <label htmlFor="req-dest" className="block text-xs font-semibold text-[#486581] mb-1.5">
                Destination City / Airport *
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-[#FD8F1C] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  id="req-dest"
                  type="text"
                  required
                  value={destinationCity}
                  onFocus={() => loadAirports(destinationCity, 'dest')}
                  onChange={(e) => {
                    setDestinationCity(e.target.value);
                    loadAirports(e.target.value, 'dest');
                  }}
                  placeholder="City or Airport Code (e.g. Dubai DXB)"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#D9E2EC] bg-[#F9F9FA] focus:bg-white text-sm font-medium text-[#0F2942] focus:outline-none focus:border-[#FD8F1C]"
                />
              </div>
              {activeField === 'dest' && suggestions.length > 0 && (
                <ul className="absolute left-0 right-0 mt-1 bg-white border border-[#D9E2EC] rounded-xl shadow-lg max-h-56 overflow-y-auto z-30">
                  {suggestions.map((a) => (
                    <li key={a.code}>
                      <button
                        type="button"
                        onClick={() => applyAirportChoice('dest', a)}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-[#F0F4F8] flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="truncate">
                          <span className="font-semibold text-[#0F2942]">{a.city}</span>{' '}
                          <span className="text-[#627D98]">· {a.country}</span>
                        </span>
                        <span className="font-mono font-bold text-[#FD8F1C] shrink-0">{a.code}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className={tripType === 'round-trip' ? 'md:col-span-3 grid grid-cols-2 gap-2.5' : 'md:col-span-3'}>
              <div>
                <label htmlFor="req-dep-date" className="block text-xs font-semibold text-[#486581] mb-1.5">
                  Departure *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-[#627D98] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                  <input
                    id="req-dep-date"
                    type="date"
                    required
                    min={new Date().toISOString().slice(0, 10)}
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    className="w-full pl-8 pr-2 py-2.5 rounded-lg border border-[#D9E2EC] bg-[#F9F9FA] text-xs sm:text-sm font-medium text-[#0F2942] tabular-nums focus:outline-none focus:border-[#FD8F1C]"
                  />
                </div>
              </div>

              {tripType === 'round-trip' && (
                <div>
                  <label htmlFor="req-ret-date" className="block text-xs font-semibold text-[#486581] mb-1.5">
                    Return *
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-[#627D98] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                    <input
                      id="req-ret-date"
                      type="date"
                      required
                      min={departureDate}
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className="w-full pl-8 pr-2 py-2.5 rounded-lg border border-[#D9E2EC] bg-[#F9F9FA] text-xs sm:text-sm font-medium text-[#0F2942] tabular-nums focus:outline-none focus:border-[#FD8F1C]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3 bg-[#F9F9FA] border border-[#E6ECF2] rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-[#0F2942]">
                Multi-City Flight Segments ({segments.length}/6)
              </p>
              {segments.length < 6 && (
                <button
                  type="button"
                  onClick={addSegment}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#D9E2EC] text-xs font-semibold text-[#FD8F1C] hover:border-[#FD8F1C]"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Segment
                </button>
              )}
            </div>

            {segments.map((seg, idx) => {
              const oKey = `seg-${idx}-origin`;
              const dKey = `seg-${idx}-dest`;
              return (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-white p-3.5 rounded-xl border border-[#E6ECF2]">
                  <div className="md:col-span-4 relative">
                    <label className="block text-xs font-semibold text-[#486581] mb-1">
                      Segment {idx + 1} Departure *
                    </label>
                    <input
                      type="text"
                      required
                      value={seg.origin}
                      onFocus={() => loadAirports(seg.origin, oKey)}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSegments((prev) => prev.map((s, i) => (i === idx ? { ...s, origin: val } : s)));
                        loadAirports(val, oKey);
                      }}
                      placeholder="City / Airport (e.g. DFW)"
                      className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] bg-[#F9F9FA] text-sm text-[#0F2942]"
                    />
                    {activeField === oKey && suggestions.length > 0 && (
                      <ul className="absolute left-0 right-0 mt-1 bg-white border border-[#D9E2EC] rounded-xl shadow-lg max-h-48 overflow-y-auto z-30">
                        {suggestions.map((a) => (
                          <li key={a.code}>
                            <button
                              type="button"
                              onClick={() => applyAirportChoice(oKey, a)}
                              className="w-full text-left px-3 py-2 hover:bg-[#F0F4F8] flex justify-between text-xs"
                            >
                              <span className="truncate font-medium text-[#0F2942]">
                                {a.city} ({a.country})
                              </span>
                              <span className="font-mono font-bold text-[#FD8F1C]">{a.code}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="md:col-span-4 relative">
                    <label className="block text-xs font-semibold text-[#486581] mb-1">
                      Segment {idx + 1} Destination *
                    </label>
                    <input
                      type="text"
                      required
                      value={seg.destination}
                      onFocus={() => loadAirports(seg.destination, dKey)}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSegments((prev) =>
                          prev.map((s, i) => (i === idx ? { ...s, destination: val } : s))
                        );
                        loadAirports(val, dKey);
                      }}
                      placeholder="City / Airport (e.g. DXB)"
                      className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] bg-[#F9F9FA] text-sm text-[#0F2942]"
                    />
                    {activeField === dKey && suggestions.length > 0 && (
                      <ul className="absolute left-0 right-0 mt-1 bg-white border border-[#D9E2EC] rounded-xl shadow-lg max-h-48 overflow-y-auto z-30">
                        {suggestions.map((a) => (
                          <li key={a.code}>
                            <button
                              type="button"
                              onClick={() => applyAirportChoice(dKey, a)}
                              className="w-full text-left px-3 py-2 hover:bg-[#F0F4F8] flex justify-between text-xs"
                            >
                              <span className="truncate font-medium text-[#0F2942]">
                                {a.city} ({a.country})
                              </span>
                              <span className="font-mono font-bold text-[#FD8F1C]">{a.code}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-[#486581] mb-1">
                      Departure Date *
                    </label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().slice(0, 10)}
                      value={seg.departureDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSegments((prev) =>
                          prev.map((s, i) => (i === idx ? { ...s, departureDate: val } : s))
                        );
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] bg-[#F9F9FA] text-sm text-[#0F2942] tabular-nums"
                    />
                  </div>

                  <div className="md:col-span-1 flex justify-end">
                    {segments.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeSegment(idx)}
                        aria-label={`Remove segment ${idx + 1}`}
                        className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Step 3: Preferred Airline & Passenger Counts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2 border-t border-[#E6ECF2]">
          <div className="lg:col-span-5">
            <label htmlFor="preferred-airline" className="block text-xs font-semibold text-[#486581] mb-1.5">
              Preferred Airline (Searchable · Default: Any Airline)
            </label>
            <AirlineSelector
              id="preferred-airline"
              value={preferredAirline}
              onChange={setPreferredAirline}
            />
            <p className="text-[11px] text-[#627D98] mt-1">
              Select a specific carrier or keep &ldquo;Any Airline&rdquo; to receive multi-airline comparisons.
            </p>
          </div>

          <div className="lg:col-span-7">
            <p className="text-xs font-semibold text-[#486581] mb-1.5 inline-flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#FD8F1C]" aria-hidden="true" />
              Passenger Counts *
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Adults', sub: '12+ yrs', value: adults, min: 1, max: 9, setter: setAdults },
                { label: 'Children', sub: '2–11 yrs', value: children, min: 0, max: 8, setter: setChildren },
                { label: 'Infants', sub: '< 2 yrs', value: infants, min: 0, max: 4, setter: setInfants },
              ].map((row) => (
                <div
                  key={row.label}
                  className="bg-[#F9F9FA] border border-[#D9E2EC] rounded-xl p-2.5 flex flex-col justify-between gap-2"
                >
                  <div>
                    <p className="text-xs font-bold text-[#0F2942]">{row.label}</p>
                    <p className="text-[10px] text-[#627D98]">{row.sub}</p>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <button
                      type="button"
                      onClick={() => row.setter(Math.max(row.min, row.value - 1))}
                      aria-label={`Decrease ${row.label}`}
                      className="w-7 h-7 rounded-md border border-[#D9E2EC] bg-white text-[#0F2942] font-bold hover:bg-[#F0F4F8]"
                    >
                      -
                    </button>
                    <span className="text-sm font-bold tabular-nums text-[#0F2942]">{row.value}</span>
                    <button
                      type="button"
                      onClick={() => row.setter(Math.min(row.max, row.value + 1))}
                      aria-label={`Increase ${row.label}`}
                      className="w-7 h-7 rounded-md border border-[#D9E2EC] bg-white text-[#0F2942] font-bold hover:bg-[#F0F4F8]"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Step 4: Traveler Contact Details & Requirements */}
        <div className="space-y-4 pt-2 border-t border-[#E6ECF2]">
          <p className="text-xs font-bold text-[#0F2942] inline-flex items-center gap-1.5">
            <Plane className="w-4 h-4 text-[#FD8F1C]" aria-hidden="true" />
            Lead Passenger &amp; Contact Information
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="req-name" className="block text-xs font-semibold text-[#486581] mb-1.5">
                Passenger Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#627D98] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  id="req-name"
                  type="text"
                  required
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                  placeholder="Full name as on passport"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#D9E2EC] bg-[#F9F9FA] focus:bg-white text-sm text-[#0F2942] focus:outline-none focus:border-[#FD8F1C]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="req-email" className="block text-xs font-semibold text-[#486581] mb-1.5">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#627D98] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  id="req-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#D9E2EC] bg-[#F9F9FA] focus:bg-white text-sm text-[#0F2942] focus:outline-none focus:border-[#FD8F1C]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="req-phone" className="block text-xs font-semibold text-[#486581] mb-1.5">
                WhatsApp / Phone Number *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#627D98] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  id="req-phone"
                  type="tel"
                  required
                  value={phoneWhatsapp}
                  onChange={(e) => setPhoneWhatsapp(e.target.value)}
                  placeholder="+1 571 620 9414"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#D9E2EC] bg-[#F9F9FA] focus:bg-white text-sm text-[#0F2942] focus:outline-none focus:border-[#FD8F1C]"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="req-notes" className="block text-xs font-semibold text-[#486581] mb-1.5">
              Additional Travel Requirements (Optional)
            </label>
            <textarea
              id="req-notes"
              rows={3}
              value={additionalRequirements}
              onChange={(e) => setAdditionalRequirements(e.target.value)}
              placeholder="Flexible dates (+/- 2 days), 3 Check Bags deal eligibility, direct flight preference, meal/wheelchair assistance, hotel stay or Umrah ground transport..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#D9E2EC] bg-[#F9F9FA] focus:bg-white text-sm text-[#0F2942] focus:outline-none focus:border-[#FD8F1C]"
            />
          </div>
        </div>

        {formError && (
          <div role="alert" className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
            {formError}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-[#E6ECF2]">
          <p className="text-xs text-[#627D98] leading-relaxed">
            No upfront payment required. Our specialists manually verify airline availability and send fare
            quotations for your approval.
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#FD8F1C] hover:bg-[#E07A0E] text-white text-sm font-bold shadow-sm transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            {submitting ? 'Submitting Request...' : 'Submit Flight Booking Request'}
          </button>
        </div>
      </form>
    </div>
  );
}
