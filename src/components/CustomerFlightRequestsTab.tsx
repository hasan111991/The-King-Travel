import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import {
  Briefcase,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Plane,
  ShieldCheck,
  Upload,
  XCircle,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import { formatMoney } from '../lib/defaultData';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import type {
  AgencySettings,
  FlightQuotationOption,
  FlightRequestRecord,
  FlightRequestStatus,
} from '../types/travel';

const LIFECYCLE_STEPS: Array<{ label: string; statuses: FlightRequestStatus[] }> = [
  { label: 'New Request', statuses: ['New Request'] },
  { label: 'Under Review', statuses: ['Under Review'] },
  { label: 'Quotation Ready', statuses: ['Quotation Sent', 'Awaiting Customer Approval'] },
  { label: 'Awaiting Payment', statuses: ['Awaiting Payment'] },
  { label: 'Payment Verified', statuses: ['Payment Verified'] },
  { label: 'Booking Confirmed', statuses: ['Booking Confirmed'] },
  { label: 'Ticket Issued', statuses: ['Ticket Issued'] },
];

function getStepIndex(status: FlightRequestStatus): number {
  return LIFECYCLE_STEPS.findIndex((s) => s.statuses.includes(status));
}

interface CustomerFlightRequestsTabProps {
  requests: FlightRequestRecord[];
  settings: AgencySettings;
  user: User;
  loading: boolean;
  onToast: (title: string, msg?: string, variant?: 'success' | 'error' | 'info') => void;
}

export function CustomerFlightRequestsTab({
  requests,
  settings,
  user,
  loading,
  onToast,
}: CustomerFlightRequestsTabProps) {
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Payment proof modal state
  const [payingRequest, setPayingRequest] = useState<FlightRequestRecord | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [transactionReference, setTransactionReference] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [receiptFileName, setReceiptFileName] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const handleSelectQuotation = async (
    req: FlightRequestRecord,
    option: FlightQuotationOption
  ) => {
    setSelectingId(`${req.requestId}:${option.quotationId}`);
    try {
      await updateDoc(doc(db, 'flightRequests', req.requestId), {
        selectedQuotationId: option.quotationId,
        selectedQuotation: option,
        status: 'Awaiting Payment',
        updatedAt: serverTimestamp(),
      });

      fetch('/api/notifications/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'Customer Selected Quotation',
          bookingReference: req.requestReference,
          recipientEmail: settings.contactEmail,
          customerName: 'The King Travel Ticketing Desk',
          subject: `Quotation Selected: ${option.airlineName} (${option.flightNumber})`,
          message: `Customer ${req.passengerName} (${req.email}) approved ${option.airlineName} ${option.flightNumber} for ${formatMoney(option.totalPrice, option.currency)}. Request moved to Awaiting Payment.`,
        }),
      }).catch(() => {});

      onToast(
        'Quotation Selected',
        `You selected ${option.airlineName} (${option.flightNumber}). Please submit payment to proceed.`,
        'success'
      );
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, `flightRequests/${req.requestId}`);
      } catch {
        onToast(
          'Action Failed',
          'Could not select this quotation. Ensure your email is verified and try again.',
          'error'
        );
      }
    } finally {
      setSelectingId(null);
    }
  };

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
      onToast('Invalid File', 'Please upload JPG, PNG, WebP, or PDF only.', 'error');
      return;
    }
    if (file.size > 450 * 1024) {
      onToast('File Too Large', 'Receipt file must be 450 KB or smaller.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setReceiptUrl(String(reader.result || ''));
      setReceiptFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitPaymentProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingRequest) return;
    if (!transactionReference.trim() && !receiptUrl) {
      onToast('Missing Details', 'Enter a transaction reference or upload your payment receipt.', 'error');
      return;
    }
    setSubmittingPayment(true);
    try {
      await updateDoc(doc(db, 'flightRequests', payingRequest.requestId), {
        paymentMethod,
        transactionReference: transactionReference.trim() || 'Receipt Uploaded',
        paymentReceiptUrl: receiptUrl || '',
        paymentReceiptFileName: receiptFileName || '',
        paymentStatus: 'pending_verification',
        updatedAt: serverTimestamp(),
      });

      fetch('/api/notifications/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'Payment Received',
          bookingReference: payingRequest.requestReference,
          recipientEmail: settings.contactEmail,
          customerName: 'The King Travel Accounts Desk',
          subject: `Payment Proof Submitted for ${payingRequest.requestReference}`,
          message: `Customer ${payingRequest.passengerName} submitted payment via ${paymentMethod} (Ref: ${transactionReference.trim() || 'Receipt Uploaded'}). Ready for verification.`,
        }),
      }).catch(() => {});

      onToast(
        'Payment Proof Submitted',
        'Our accounts desk will verify your payment shortly before confirming with the airline supplier.',
        'success'
      );
      setPayingRequest(null);
      setTransactionReference('');
      setReceiptUrl('');
      setReceiptFileName('');
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, `flightRequests/${payingRequest.requestId}`);
      } catch {
        onToast('Submission Failed', 'Unable to submit payment proof.', 'error');
      }
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleCancelRequest = async (req: FlightRequestRecord) => {
    setCancellingId(req.requestId);
    try {
      await updateDoc(doc(db, 'flightRequests', req.requestId), {
        status: 'Cancelled',
        updatedAt: serverTimestamp(),
      });
      onToast('Request Cancelled', `${req.requestReference} has been cancelled.`, 'info');
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, `flightRequests/${req.requestId}`);
      } catch {
        onToast('Cancellation Failed', 'Unable to cancel this request.', 'error');
      }
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-[#D9E2EC] rounded-xl p-8 text-center text-sm text-[#627D98]">
        Loading your flight booking requests...
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="bg-white border border-[#D9E2EC] rounded-xl p-10 text-center space-y-3">
        <Plane className="w-8 h-8 text-[#627D98] mx-auto" aria-hidden="true" />
        <h2 className="text-base font-bold text-[#0F2942]">No custom flight requests yet</h2>
        <p className="text-sm text-[#486581] max-w-md mx-auto">
          Submit your travel route, dates, preferred airline, and traveler counts to receive tailored
          airline fare quotations from our ticketing specialists.
        </p>
        <div className="pt-2">
          <Link
            to="/flight-request"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#FD8F1C] hover:bg-[#E07A0E] text-white text-xs font-bold"
          >
            Submit Flight Request
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-[#0F2942]">
            Flight Booking Requests ({requests.length})
          </h2>
          <p className="text-xs text-[#627D98]">
            Signed in as {user.email} · Compare quotations, upload payment proof, and download issued e-tickets.
          </p>
        </div>
        <Link
          to="/flight-request"
          className="px-4 py-2 rounded-lg bg-[#FD8F1C] hover:bg-[#E07A0E] text-white text-xs font-bold whitespace-nowrap"
        >
          + New Flight Request
        </Link>
      </div>

      {requests.map((req) => {
        const currentStepIdx = getStepIndex(req.status);
        const canSelectQuotation =
          req.status === 'Quotation Sent' || req.status === 'Awaiting Customer Approval';
        const canSubmitPayment =
          req.status === 'Awaiting Payment' &&
          (req.paymentStatus === 'unpaid' || req.paymentStatus === 'rejected');
        const canDownloadTicket = req.status === 'Ticket Issued' && Boolean(req.ticketFileUrl);
        const canCancel = !['Booking Confirmed', 'Ticket Issued', 'Cancelled'].includes(req.status);

        return (
          <article
            key={req.requestId}
            className="bg-white border border-[#D9E2EC] rounded-2xl p-5 sm:p-6 space-y-5"
          >
            {/* Header Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E6ECF2]">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#627D98]">
                <span className="font-mono font-bold text-sm text-[#0F2942]">
                  {req.requestReference}
                </span>
                <span aria-hidden="true">·</span>
                <span className="capitalize">{req.tripType.replace('-', ' ')}</span>
                <span aria-hidden="true">·</span>
                <span>{req.cabinClass}</span>
                <span aria-hidden="true">·</span>
                <span>Preferred: {req.preferredAirline}</span>
              </div>
              <span
                className={`text-xs font-bold ${
                  req.status === 'Cancelled'
                    ? 'text-red-700'
                    : req.status === 'Ticket Issued'
                    ? 'text-emerald-700'
                    : 'text-[#FD8F1C]'
                }`}
              >
                Status: {req.status}
              </span>
            </div>

            {/* 7-Stage Progress Tracker */}
            {req.status === 'Cancelled' ? (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold">
                <XCircle className="w-4 h-4 shrink-0" />
                This flight booking request has been cancelled.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {LIFECYCLE_STEPS.map((step, idx) => {
                  const completed = currentStepIdx > idx || req.status === 'Ticket Issued';
                  const active = currentStepIdx === idx;
                  return (
                    <div
                      key={step.label}
                      className={`p-2 rounded-lg border text-[11px] leading-tight ${
                        active
                          ? 'bg-[#FFF5EA] border-[#FD8F1C] text-[#0F2942] font-bold'
                          : completed
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                          : 'bg-[#F9F9FA] border-[#E6ECF2] text-[#627D98]'
                      }`}
                    >
                      <span className="font-mono text-[10px] block opacity-75">Step {idx + 1}</span>
                      <span>{step.label}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Route & Traveler Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#F9F9FA] border border-[#E6ECF2] rounded-xl p-4 text-xs">
              <div>
                <p className="text-[#627D98]">Itinerary</p>
                <p className="text-sm font-bold text-[#0F2942] mt-0.5">
                  {req.departureCity} → {req.destinationCity}
                </p>
                <p className="text-[#486581] mt-0.5 tabular-nums">
                  Dep: {req.departureDate}
                  {req.returnDate ? ` · Ret: ${req.returnDate}` : ''}
                </p>
              </div>
              <div>
                <p className="text-[#627D98]">Travelers</p>
                <p className="font-bold text-[#0F2942] mt-0.5">{req.passengerName}</p>
                <p className="text-[#486581] mt-0.5 tabular-nums">
                  {req.passengersCount?.adults || 1} Adult(s), {req.passengersCount?.children || 0} Child(ren),{' '}
                  {req.passengersCount?.infants || 0} Infant(s)
                </p>
              </div>
              <div>
                <p className="text-[#627D98]">Payment &amp; Supplier Status</p>
                <p className="font-semibold text-[#0F2942] mt-0.5 capitalize">
                  Payment: {req.paymentStatus.replace(/_/g, ' ')}
                </p>
                {req.supplierReference ? (
                  <p className="font-mono font-bold text-emerald-700 mt-0.5">
                    Airline PNR: {req.supplierReference} ({req.supplierProvider || 'Authorized Supplier'})
                  </p>
                ) : (
                  <p className="text-[#627D98] mt-0.5">
                    Supplier PNR confirmed after payment verification
                  </p>
                )}
              </div>
            </div>

            {req.segments && req.segments.length > 0 && (
              <div className="text-xs bg-[#F7F9FC] border border-[#E6ECF2] rounded-xl p-3.5 space-y-1">
                <p className="font-bold text-[#0F2942]">Multi-City Segments</p>
                {req.segments.map((s, idx) => (
                  <p key={idx} className="text-[#486581] tabular-nums">
                    Segment {idx + 1}: <strong className="text-[#0F2942]">{s.origin}</strong> →{' '}
                    <strong className="text-[#0F2942]">{s.destination}</strong> · {s.departureDate}
                  </p>
                ))}
              </div>
            )}

            {req.additionalRequirements && (
              <p className="text-xs text-[#486581]">
                <strong className="text-[#0F2942]">Travel Requirements:</strong> {req.additionalRequirements}
              </p>
            )}

            {/* Quotations Comparison Section */}
            {req.quotations && req.quotations.length > 0 ? (
              <div className="space-y-3 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-[#0F2942]">
                    Available Airline Quotations ({req.quotations.length})
                  </h3>
                  {canSelectQuotation && (
                    <span className="text-xs font-semibold text-[#FD8F1C]">
                      Compare options below and select your preferred itinerary
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {req.quotations.map((opt) => {
                    const isSelected = req.selectedQuotationId === opt.quotationId;
                    const busy = selectingId === `${req.requestId}:${opt.quotationId}`;
                    return (
                      <div
                        key={opt.quotationId}
                        className={`rounded-xl border p-4 space-y-3 transition-colors ${
                          isSelected
                            ? 'border-[#FD8F1C] bg-[#FFF5EA]/40'
                            : 'border-[#D9E2EC] bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 border-b border-[#E6ECF2] pb-2.5">
                          <div>
                            <p className="text-sm font-bold text-[#0F2942]">{opt.airlineName}</p>
                            <p className="font-mono text-xs text-[#486581]">
                              Flight {opt.flightNumber} · {opt.stops}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] text-[#627D98]">Total Fare</p>
                            <p className="font-mono text-lg font-bold text-[#0F2942] tabular-nums">
                              {formatMoney(opt.totalPrice, opt.currency || 'USD')}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-[#243B53]">
                          <p className="inline-flex items-center gap-1.5 tabular-nums">
                            <Clock className="w-3.5 h-3.5 text-[#168AAD]" />
                            Dep: {opt.departureTime}
                          </p>
                          <p className="inline-flex items-center gap-1.5 tabular-nums">
                            <Clock className="w-3.5 h-3.5 text-[#FD8F1C]" />
                            Arr: {opt.arrivalTime}
                          </p>
                          <p className="col-span-2 inline-flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-[#168AAD]" />
                            Baggage: {opt.baggageAllowance}
                          </p>
                        </div>

                        <div className="bg-[#F9F9FA] rounded-lg p-2.5 text-[11px] text-[#486581] grid grid-cols-3 gap-2 tabular-nums">
                          <span>Fare: {formatMoney(opt.fare, opt.currency || 'USD')}</span>
                          <span>Taxes: {formatMoney(opt.taxes, opt.currency || 'USD')}</span>
                          <span>Service: {formatMoney(opt.serviceCharges, opt.currency || 'USD')}</span>
                        </div>

                        <div className="text-[11px] text-[#486581] space-y-1">
                          <p>
                            <strong className="text-[#0F2942]">Fare Validity:</strong> {opt.fareValidity}
                          </p>
                          <p>
                            <strong className="text-[#0F2942]">Refund &amp; Cancellation:</strong>{' '}
                            {opt.refundCancellationRules}
                          </p>
                        </div>

                        {isSelected ? (
                          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 pt-1">
                            <CheckCircle2 className="w-4 h-4" />
                            Selected Option
                          </div>
                        ) : (
                          canSelectQuotation && (
                            <button
                              type="button"
                              disabled={Boolean(selectingId)}
                              onClick={() => handleSelectQuotation(req, opt)}
                              className="w-full py-2.5 rounded-lg bg-[#0F2942] hover:bg-[#193B5C] text-white text-xs font-bold transition-colors disabled:opacity-60"
                            >
                              {busy ? 'Confirming Selection...' : 'Select This Option'}
                            </button>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              req.status !== 'Cancelled' && (
                <p className="text-xs text-[#627D98] bg-[#F7F9FC] border border-[#E6ECF2] rounded-xl px-4 py-3">
                  Our ticketing desk is reviewing airline supplier tariffs for your route. Once quotations are
                  prepared, you will see them here for side-by-side comparison.
                </p>
              )
            )}

            {/* Action Bar */}
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#E6ECF2]">
              {canSubmitPayment && (
                <button
                  type="button"
                  onClick={() => {
                    setPayingRequest(req);
                    setPaymentMethod('Bank Transfer');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#FD8F1C] hover:bg-[#E07A0E] text-white text-xs font-bold"
                >
                  <CreditCard className="w-4 h-4" />
                  Submit Payment &amp; Receipt
                </button>
              )}

              {req.status === 'Awaiting Payment' && req.paymentStatus === 'pending_verification' && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#168AAD]">
                  <ShieldCheck className="w-4 h-4" />
                  Payment receipt submitted ({req.transactionReference}) · Awaiting admin verification
                </span>
              )}

              {req.status === 'Payment Verified' && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                  Payment verified · Confirming reservation with airline supplier
                </span>
              )}

              {req.status === 'Booking Confirmed' && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F2942]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Booking confirmed with supplier (PNR: {req.supplierReference}) · Airline e-ticket upload pending
                </span>
              )}

              {canDownloadTicket && (
                <a
                  href={req.ticketFileUrl}
                  download={req.ticketFileName || `${req.requestReference}_Airline_Eticket.pdf`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold"
                >
                  <Download className="w-4 h-4" />
                  Download Confirmed E-Ticket (PDF)
                </a>
              )}

              {canCancel && (
                <button
                  type="button"
                  disabled={cancellingId === req.requestId}
                  onClick={() => handleCancelRequest(req)}
                  className="ml-auto text-xs font-semibold text-red-600 hover:underline"
                >
                  {cancellingId === req.requestId ? 'Cancelling...' : 'Cancel Request'}
                </button>
              )}
            </div>
          </article>
        );
      })}

      {/* Payment Proof Modal */}
      {payingRequest && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#D9E2EC] max-w-lg w-full p-6 space-y-5 my-8">
            <div className="border-b border-[#E6ECF2] pb-3">
              <p className="text-xs font-semibold text-[#FD8F1C]">Payment Submission</p>
              <h3 className="text-lg font-bold text-[#0F2942]">
                {payingRequest.requestReference} ·{' '}
                {payingRequest.selectedQuotation
                  ? formatMoney(
                      payingRequest.selectedQuotation.totalPrice,
                      payingRequest.selectedQuotation.currency || 'USD'
                    )
                  : ''}
              </h3>
              {payingRequest.selectedQuotation && (
                <p className="text-xs text-[#486581] mt-0.5">
                  {payingRequest.selectedQuotation.airlineName} (
                  {payingRequest.selectedQuotation.flightNumber})
                </p>
              )}
            </div>

            <div className="bg-[#F9F9FA] border border-[#E6ECF2] rounded-xl p-4 text-xs space-y-1">
              <p className="font-bold text-[#0F2942]">Agency Bank &amp; Transfer Details</p>
              <p>Bank: {settings.bankDetails.bankName}</p>
              <p>Account Title: {settings.bankDetails.accountTitle}</p>
              <p className="font-mono">Account / Routing: {settings.bankDetails.accountNumber}</p>
              <p className="font-mono">IBAN / SWIFT: {settings.bankDetails.iban}</p>
              <p className="text-[#627D98] pt-1">{settings.bankDetails.instructions}</p>
            </div>

            <form onSubmit={handleSubmitPaymentProof} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#486581] mb-1">
                  Payment Method *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#0F2942]"
                >
                  <option value="Bank Transfer">Bank Transfer / Wire</option>
                  <option value="Zelle">Zelle</option>
                  <option value="Card / Payment Link">Card / Agency Payment Link</option>
                  <option value="JazzCash">JazzCash</option>
                  <option value="Easypaisa">Easypaisa</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#486581] mb-1">
                  Transaction Reference / Confirmation ID *
                </label>
                <input
                  type="text"
                  required
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                  placeholder="e.g. WIRE-908123 or ZELLE-4410"
                  className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm font-mono text-[#0F2942]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#486581] mb-1">
                  Upload Payment Receipt (JPG, PNG, WebP, PDF &le; 450 KB)
                </label>
                <label className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-dashed border-[#829AB1] bg-[#F7F9FC] cursor-pointer text-xs font-semibold text-[#0F2942]">
                  <Upload className="w-4 h-4 text-[#FD8F1C]" />
                  <span className="truncate">{receiptFileName || 'Choose Receipt File'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleReceiptChange}
                    className="sr-only"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-[#E6ECF2]">
                <button
                  type="button"
                  onClick={() => setPayingRequest(null)}
                  className="px-4 py-2 rounded-lg border border-[#D9E2EC] text-xs font-semibold text-[#486581]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-5 py-2 rounded-lg bg-[#FD8F1C] hover:bg-[#E07A0E] text-white text-xs font-bold disabled:opacity-60"
                >
                  {submittingPayment ? 'Submitting...' : 'Submit for Verification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
