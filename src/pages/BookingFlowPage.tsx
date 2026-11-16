import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, doc, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  Landmark,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { useAgency } from '../context/AgencyContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatMoney } from '../lib/defaultData';
import { db, generateId, handleFirestoreError, OperationType } from '../lib/firebase';
import { downloadBookingConfirmationPdf } from '../lib/pdfGenerator';
import type {
  BookingRecord,
  FlightOfferResult,
  PassengerInput,
  SavedPassenger,
} from '../types/travel';

interface StoredSelection {
  offer: FlightOfferResult;
  searchMeta?: {
    tripType?: string;
    adults?: number;
    children?: number;
    infants?: number;
    returnDate?: string;
  };
}

interface RevalidationState {
  loading: boolean;
  available: boolean;
  estimatedPrice: number;
  confirmedPrice: number;
  priceChanged: boolean;
  message: string;
}

const STEPS = [
  '1. Flight & Fare Check',
  '2. Passenger Details',
  '3. Booking Summary',
  '4. Payment',
  '5. Confirmation',
];

function buildInitialPassengers(meta?: StoredSelection['searchMeta']): PassengerInput[] {
  const adults = Math.max(1, meta?.adults || 1);
  const children = Math.max(0, meta?.children || 0);
  const infants = Math.max(0, meta?.infants || 0);
  const list: PassengerInput[] = [];
  const pushBlank = (type: PassengerInput['type']) =>
    list.push({
      type,
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: 'Male',
      nationality: 'United States',
      passportNumber: '',
      passportExpiry: '',
    });

  for (let i = 0; i < adults; i++) pushBlank('Adult');
  for (let i = 0; i < children; i++) pushBlank('Child');
  for (let i = 0; i < infants; i++) pushBlank('Infant');
  return list;
}

