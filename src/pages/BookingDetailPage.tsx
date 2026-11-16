import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import { useAgency } from '../context/AgencyContext';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../lib/defaultData';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { downloadBookingConfirmationPdf } from '../lib/pdfGenerator';
import type { BookingRecord } from '../types/travel';

export function BookingDetailPage() {
  const { bookingId } = useParams();
  const { user, authReady } = useAuth();
  const { settings } = useAgency();
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authReady) return;
    if (!user || !bookingId) {
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(
      doc(db, 'bookings', bookingId),
      (snap) => {
        if (snap.exists()) {
          setBooking(snap.data() as BookingRecord);
        } else {
          setError('Booking record not found.');
        }
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        setError('Unable to access this booking record.');
        handleFirestoreError(err, OperationType.GET, `bookings/${bookingId}`);
      }
    );

    return () => unsub();
  }, [authReady, user, bookingId]);

  if (!authReady || loading) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-sm text-[#627D98]">Loading booking...</div>;
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-white border border-[#D9E2EC] rounded-xl p-8">
          <h1 className="font-display text-2xl font-bold text-[#102A43]">Sign In Required</h1>
          <p className="text-sm text-[#486581] mt-2">Sign in to view this private booking record.</p>
          <Link to="/login" className="mt-5 inline-block px-5 py-2.5 rounded-lg bg-[#102A43] text-white text-xs font-semibold">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-white border border-[#D9E2EC] rounded-xl p-8">
          <p className="text-sm font-semibold text-red-600">{error || 'Booking not found'}</p>
          <Link to="/my-bookings" className="mt-4 inline-block text-xs font-semibold text-[#168AAD] hover:underline">
            ← Back to My Bookings
          </Link>
        </div>
      </div>
    );
  }

  const fd = booking.flightDetails || {};
  const canDownloadTicket = booking.bookingStatus === 'Ticket Issued' && Boolean(booking.ticketFileUrl);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <Link to="/my-bookings" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#486581] hover:text-[#102A43]">
        <ArrowLeft className="w-4 h-4" /> Back to My Bookings
      </Link>

      <div className="bg-white border border-[#D9E2EC] rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E6ECF2] pb-5">
          <div>
            <p className="text-xs font-semibold text-[#168AAD]">Booking Reference</p>
            <h1 className="font-mono text-2xl sm:text-3xl font-bold text-[#102A43] mt-1">
              {booking.bookingReference}
            </h1>
            <p className="text-xs text-[#627D98] mt-1">
              Mode: {booking.mode === 'demo' ? 'Demo Sandbox' : 'Live Booking'} · Payment: {booking.paymentStatus.replace(/_/g, ' ')}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs text-[#627D98]">Current Status</p>
            <p className="text-base font-bold text-[#102A43]">{booking.bookingStatus}</p>
            {booking.supplierReference && (
              <p className="font-mono text-xs text-emerald-700 mt-1">PNR: {booking.supplierReference}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-[#D9E2EC] rounded-xl p-4 space-y-2 text-sm">
            <h2 className="text-xs font-bold text-[#486581]">Flight Itinerary</h2>
            <p className="font-bold text-[#102A43]">
              {fd.originCode} → {fd.destinationCode} · {fd.airline}
            </p>
            <p className="text-xs text-[#486581]">Flight: {fd.flightNumber} · {fd.cabinClass}</p>
            <p className="text-xs text-[#486581]">Departure Date: {fd.departureDate}</p>
            <p className="text-xs text-[#486581]">Baggage: {fd.baggageAllowance}</p>
          </div>

          <div className="border border-[#D9E2EC] rounded-xl p-4 space-y-2 text-sm">
            <h2 className="text-xs font-bold text-[#486581]">Total & Payment</h2>
            <p className="font-mono text-xl font-bold text-[#102A43] tabular-nums">
              {booking.totalAmount > 0 ? formatMoney(booking.totalAmount, booking.currency) : 'Quotation Pending'}
            </p>
            <p className="text-xs text-[#486581]">Payment Method: {booking.paymentMethod}</p>
            <p className="text-xs text-[#486581]">Contact: {booking.contactDetails?.email}</p>
          </div>
        </div>

        <div className="border border-[#D9E2EC] rounded-xl p-4">
          <h2 className="text-xs font-bold text-[#486581] mb-3">Passengers</h2>
          <div className="space-y-2 text-sm">
            {(booking.passengers || []).map((p, i) => (
              <div key={i} className="flex flex-wrap justify-between gap-2 border-b border-[#F0F4F8] pb-2 last:border-0">
                <span className="font-semibold text-[#102A43]">
                  {i + 1}. {p.firstName} {p.lastName} ({p.type})
                </span>
                <span className="text-xs text-[#627D98] font-mono">
                  {p.nationality} {p.passportNumber ? `· ${p.passportNumber}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-[#E6ECF2]">
          <button
            type="button"
            onClick={() => downloadBookingConfirmationPdf(booking, settings.agencyName)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#102A43] text-[#102A43] text-xs font-semibold hover:bg-[#F7F9FC]"
          >
            <FileText className="w-4 h-4" /> Download Confirmation Invoice PDF
          </button>
          {canDownloadTicket && (
            <a
              href={booking.ticketFileUrl}
              download={booking.ticketFileName || `${booking.bookingReference}_Eticket.pdf`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-700 text-white text-xs font-bold"
            >
              <Download className="w-4 h-4" /> Download Official E-Ticket PDF
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