export function BookingFlowPage() {
  const navigate = useNavigate();
  const { user, profile, loginWithGoogle } = useAuth();
  const { settings } = useAgency();
  const { showToast } = useToast();

  const [selection, setSelection] = useState<StoredSelection | null>(null);
  const [step, setStep] = useState<number>(1);
  const [revalidation, setRevalidation] = useState<RevalidationState>({
    loading: false,
    available: true,
    estimatedPrice: 0,
    confirmedPrice: 0,
    priceChanged: false,
    message: '',
  });

  const [passengers, setPassengers] = useState<PassengerInput[]>([]);
  const [savedPassengers, setSavedPassengers] = useState<SavedPassenger[]>([]);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<string>('Bank Transfer');
  const [transactionRef, setTransactionRef] = useState('');
  const [receiptDataUrl, setReceiptDataUrl] = useState('');
  const [receiptFileName, setReceiptFileName] = useState('');
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<BookingRecord | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('kt_selected_flight');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as StoredSelection;
      setSelection(parsed);
      setPassengers(buildInitialPassengers(parsed.searchMeta));
      runFareRevalidation(parsed.offer);
    } catch {
      // ignore invalid session data
    }
  }, []);

  useEffect(() => {
    if (user || profile) {
      setContactEmail((prev) => prev || profile?.email || user?.email || '');
      setContactPhone((prev) => prev || profile?.phone || '');
      setContactWhatsapp((prev) => prev || profile?.whatsapp || profile?.phone || '');
    }
  }, [user, profile]);

  useEffect(() => {
    if (!user) {
      setSavedPassengers([]);
      return;
    }
    const unsub = onSnapshot(
      query(collection(db, 'passengers'), where('userId', '==', user.uid)),
      (snap) => {
        setSavedPassengers(snap.docs.map((d) => d.data() as SavedPassenger));
      },
      () => {}
    );
    return () => unsub();
  }, [user]);

  const runFareRevalidation = async (offer: FlightOfferResult) => {
    setRevalidation({
      loading: true,
      available: true,
      estimatedPrice: offer.totalPrice,
      confirmedPrice: offer.totalPrice,
      priceChanged: false,
      message: 'Revalidating flight fare and seat rules...',
    });
    try {
      const res = await fetch('/api/flights/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Revalidation error');
      setRevalidation({
        loading: false,
        available: data.available,
        estimatedPrice: data.estimatedPrice,
        confirmedPrice: data.confirmedPrice,
        priceChanged: data.priceChanged,
        message: data.message,
      });
    } catch (err) {
      setRevalidation({
        loading: false,
        available: true,
        estimatedPrice: offer.totalPrice,
        confirmedPrice: offer.totalPrice,
        priceChanged: false,
        message:
          err instanceof Error ? err.message : 'Unable to reach supplier; proceeding with estimated quotation.',
      });
    }
  };

  if (!selection) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="bg-white border border-[#D9E2EC] rounded-2xl p-10">
          <h1 className="font-display text-2xl font-bold text-[#102A43]">No Flight Selected</h1>
          <p className="text-sm text-[#486581] mt-2">
            Please search and select a flight itinerary before starting passenger checkout.
          </p>
          <Link
            to="/flights"
            className="mt-6 inline-block px-6 py-2.5 rounded-lg bg-[#102A43] text-white text-sm font-semibold"
          >
            Search Flights
          </Link>
        </div>
      </div>
    );
  }

  const offer = selection.offer;
  const activeTotal = revalidation.confirmedPrice || offer.totalPrice;

  const validatePassengersAndContact = (): boolean => {
    setFormError(null);
    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i];
      if (!p.firstName.trim() || !p.lastName.trim()) {
        setFormError(`Passenger ${i + 1}: First name and last name are required (as per passport).`);
        return false;
      }
      if (!p.dateOfBirth) {
        setFormError(`Passenger ${i + 1}: Date of birth is required.`);
        return false;
      }
      if (!p.nationality.trim()) {
        setFormError(`Passenger ${i + 1}: Nationality is required.`);
        return false;
      }
      if (p.passportNumber.trim() && p.passportExpiry) {
        if (p.passportExpiry <= new Date().toISOString().slice(0, 10)) {
          setFormError(`Passenger ${i + 1}: Passport expiry date cannot be in the past.`);
          return false;
        }
      }
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      setFormError('Please provide a valid contact email address.');
      return false;
    }
    if (contactPhone.trim().length < 7) {
      setFormError('Please provide a valid contact phone number.');
      return false;
    }
    if (contactWhatsapp.trim().length < 7) {
      setFormError('Please provide a valid WhatsApp number for booking updates.');
      return false;
    }
    return true;
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      showToast('Unsupported File', 'Please upload a JPG, PNG, WebP, or PDF receipt.', 'error');
      return;
    }
    if (file.size > 450 * 1024) {
      showToast(
        'File Too Large',
        'Receipt file must be 450 KB or smaller for secure storage.',
        'error'
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setReceiptDataUrl(String(reader.result || ''));
      setReceiptFileName(file.name);
      showToast('Receipt Attached', `${file.name} ready for verification submission.`, 'success');
    };
    reader.readAsDataURL(file);
  };

  const submitBooking = async (modeType: 'submit_with_receipt' | 'submit_pay_later' | 'online_gateway') => {
    if (!user) {
      showToast('Sign In Required', 'Please sign in with your account to submit a booking.', 'error');
      return;
    }
    if (profile?.status === 'blocked') {
      showToast('Account Restricted', 'Your account is currently suspended. Contact support.', 'error');
      return;
    }
    if (modeType === 'submit_with_receipt' && !receiptDataUrl) {
      showToast('Receipt Missing', 'Please attach your payment receipt or choose Pay Later.', 'error');
      return;
    }

    setSubmittingBooking(true);
    const bookingId = generateId('bkg');
    const bookingReference = `KTR-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const hasReceipt = modeType === 'submit_with_receipt' && Boolean(receiptDataUrl);

    try {
      // 1. Create Booking document first (strict rules require initial paymentStatus='unpaid', bookingStatus='Pending Payment' or 'New Request')
      const initialBookingPayload = {
        bookingId,
        bookingReference,
        userId: user.uid,
        mode: settings.operatingMode,
        flightDetails: {
          id: offer.id,
          provider: offer.provider,
          pricingType: offer.pricingType,
          airline: offer.airline,
          airlineCode: offer.airlineCode,
          flightNumber: offer.flightNumber,
          origin: offer.origin,
          originCode: offer.originCode,
          destination: offer.destination,
          destinationCode: offer.destinationCode,
          departureDate: offer.departureDate,
          departureTime: offer.departureTime,
          arrivalTime: offer.arrivalTime,
          durationMinutes: offer.durationMinutes,
          stops: offer.stops,
          baggageAllowance: offer.baggageAllowance,
          cabinClass: offer.cabinClass,
          refundable: offer.refundable,
          refundRules: offer.refundRules,
          returnDate: selection.searchMeta?.returnDate || '',
        },
        passengers,
        contactDetails: {
          email: contactEmail.trim(),
          phone: contactPhone.trim(),
          whatsapp: contactWhatsapp.trim(),
        },
        fareBreakdown: {
          ...offer.fareBreakdown,
          totalAmount: activeTotal,
        },
        totalAmount: activeTotal,
        currency: offer.currency,
        paymentMethod,
        paymentStatus: 'unpaid',
        bookingStatus: offer.totalPrice === 0 ? 'New Request' : 'Pending Payment',
        supplierProvider: offer.provider,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      try {
        await setDoc(doc(db, 'bookings', bookingId), initialBookingPayload);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `bookings/${bookingId}`);
      }

      let finalPaymentStatus: BookingRecord['paymentStatus'] = 'unpaid';
      let finalBookingStatus: BookingRecord['bookingStatus'] =
        offer.totalPrice === 0 ? 'New Request' : 'Pending Payment';

      // 2. If online gateway was chosen, initiate server-side checkout session
      if (modeType === 'online_gateway') {
        const gwRes = await fetch('/api/payments/gateway-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId,
            bookingReference,
            amount: activeTotal,
            currency: offer.currency,
            customerEmail: contactEmail.trim(),
            gateway: 'card_stripe',
          }),
        });
        const gwData = await gwRes.json();
        if (gwData.configured && gwData.checkoutUrl) {
          window.location.href = gwData.checkoutUrl;
          return;
        }
        showToast('Gateway Not Configured', gwData.message, 'info');
      }

      // 3. If customer attached a manual receipt, create /payments/{paymentId} with verificationStatus='pending'
      if (hasReceipt) {
        const paymentId = generateId('pay');
        try {
          await setDoc(doc(db, 'payments', paymentId), {
            paymentId,
            bookingId,
            userId: user.uid,
            amount: activeTotal,
            currency: offer.currency,
            paymentMethod,
            receiptUrl: receiptDataUrl,
            receiptFileName: receiptFileName || 'receipt',
            transactionReference: transactionRef.trim() || 'Manual Receipt Upload',
            verificationStatus: 'pending',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `payments/${paymentId}`);
        }

        // Transition booking to Payment Verification (never confirmed until admin verifies!)
        try {
          await setDoc(
            doc(db, 'bookings', bookingId),
            {
              paymentMethod,
              paymentStatus: 'pending_verification',
              bookingStatus: 'Payment Verification',
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
          finalPaymentStatus = 'pending_verification';
          finalBookingStatus = 'Payment Verification';
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `bookings/${bookingId}`);
        }
      }

      // 4. Create customer notification record
      const notifId = generateId('ntf');
      try {
        await setDoc(doc(db, 'notifications', notifId), {
          notificationId: notifId,
          userId: user.uid,
          bookingId,
          type: hasReceipt ? 'Payment Received' : 'Booking Request Received',
          title: hasReceipt
            ? `Payment Receipt Received (${bookingReference})`
            : `Booking Request Received (${bookingReference})`,
          message: hasReceipt
            ? 'Your receipt has been uploaded and is pending admin verification.'
            : 'Your booking request is recorded. Upload payment proof from My Bookings to proceed.',
          read: false,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Notification record error:', err);
      }

      // 5. Trigger server email/WhatsApp dispatch if configured
      fetch('/api/notifications/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: hasReceipt ? 'Payment Received' : 'Booking Request Received',
          bookingReference,
          recipientEmail: contactEmail.trim(),
          recipientPhone: contactWhatsapp.trim(),
          customerName: `${passengers[0].firstName} ${passengers[0].lastName}`.trim(),
          subject: `Booking Request ${bookingReference} — The King Travel`,
          message: hasReceipt
            ? `We received your booking request (${bookingReference}) and uploaded payment receipt. Our accounts desk will verify your transfer shortly.`
            : `We received your booking request (${bookingReference}). Complete payment and upload your receipt in My Bookings to proceed with ticketing.`,
        }),
      }).catch(() => {});

      const completedRecord: BookingRecord = {
        ...initialBookingPayload,
        paymentStatus: finalPaymentStatus,
        bookingStatus: finalBookingStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setCreatedBooking(completedRecord);
      setStep(5);
      sessionStorage.removeItem('kt_selected_flight');
      showToast('Booking Submitted', `Reference ${bookingReference} created.`, 'success');
    } catch (err) {
      showToast(
        'Submission Error',
        err instanceof Error ? err.message : 'Unable to save booking.',
        'error'
      );
    } finally {
      setSubmittingBooking(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Step Progress Header */}
      <nav aria-label="Booking progress" className="mb-8">
        <ol className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {STEPS.map((label, idx) => {
            const num = idx + 1;
            const active = step === num;
            const completed = step > num;
            return (
              <li
                key={label}
                className={`px-3 py-2.5 rounded-lg border text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-[#102A43] text-white border-[#102A43]'
                    : completed
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-white text-[#627D98] border-[#D9E2EC]'
                }`}
              >
                {label}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* STEP 1: Flight Selection & Revalidation */}
      {step === 1 && (
        <div className="bg-white border border-[#D9E2EC] rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E6ECF2] pb-5">
            <div>
              <p className="text-xs font-semibold text-[#168AAD]">Step 1 · Flight & Fare Check</p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#102A43] mt-1">
                {offer.originCode} → {offer.destinationCode} · {offer.airline}
              </h1>
              <p className="text-sm text-[#486581] mt-1">
                {offer.flightNumber} · {offer.departureDate} · {offer.cabinClass} · {offer.baggageAllowance}
              </p>
            </div>
            <button
              type="button"
              onClick={() => runFareRevalidation(offer)}
              disabled={revalidation.loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#D9E2EC] text-xs font-semibold text-[#102A43] hover:bg-[#F7F9FC]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${revalidation.loading ? 'animate-spin' : ''}`} />
              Revalidate Fare
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#F7F9FC] border border-[#D9E2EC] rounded-xl p-5 space-y-2">
              <p className="text-xs font-semibold text-[#486581]">Fare Revalidation Status</p>
              {revalidation.loading ? (
                <p className="text-sm text-[#102A43] inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#168AAD]" />
                  Checking live fare & availability...
                </p>
              ) : (
                <>
                  <p className="text-sm font-bold text-[#102A43] inline-flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    {revalidation.available ? 'Itinerary Available for Request' : 'Availability Changed'}
                  </p>
                  <p className="text-xs text-[#486581] leading-relaxed">{revalidation.message}</p>
                </>
              )}
            </div>

            <div className="bg-[#F7F9FC] border border-[#D9E2EC] rounded-xl p-5 space-y-2">
              <p className="text-xs font-semibold text-[#486581]">Estimated vs Confirmed Price</p>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-[#486581]">Estimated Search Price:</span>
                <span className="font-mono font-semibold text-[#102A43] tabular-nums">
                  {formatMoney(revalidation.estimatedPrice, offer.currency)}
                </span>
              </div>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-[#486581]">
                  {offer.pricingType === 'confirmed_supplier'
                    ? 'Confirmed Supplier Fare:'
                    : 'Current Payable Quote:'}
                </span>
                <span className="font-mono text-lg font-bold text-[#102A43] tabular-nums">
                  {activeTotal > 0 ? formatMoney(activeTotal, offer.currency) : 'Quotation Pending'}
                </span>
              </div>
            </div>
          </div>

          <div className="text-xs text-[#486581] bg-[#F7F9FC] border border-[#D9E2EC] rounded-xl p-4">
            <strong className="text-[#102A43]">Refund & Cancellation Rules:</strong> {offer.refundRules}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#E6ECF2]">
            <Link to="/flights" className="text-sm font-semibold text-[#486581] hover:text-[#102A43]">
              ← Change Flight
            </Link>
            <button
              type="button"
              disabled={!revalidation.available || revalidation.loading}
              onClick={() => setStep(2)}
              className="px-6 py-2.5 rounded-lg bg-[#102A43] hover:bg-[#1C3D5A] text-white text-sm font-semibold disabled:opacity-50"
            >
              Continue to Passenger Details →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Passenger Details */}
      {step === 2 && (
        <div className="bg-white border border-[#D9E2EC] rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6ECF2] pb-4">
            <div>
              <p className="text-xs font-semibold text-[#168AAD]">Step 2 · Passenger Manifest</p>
              <h2 className="font-display text-2xl font-bold text-[#102A43] mt-1">
                Passenger & Contact Information
              </h2>
            </div>
            {passengers.length < 9 && (
              <button
                type="button"
                onClick={() =>
                  setPassengers((prev) => [
                    ...prev,
                    {
                      type: 'Adult',
                      firstName: '',
                      lastName: '',
                      dateOfBirth: '',
                      gender: 'Male',
                      nationality: 'United States',
                      passportNumber: '',
                      passportExpiry: '',
                    },
                  ])
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#D9E2EC] text-xs font-semibold text-[#0F2942] hover:bg-[#F9F9FA]"
              >
                <Plus className="w-4 h-4" /> Add Passenger
              </button>
            )}
          </div>

          {!user ? (
            <div className="bg-[#F9F9FA] border border-[#D9E2EC] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-[#243B53]">
                <p className="font-bold text-[#0F2942]">Sign in to save your booking in My Bookings</p>
                <p className="mt-0.5 text-[#486581]">
                  You can enter passenger details now and sign in with Google before final submission.
                </p>
              </div>
              <button
                type="button"
                onClick={() => loginWithGoogle().catch(() => {})}
                className="px-4 py-2 rounded-lg bg-[#0F2942] text-white text-xs font-semibold whitespace-nowrap shrink-0"
              >
                Sign in with Google
              </button>
            </div>
          ) : savedPassengers.length === 0 ? (
            <div className="bg-[#F9F9FA] border border-[#D9E2EC] rounded-xl px-4 py-3 text-xs text-[#486581] flex flex-wrap items-center justify-between gap-2">
              <span>Tip: You can store frequent traveler details in your portal for faster checkout.</span>
              <Link to="/my-bookings" className="font-semibold text-[#FD8F1C] hover:underline">
                Manage Saved Travelers →
              </Link>
            </div>
          ) : null}

          {passengers.map((p, idx) => (
            <div key={idx} className="border border-[#D9E2EC] rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-[#0F2942]">
                  Passenger {idx + 1} · {p.type}
                </h3>
                <div className="flex items-center gap-3">
                  {savedPassengers.length > 0 && (
                    <select
                      aria-label={`Fill Passenger ${idx + 1} from saved traveler`}
                      defaultValue=""
                      onChange={(e) => {
                        const selected = savedPassengers.find((sp) => sp.passengerId === e.target.value);
                        if (!selected) return;
                        const next = [...passengers];
                        next[idx] = {
                          ...next[idx],
                          firstName: selected.firstName,
                          lastName: selected.lastName,
                          dateOfBirth: selected.dateOfBirth,
                          gender: selected.gender,
                          nationality: selected.nationality,
                          passportNumber: selected.passportNumber || '',
                          passportExpiry: selected.passportExpiry || '',
                        };
                        setPassengers(next);
                        showToast('Traveler Pre-filled', `${selected.firstName} ${selected.lastName} loaded.`, 'info');
                      }}
                      className="px-3 py-1.5 rounded-lg border border-[#D9E2EC] bg-[#F9F9FA] text-xs font-medium text-[#0F2942]"
                    >
                      <option value="">Fill from Saved Traveler...</option>
                      {savedPassengers.map((sp) => (
                        <option key={sp.passengerId} value={sp.passengerId}>
                          {sp.firstName} {sp.lastName} ({sp.nationality})
                        </option>
                      ))}
                    </select>
                  )}
                  {passengers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setPassengers(passengers.filter((_, i) => i !== idx))}
                      className="text-xs text-red-600 hover:underline inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#486581] mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={p.firstName}
                    onChange={(e) => {
                      const next = [...passengers];
                      next[idx].firstName = e.target.value;
                      setPassengers(next);
                    }}
                    placeholder="As on passport"
                    className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#102A43]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#486581] mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={p.lastName}
                    onChange={(e) => {
                      const next = [...passengers];
                      next[idx].lastName = e.target.value;
                      setPassengers(next);
                    }}
                    placeholder="Surname"
                    className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#102A43]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#486581] mb-1">
                    Passenger Type
                  </label>
                  <select
                    value={p.type}
                    onChange={(e) => {
                      const next = [...passengers];
                      next[idx].type = e.target.value as PassengerInput['type'];
                      setPassengers(next);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#102A43]"
                  >
                    <option value="Adult">Adult</option>
                    <option value="Child">Child</option>
                    <option value="Infant">Infant</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#486581] mb-1">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    value={p.dateOfBirth}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => {
                      const next = [...passengers];
                      next[idx].dateOfBirth = e.target.value;
                      setPassengers(next);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#102A43] tabular-nums"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#486581] mb-1">
                    Gender *
                  </label>
                  <select
                    value={p.gender}
                    onChange={(e) => {
                      const next = [...passengers];
                      next[idx].gender = e.target.value as PassengerInput['gender'];
                      setPassengers(next);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#102A43]"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#486581] mb-1">
                    Nationality *
                  </label>
                  <input
                    type="text"
                    value={p.nationality}
                    onChange={(e) => {
                      const next = [...passengers];
                      next[idx].nationality = e.target.value;
                      setPassengers(next);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#102A43]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#486581] mb-1">
                    Passport Number (Required for International)
                  </label>
                  <input
                    type="text"
                    value={p.passportNumber}
                    onChange={(e) => {
                      const next = [...passengers];
                      next[idx].passportNumber = e.target.value.toUpperCase();
                      setPassengers(next);
                    }}
                    placeholder="e.g. AB1234567"
                    className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm font-mono text-[#102A43]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#486581] mb-1">
                    Passport Expiry Date
                  </label>
                  <input
                    type="date"
                    value={p.passportExpiry}
                    onChange={(e) => {
                      const next = [...passengers];
                      next[idx].passportExpiry = e.target.value;
                      setPassengers(next);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#102A43] tabular-nums"
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Contact Details */}
          <div className="border border-[#D9E2EC] rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#102A43]">Primary Booking Contact Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#486581] mb-1">Email *</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="traveler@example.com"
                  className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#102A43]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#486581] mb-1">Phone Number *</label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+1 571 000 0000"
                  className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#0F2942]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#486581] mb-1">WhatsApp Number *</label>
                <input
                  type="tel"
                  value={contactWhatsapp}
                  onChange={(e) => setContactWhatsapp(e.target.value)}
                  placeholder="+1 571 000 0000"
                  className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#0F2942]"
                  required
                />
              </div>
            </div>
          </div>

          {formError && (
            <p role="alert" className="text-sm font-medium text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {formError}
            </p>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-[#E6ECF2]">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-sm font-semibold text-[#486581] hover:text-[#102A43]"
            >
              ← Back to Flight Check
            </button>
            <button
              type="button"
              onClick={() => {
                if (validatePassengersAndContact()) setStep(3);
              }}
              className="px-6 py-2.5 rounded-lg bg-[#102A43] hover:bg-[#1C3D5A] text-white text-sm font-semibold"
            >
              Review Booking Summary →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Booking Summary */}
      {step === 3 && (
        <div className="bg-white border border-[#D9E2EC] rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="border-b border-[#E6ECF2] pb-4">
            <p className="text-xs font-semibold text-[#168AAD]">Step 3 · Review & Verify</p>
            <h2 className="font-display text-2xl font-bold text-[#102A43] mt-1">Booking Summary</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="border border-[#D9E2EC] rounded-xl p-4">
                <h3 className="text-xs font-bold text-[#486581] mb-2">Selected Flight</h3>
                <p className="text-base font-bold text-[#102A43]">
                  {offer.airline} ({offer.flightNumber})
                </p>
                <p className="text-sm text-[#243B53] mt-1">
                  {offer.originCode} → {offer.destinationCode} · {offer.departureDate}
                </p>
                <p className="text-xs text-[#627D98] mt-1">
                  {offer.cabinClass} · {offer.baggageAllowance}
                </p>
              </div>

              <div className="border border-[#D9E2EC] rounded-xl p-4">
                <h3 className="text-xs font-bold text-[#486581] mb-2">
                  Passengers ({passengers.length})
                </h3>
                <ul className="space-y-2 text-sm text-[#102A43]">
                  {passengers.map((p, idx) => (
                    <li key={idx} className="flex justify-between gap-2 border-b border-[#F0F4F8] pb-1.5 last:border-0">
                      <span className="font-medium">
                        {p.firstName} {p.lastName} ({p.type})
                      </span>
                      <span className="font-mono text-xs text-[#627D98]">
                        {p.passportNumber || p.nationality}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="border border-[#D9E2EC] rounded-xl p-5 flex flex-col justify-between bg-[#F7F9FC]">
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-[#102A43]">Fare & Tax Breakdown</h3>
                <div className="flex justify-between text-sm text-[#486581]">
                  <span>Base Fare</span>
                  <span className="font-mono tabular-nums">
                    {formatMoney(offer.fareBreakdown.baseFare, offer.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-[#486581]">
                  <span>Airline Taxes & Airport Fees</span>
                  <span className="font-mono tabular-nums">
                    {formatMoney(offer.fareBreakdown.taxes, offer.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-[#486581]">
                  <span>Agency Service Charges</span>
                  <span className="font-mono tabular-nums">
                    {formatMoney(offer.fareBreakdown.serviceCharges, offer.currency)}
                  </span>
                </div>
                <div className="pt-3 border-t border-[#D9E2EC] flex justify-between items-baseline">
                  <span className="text-sm font-bold text-[#102A43]">Total Amount</span>
                  <span className="font-mono text-xl font-bold text-[#102A43] tabular-nums">
                    {activeTotal > 0 ? formatMoney(activeTotal, offer.currency) : 'Quotation Desk'}
                  </span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-[#D9E2EC] text-xs text-[#486581] space-y-1.5">
                <p>
                  <strong className="text-[#102A43]">Refund & Cancellation Rules:</strong> {offer.refundRules}
                </p>
                <p>
                  Note: Platform confirmation does not issue an airline boarding ticket immediately. Official e-tickets are delivered after payment verification and supplier ticketing.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#E6ECF2]">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-sm font-semibold text-[#486581] hover:text-[#102A43]"
            >
              ← Edit Passengers
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="px-6 py-2.5 rounded-lg bg-[#102A43] hover:bg-[#1C3D5A] text-white text-sm font-semibold"
            >
              Proceed to Payment →
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Payment */}
      {step === 4 && (
        <div className="bg-white border border-[#D9E2EC] rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="border-b border-[#E6ECF2] pb-4">
            <p className="text-xs font-semibold text-[#168AAD]">Step 4 · Secure Payment</p>
            <h2 className="font-display text-2xl font-bold text-[#102A43] mt-1">
              Select Payment Method
            </h2>
          </div>

          {!user && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-amber-900">Sign in required to submit booking</p>
                <p className="text-xs text-amber-800 mt-0.5">
                  Sign in with Google so your booking, uploaded receipts, and e-tickets are securely linked to your account.
                </p>
              </div>
              <button
                type="button"
                onClick={() => loginWithGoogle().catch(() => {})}
                className="px-5 py-2.5 rounded-lg bg-[#102A43] text-white text-xs font-semibold whitespace-nowrap shrink-0"
              >
                Sign in with Google
              </button>
            </div>
          )}

          {/* Available Payment Methods */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { id: 'Bank Transfer', enabled: settings.paymentMethods.bankTransfer, icon: Landmark },
              { id: 'JazzCash', enabled: settings.paymentMethods.jazzCash, icon: FileText },
              { id: 'Easypaisa', enabled: settings.paymentMethods.easypaisa, icon: FileText },
              { id: 'Credit/Debit Card', enabled: settings.paymentMethods.cardGateway, icon: CreditCard },
            ]
              .filter((m) => m.enabled)
              .map((method) => {
                const Icon = method.icon;
                const active = paymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`p-4 rounded-xl border text-left transition-colors ${
                      active
                        ? 'border-[#0F2942] bg-[#0F2942] text-white'
                        : 'border-[#D9E2EC] bg-[#F9F9FA] text-[#0F2942] hover:border-[#FD8F1C]'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-2 ${active ? 'text-[#FD8F1C]' : 'text-[#FD8F1C]'}`} />
                    <p className="text-sm font-bold">{method.id}</p>
                    <p className={`text-[11px] mt-0.5 ${active ? 'text-[#BCCCDC]' : 'text-[#627D98]'}`}>
                      {method.id === 'Credit/Debit Card' ? 'Online Gateway' : 'Manual Verification'}
                    </p>
                  </button>
                );
              })}
          </div>

          {/* Method-Specific Instructions */}
          {paymentMethod !== 'Credit/Debit Card' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#F7F9FC] border border-[#D9E2EC] rounded-xl p-5 space-y-2.5 text-sm">
                <h3 className="font-bold text-[#102A43]">Agency Payment Account Details</h3>
                {paymentMethod === 'Bank Transfer' && (
                  <>
                    <p><span className="text-[#627D98]">Bank Name:</span> {settings.bankDetails.bankName}</p>
                    <p><span className="text-[#627D98]">Account Title:</span> {settings.bankDetails.accountTitle}</p>
                    <p className="font-mono text-xs"><span className="text-[#627D98] font-sans">Account No:</span> {settings.bankDetails.accountNumber}</p>
                    <p className="font-mono text-xs"><span className="text-[#627D98] font-sans">IBAN:</span> {settings.bankDetails.iban}</p>
                  </>
                )}
                {paymentMethod === 'JazzCash' && (
                  <p><span className="text-[#627D98]">JazzCash Account:</span> {settings.bankDetails.jazzCashNumber}</p>
                )}
                {paymentMethod === 'Easypaisa' && (
                  <p><span className="text-[#627D98]">Easypaisa Account:</span> {settings.bankDetails.easypaisaNumber}</p>
                )}
                <p className="text-xs text-[#486581] pt-2 border-t border-[#D9E2EC] leading-relaxed">
                  {settings.bankDetails.instructions}
                </p>
              </div>

              <div className="border border-[#D9E2EC] rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-[#102A43]">Upload Payment Receipt</h3>
                <div>
                  <label className="block text-xs font-semibold text-[#486581] mb-1">
                    Transaction / Reference ID
                  </label>
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="e.g. IBFT-9823412"
                    className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm font-mono text-[#102A43]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#486581] mb-1.5">
                    Attach Receipt Screenshot or PDF (max 450 KB)
                  </label>
                  <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-[#829AB1] bg-[#F7F9FC] hover:bg-[#F0F4F8] cursor-pointer text-xs font-semibold text-[#102A43]">
                    <Upload className="w-4 h-4 text-[#168AAD]" />
                    <span>{receiptFileName || 'Choose Receipt File (JPG, PNG, PDF)'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={handleReceiptUpload}
                      className="sr-only"
                    />
                  </label>
                </div>
                <p className="text-[11px] text-[#627D98]">
                  Security Notice: Uploading a receipt submits your payment for manual admin verification. Bookings are never marked paid automatically from screenshots.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-[#F7F9FC] border border-[#D9E2EC] rounded-xl p-5 text-sm text-[#243B53]">
              <p className="font-bold text-[#102A43]">Server-Verified Card Checkout</p>
              <p className="text-xs text-[#486581] mt-1 leading-relaxed">
                Clicking below initiates a server-side payment gateway session if Stripe/PayFast keys are configured. Payments are confirmed strictly via signed server webhook callbacks.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#E6ECF2]">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="text-sm font-semibold text-[#486581] hover:text-[#102A43]"
            >
              ← Back to Summary
            </button>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={!user || submittingBooking}
                onClick={() => submitBooking('submit_pay_later')}
                className="px-4 py-2.5 rounded-lg border border-[#102A43] text-[#102A43] text-xs font-semibold hover:bg-[#F7F9FC] disabled:opacity-50"
              >
                Submit Request & Upload Receipt Later
              </button>
              {paymentMethod === 'Credit/Debit Card' ? (
                <button
                  type="button"
                  disabled={!user || submittingBooking}
                  onClick={() => submitBooking('online_gateway')}
                  className="px-6 py-2.5 rounded-lg bg-[#FD8F1C] hover:bg-[#E07A0E] text-white text-sm font-bold disabled:opacity-50"
                >
                  {submittingBooking ? 'Submitting...' : 'Proceed to Card Gateway'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!user || submittingBooking || !receiptDataUrl}
                  onClick={() => submitBooking('submit_with_receipt')}
                  className="px-6 py-2.5 rounded-lg bg-[#FD8F1C] hover:bg-[#E07A0E] text-white text-sm font-bold disabled:opacity-50"
                >
                  {submittingBooking ? 'Submitting...' : 'Submit Booking & Receipt'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: Booking Confirmation */}
      {step === 5 && createdBooking && (
        <div className="bg-white border border-[#D9E2EC] rounded-2xl p-6 sm:p-10 space-y-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
          <div>
            <p className="text-xs font-semibold text-[#168AAD]">Booking Reference</p>
            <h1 className="font-mono text-3xl font-bold text-[#102A43] mt-1">
              {createdBooking.bookingReference}
            </h1>
            <p className="text-sm text-[#486581] mt-2 max-w-xl mx-auto">
              Your booking request has been recorded with status{' '}
              <strong className="text-[#102A43]">{createdBooking.bookingStatus}</strong>.
              {createdBooking.mode === 'demo' &&
                ' (Created in Demo Sandbox Mode for workflow verification.)'}
            </p>
          </div>

          <div className="max-w-xl mx-auto bg-[#F7F9FC] border border-[#D9E2EC] rounded-xl p-4 text-xs text-[#243B53] text-left">
            <strong className="text-[#102A43]">Important Travel Document Notice:</strong> The PDF confirmation generated below is an agency booking record and invoice. It is not an airline-issued ticket. Your actual e-ticket PDF will appear in your Customer Dashboard once payment is verified and the supplier issues your PNR.
          </div>

          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={() => downloadBookingConfirmationPdf(createdBooking, settings.agencyName)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#102A43] text-[#102A43] text-sm font-semibold hover:bg-[#F7F9FC]"
            >
              <Download className="w-4 h-4" />
              Download Booking Confirmation PDF
            </button>
            <button
              type="button"
              onClick={() => navigate(`/booking/${createdBooking.bookingId}`)}
              className="px-6 py-2.5 rounded-lg bg-[#102A43] hover:bg-[#1C3D5A] text-white text-sm font-semibold"
            >
              Track Booking Status
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
