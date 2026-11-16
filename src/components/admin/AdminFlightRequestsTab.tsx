import React, { useMemo, useState } from 'react';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import {
  CheckCircle2,
  Eye,
  FileCheck2,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { formatMoney } from '../../lib/defaultData';
import { db, generateId, handleFirestoreError, OperationType } from '../../lib/firebase';
import type {
  FlightQuotationOption,
  FlightRequestRecord,
  FlightRequestStatus,
} from '../../types/travel';

const ALL_REQUEST_STATUSES: FlightRequestStatus[] = [
  'New Request',
  'Under Review',
  'Quotation Sent',
  'Awaiting Customer Approval',
  'Awaiting Payment',
  'Payment Verified',
  'Booking Confirmed',
  'Ticket Issued',
  'Cancelled',
];

interface AdminFlightRequestsTabProps {
  requests: FlightRequestRecord[];
  isDemoSandbox?: boolean;
  onDemoUpdateRequest?: (updated: FlightRequestRecord) => void;
  onLogAudit: (
    action: string,
    targetCollection: string,
    targetId: string,
    details: string
  ) => Promise<void>;
  onToast: (title: string, msg?: string, variant?: 'success' | 'error' | 'info') => void;
}

export function AdminFlightRequestsTab({
  requests,
  isDemoSandbox = false,
  onDemoUpdateRequest,
  onLogAudit,
  onToast,
}: AdminFlightRequestsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selected, setSelected] = useState<FlightRequestRecord | null>(null);

  // Modal state for editing selected request
  const [editStatus, setEditStatus] = useState<FlightRequestStatus>('New Request');
  const [editPaymentStatus, setEditPaymentStatus] = useState<
    'unpaid' | 'pending_verification' | 'verified' | 'rejected'
  >('unpaid');
  const [editQuotations, setEditQuotations] = useState<FlightQuotationOption[]>([]);
  const [editSupplierProvider, setEditSupplierProvider] = useState('');
  const [editSupplierRef, setEditSupplierRef] = useState('');
  const [editTicketUrl, setEditTicketUrl] = useState('');
  const [editTicketName, setEditTicketName] = useState('');
  const [editAdminNotes, setEditAdminNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Multi-quotation builder draft fields
  const [qAirline, setQAirline] = useState('');
  const [qFlightNumber, setQFlightNumber] = useState('');
  const [qDepTime, setQDepTime] = useState('');
  const [qArrTime, setQArrTime] = useState('');
  const [qStops, setQStops] = useState('Non-stop');
  const [qBaggage, setQBaggage] = useState('2 x 23 kg Checked + 7 kg Cabin');
  const [qFare, setQFare] = useState('');
  const [qTaxes, setQTaxes] = useState('');
  const [qServiceCharges, setQServiceCharges] = useState('');
  const [qTotalOverride, setQTotalOverride] = useState('');
  const [qCurrency, setQCurrency] = useState('USD');
  const [qValidity, setQValidity] = useState('');
  const [qRules, setQRules] = useState(
    'Changes & cancellations subject to airline fare penalty plus agency handling fee prior to departure.'
  );

  const openManageModal = (req: FlightRequestRecord) => {
    setSelected(req);
    setEditStatus(req.status);
    setEditPaymentStatus(req.paymentStatus);
    setEditQuotations(req.quotations || []);
    setEditSupplierProvider(req.supplierProvider || '');
    setEditSupplierRef(req.supplierReference || '');
    setEditTicketUrl(req.ticketFileUrl || '');
    setEditTicketName(req.ticketFileName || '');
    setEditAdminNotes(req.adminNotes || '');
    setQAirline(
      req.preferredAirline && req.preferredAirline !== 'Any Airline'
        ? req.preferredAirline.replace(/\s*\([A-Z0-9]{2,3}\)\s*$/, '')
        : ''
    );
    setQFlightNumber('');
    setQDepTime(req.departureDate ? `${req.departureDate} 09:30` : '');
    setQArrTime(req.departureDate ? `${req.departureDate} 18:15` : '');
    setQStops('Non-stop');
    setQBaggage('2 x 23 kg Checked + 7 kg Cabin');
    setQFare('');
    setQTaxes('');
    setQServiceCharges('');
    setQTotalOverride('');
    setQCurrency('USD');
    setQValidity('Valid for 24 hours subject to seat availability');
  };

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return requests.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.requestReference.toLowerCase().includes(q) ||
        r.passengerName.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.departureCity.toLowerCase().includes(q) ||
        r.destinationCity.toLowerCase().includes(q) ||
        r.preferredAirline.toLowerCase().includes(q)
      );
    });
  }, [requests, searchTerm, statusFilter]);

  const computedTotal = useMemo(() => {
    if (qTotalOverride.trim() !== '' && Number.isFinite(Number(qTotalOverride))) {
      return Math.max(0, Number(qTotalOverride));
    }
    return Math.max(
      0,
      (Number(qFare) || 0) + (Number(qTaxes) || 0) + (Number(qServiceCharges) || 0)
    );
  }, [qFare, qTaxes, qServiceCharges, qTotalOverride]);

  const handleAddQuotationOption = () => {
    if (!qAirline.trim() || !qFlightNumber.trim() || !qDepTime.trim() || !qArrTime.trim()) {
      onToast(
        'Missing Quotation Fields',
        'Airline Name, Flight Number, Departure Time, and Arrival Time are required.',
        'error'
      );
      return;
    }
    if (computedTotal <= 0) {
      onToast('Invalid Price', 'Enter valid Fare / Taxes / Total Price greater than 0.', 'error');
      return;
    }
    const newOption: FlightQuotationOption = {
      quotationId: generateId('qt'),
      airlineName: qAirline.trim(),
      flightNumber: qFlightNumber.trim().toUpperCase(),
      departureTime: qDepTime.trim(),
      arrivalTime: qArrTime.trim(),
      stops: qStops.trim() || 'Non-stop',
      baggageAllowance: qBaggage.trim() || 'Standard Cabin + Checked Allowance',
      fare: Number(qFare) || 0,
      taxes: Number(qTaxes) || 0,
      serviceCharges: Number(qServiceCharges) || 0,
      totalPrice: computedTotal,
      currency: qCurrency,
      fareValidity: qValidity.trim() || 'Valid for 24 hours',
      refundCancellationRules: qRules.trim() || 'Subject to airline tariff rules.',
      createdAt: new Date().toISOString(),
    };
    setEditQuotations((prev) => [...prev, newOption]);
    setQFlightNumber('');
    setQFare('');
    setQTaxes('');
    setQServiceCharges('');
    setQTotalOverride('');
    onToast(
      'Quotation Added',
      `${newOption.airlineName} (${newOption.flightNumber}) added to comparison list.`,
      'info'
    );
  };

  const handleRemoveQuotation = (quotationId: string) => {
    setEditQuotations((prev) => prev.filter((q) => q.quotationId !== quotationId));
  };

  const handleTicketPdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      onToast('Invalid File', 'Genuine airline e-tickets must be PDF files.', 'error');
      return;
    }
    if (file.size > 500 * 1024) {
      onToast('File Too Large', 'PDF file must be 500 KB or smaller.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setEditTicketUrl(String(reader.result || ''));
      setEditTicketName(file.name);
      onToast(
        'E-Ticket Attached',
        `${file.name} attached. Click "Issue Genuine E-Ticket" or "Save All Changes" to release to customer.`,
        'info'
      );
    };
    reader.readAsDataURL(file);
  };

  const persistRequestUpdate = async (overrides?: {
    status?: FlightRequestStatus;
    paymentStatus?: 'unpaid' | 'pending_verification' | 'verified' | 'rejected';
    eventType?:
      | 'Request Under Review'
      | 'Quotation Sent'
      | 'Payment Verified'
      | 'Booking Confirmed'
      | 'Ticket Issued'
      | 'Request Cancelled';
    subject?: string;
    message?: string;
  }) => {
    if (!selected) return;
    const nextStatus = overrides?.status ?? editStatus;
    const nextPayStatus = overrides?.paymentStatus ?? editPaymentStatus;

    if (nextStatus === 'Ticket Issued' && (!editTicketUrl || !editSupplierRef.trim())) {
      onToast(
        'Confirmation Required',
        'Upload the genuine airline e-ticket PDF and enter the Supplier Airline PNR before marking Ticket Issued.',
        'error'
      );
      return;
    }

    if (nextStatus === 'Booking Confirmed' && !editSupplierRef.trim()) {
      onToast(
        'PNR Required',
        'Enter the authorized supplier booking reference / Airline PNR before marking Booking Confirmed.',
        'error'
      );
      return;
    }

    setSaving(true);
    try {
      if (isDemoSandbox && onDemoUpdateRequest) {
        onDemoUpdateRequest({
          ...selected,
          status: nextStatus,
          paymentStatus: nextPayStatus,
          quotations: editQuotations,
          supplierProvider: editSupplierProvider.trim(),
          supplierReference: editSupplierRef.trim().toUpperCase(),
          ticketFileUrl: editTicketUrl || '',
          ticketFileName: editTicketName || '',
          adminNotes: editAdminNotes.trim(),
          updatedAt: { seconds: Math.floor(Date.now() / 1000), toDate: () => new Date() },
        });
        await onLogAudit(
          `Updated flight request ${selected.requestReference} (${nextStatus})`,
          'flightRequests',
          selected.requestId,
          `Status=${nextStatus}, Payment=${nextPayStatus}, Quotes=${editQuotations.length}, PNR=${editSupplierRef || 'none'}`
        );
        onToast(
          'Flight Request Updated (Demo Sandbox)',
          `${selected.requestReference} updated locally as ${nextStatus}.`,
          'success'
        );
        setSelected(null);
        return;
      }

      await updateDoc(doc(db, 'flightRequests', selected.requestId), {
        status: nextStatus,
        paymentStatus: nextPayStatus,
        quotations: editQuotations,
        supplierProvider: editSupplierProvider.trim(),
        supplierReference: editSupplierRef.trim().toUpperCase(),
        ticketFileUrl: editTicketUrl || '',
        ticketFileName: editTicketName || '',
        adminNotes: editAdminNotes.trim(),
        updatedAt: serverTimestamp(),
      });

      const notifSubject = overrides?.subject || `Flight Request Update: ${nextStatus}`;
      const notifMessage =
        overrides?.message ||
        (nextStatus === 'Ticket Issued'
          ? `Your confirmed airline e-ticket (PNR: ${editSupplierRef.trim().toUpperCase()}) is ready for download in your Customer Portal.`
          : nextStatus === 'Quotation Sent' || nextStatus === 'Awaiting Customer Approval'
          ? `We have prepared ${editQuotations.length} airline fare quotation option(s) for ${selected.departureCity} -> ${selected.destinationCity}. Log in to review and select your preferred flight.`
          : `Your flight request status is now "${nextStatus}".`);

      // Only write Firestore portal notification if request belongs to a registered userId
      if (selected.userId) {
        const notifId = generateId('ntf');
        await setDoc(doc(db, 'notifications', notifId), {
          notificationId: notifId,
          userId: selected.userId,
          bookingId: selected.requestId,
          type: overrides?.eventType || nextStatus,
          title: `${selected.requestReference}: ${nextStatus}`,
          message: notifMessage,
          read: false,
          createdAt: serverTimestamp(),
        }).catch(() => {});
      }

      fetch('/api/notifications/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: overrides?.eventType || 'Booking Confirmed',
          bookingReference: selected.requestReference,
          recipientEmail: selected.email,
          recipientPhone: selected.phoneWhatsapp,
          customerName: selected.passengerName,
          subject: notifSubject,
          message: notifMessage,
        }),
      }).catch(() => {});

      await onLogAudit(
        `Updated flight request ${selected.requestReference} (${nextStatus})`,
        'flightRequests',
        selected.requestId,
        `Status=${nextStatus}, Payment=${nextPayStatus}, Quotes=${editQuotations.length}, PNR=${editSupplierRef || 'none'}`
      );

      onToast('Flight Request Updated', `${selected.requestReference} saved as ${nextStatus}.`, 'success');
      setSelected(null);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, `flightRequests/${selected.requestId}`);
      } catch {
        onToast('Save Failed', 'Unable to update flight request.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-[#D9E2EC] rounded-xl p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-[#627D98] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Request Ref, Passenger, Email, Route, Airline..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#D9E2EC] text-xs text-[#0F2942]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#D9E2EC] text-xs font-medium text-[#0F2942]"
        >
          <option value="all">All Statuses ({requests.length})</option>
          {ALL_REQUEST_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Requests Table */}
      <div className="bg-white border border-[#D9E2EC] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F9FC] text-[#486581] border-b border-[#D9E2EC]">
              <tr>
                <th className="py-3 px-4 font-semibold">Request ID</th>
                <th className="py-3 px-4 font-semibold">Customer</th>
                <th className="py-3 px-4 font-semibold">Route &amp; Dates</th>
                <th className="py-3 px-4 font-semibold">Airline / Cabin</th>
                <th className="py-3 px-4 font-semibold text-center">Quotes</th>
                <th className="py-3 px-4 font-semibold">Payment</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6ECF2]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[#627D98]">
                    No flight requests match your active filter.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.requestId} className="hover:bg-[#F7F9FC]">
                    <td className="py-3 px-4 font-mono font-bold text-[#0F2942] whitespace-nowrap">
                      {r.requestReference}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-[#0F2942]">{r.passengerName}</p>
                      <p className="text-[11px] text-[#627D98]">{r.email}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-[#0F2942]">
                        {r.departureCity} → {r.destinationCity}
                      </p>
                      <p className="text-[11px] text-[#627D98] tabular-nums">
                        {r.departureDate}
                        {r.returnDate ? ` – ${r.returnDate}` : ''} · {r.tripType}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-[#0F2942]">{r.preferredAirline}</p>
                      <p className="text-[11px] text-[#627D98]">
                        {r.cabinClass} · {(r.passengersCount?.adults || 1) + (r.passengersCount?.children || 0) + (r.passengersCount?.infants || 0)} pax
                      </p>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-[#0F2942] tabular-nums">
                      {r.quotations?.length || 0}
                    </td>
                    <td className="py-3 px-4 capitalize text-[#486581]">
                      {r.paymentStatus.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#0F2942] whitespace-nowrap">
                      {r.status}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openManageModal(r)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F2942] hover:bg-[#193B5C] text-white text-[11px] font-semibold"
                      >
                        <Eye className="w-3.5 h-3.5" /> Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manage Request & Multi-Quotation Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#D9E2EC] max-w-5xl w-full p-6 sm:p-8 space-y-6 my-8 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E6ECF2] pb-4">
              <div>
                <p className="text-xs font-semibold text-[#FD8F1C]">Manual Ticketing &amp; Quotations</p>
                <h2 className="font-mono text-xl font-bold text-[#0F2942]">
                  {selected.requestReference} · {selected.departureCity} → {selected.destinationCity}
                </h2>
                <p className="text-xs text-[#486581] mt-1">
                  {selected.passengerName} · {selected.email} · WhatsApp/Phone: {selected.phoneWhatsapp}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="px-3.5 py-1.5 rounded-lg border border-[#D9E2EC] text-xs font-semibold text-[#486581] hover:bg-[#F9F9FA]"
              >
                Close
              </button>
            </div>

            {/* Customer Travel Requirements */}
            <div className="bg-[#F9F9FA] border border-[#E6ECF2] rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <p className="text-[#627D98]">Trip &amp; Dates</p>
                <p className="font-bold text-[#0F2942] capitalize">
                  {selected.tripType.replace('-', ' ')} · {selected.cabinClass}
                </p>
                <p className="text-[#486581] tabular-nums mt-0.5">
                  Dep: {selected.departureDate}
                  {selected.returnDate ? ` | Ret: ${selected.returnDate}` : ''}
                </p>
              </div>
              <div>
                <p className="text-[#627D98]">Preferred Airline &amp; Passengers</p>
                <p className="font-bold text-[#0F2942]">{selected.preferredAirline}</p>
                <p className="text-[#486581] tabular-nums mt-0.5">
                  {selected.passengersCount?.adults || 1} Adult(s),{' '}
                  {selected.passengersCount?.children || 0} Child(ren),{' '}
                  {selected.passengersCount?.infants || 0} Infant(s)
                </p>
              </div>
              <div>
                <p className="text-[#627D98]">Additional Requirements</p>
                <p className="text-[#0F2942] mt-0.5">
                  {selected.additionalRequirements || 'None specified'}
                </p>
              </div>
              {selected.segments && selected.segments.length > 0 && (
                <div className="md:col-span-3 pt-2 border-t border-[#D9E2EC]">
                  <p className="font-bold text-[#0F2942] mb-1">Multi-City Segments</p>
                  <div className="flex flex-wrap gap-3">
                    {selected.segments.map((seg, idx) => (
                      <span key={idx} className="text-[#243B53] tabular-nums">
                        {idx + 1}. {seg.origin} → {seg.destination} ({seg.departureDate})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Section A: Multiple Quotations Builder */}
            <div className="border border-[#D9E2EC] rounded-xl p-5 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E6ECF2] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-[#0F2942]">
                    1. Airline Quotations Builder ({editQuotations.length} option
                    {editQuotations.length === 1 ? '' : 's'} attached)
                  </h3>
                  <p className="text-xs text-[#627D98]">
                    Compare airline supplier options and add multiple quotations for the customer to choose from.
                  </p>
                </div>
                {editQuotations.length > 0 && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      persistRequestUpdate({
                        status: 'Awaiting Customer Approval',
                        eventType: 'Quotation Sent',
                        subject: `Flight Quotations Ready (${editQuotations.length} option${editQuotations.length > 1 ? 's' : ''})`,
                        message: `We have prepared ${editQuotations.length} airline fare option(s) for ${selected.departureCity} -> ${selected.destinationCity}:\n${editQuotations
                          .map(
                            (q, i) =>
                              `${i + 1}. ${q.airlineName} (${q.flightNumber}) — ${q.departureTime} to ${q.arrivalTime} · ${q.stops} · Total: ${formatMoney(q.totalPrice, q.currency)}`
                          )
                          .join('\n')}\n\nOpen My Bookings -> Flight Requests to select your preferred option.`,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#FD8F1C] hover:bg-[#E07A0E] text-white text-xs font-bold"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send Quotations to Customer
                  </button>
                )}
              </div>

              {/* Existing Attached Quotations */}
              {editQuotations.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {editQuotations.map((opt) => {
                    const isCustomerPick = selected.selectedQuotationId === opt.quotationId;
                    return (
                      <div
                        key={opt.quotationId}
                        className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                          isCustomerPick ? 'border-[#FD8F1C] bg-[#FFF5EA]/50' : 'border-[#E6ECF2] bg-[#F9F9FA]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-[#0F2942]">
                              {opt.airlineName} ({opt.flightNumber})
                              {isCustomerPick && (
                                <span className="ml-2 text-[#FD8F1C]">★ Customer Selected</span>
                              )}
                            </p>
                            <p className="text-[#486581] tabular-nums">
                              {opt.departureTime} → {opt.arrivalTime} · {opt.stops}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveQuotation(opt.quotationId)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md"
                            title="Remove quotation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[#486581]">Baggage: {opt.baggageAllowance}</p>
                        <p className="font-mono font-semibold text-[#0F2942] tabular-nums">
                          Fare {formatMoney(opt.fare, opt.currency)} + Taxes{' '}
                          {formatMoney(opt.taxes, opt.currency)} + Service{' '}
                          {formatMoney(opt.serviceCharges, opt.currency)} = Total{' '}
                          {formatMoney(opt.totalPrice, opt.currency)}
                        </p>
                        <p className="text-[11px] text-[#627D98]">
                          Validity: {opt.fareValidity} · {opt.refundCancellationRules}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Quotation Form */}
              <div className="bg-[#F9F9FA] border border-[#E6ECF2] rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-[#0F2942]">Add New Airline Quotation Option</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#486581] mb-1">
                      Airline Name *
                    </label>
                    <input
                      type="text"
                      value={qAirline}
                      onChange={(e) => setQAirline(e.target.value)}
                      placeholder="e.g. Emirates"
                      className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] bg-white text-xs text-[#0F2942]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#486581] mb-1">
                      Flight Number *
                    </label>
                    <input
                      type="text"
                      value={qFlightNumber}
                      onChange={(e) => setQFlightNumber(e.target.value.toUpperCase())}
                      placeholder="e.g. EK-222"
                      className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] bg-white text-xs font-mono text-[#0F2942]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#486581] mb-1">
                      Departure Time *
                    </label>
                    <input
                      type="text"
                      value={qDepTime}
                      onChange={(e) => setQDepTime(e.target.value)}
                      placeholder="2026-12-10 19:45"
                      className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] bg-white text-xs tabular-nums text-[#0F2942]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#486581] mb-1">
                      Arrival Time *
                    </label>
                    <input
                      type="text"
                      value={qArrTime}
                      onChange={(e) => setQArrTime(e.target.value)}
                      placeholder="2026-12-11 19:10 (+1)"
                      className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] bg-white text-xs tabular-nums text-[#0F2942]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#486581] mb-1">
                      Stops
                    </label>
                    <input
                      type="text"
                      value={qStops}
                      onChange={(e) => setQStops(e.target.value)}
                      placeholder="Non-stop / 1 Stop in DOH"
                      className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] bg-white text-xs text-[#0F2942]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#486581] mb-1">
                      Baggage Allowance
                    </label>
                    <input
                      type="text"
                      value={qBaggage}
                      onChange={(e) => setQBaggage(e.target.value)}
                      placeholder="3 Check Bags Deal / 2x23kg"
                      className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] bg-white text-xs text-[#0F2942]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#486581] mb-1">
                      Fare Validity
                    </label>
                    <input
                      type="text"
                      value={qValidity}
                      onChange={(e) => setQValidity(e.target.value)}
                      placeholder="Valid until 2026-11-22 18:00 CST"
                      className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] bg-white text-xs text-[#0F2942]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#486581] mb-1">
                      Currency
                    </label>
                    <select
                      value={qCurrency}
                      onChange={(e) => setQCurrency(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] bg-white text-xs font-semibold text-[#0F2942]"
                    >
                      <option value="USD">USD</option>
                      <option value="PKR">PKR</option>
                      <option value="AED">AED</option>
                      <option value="SAR">SAR</option>
                      <option value="GBP">GBP</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#486581] mb-1">
                      Base Fare *
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={qFare}
                      onChange={(e) => setQFare(e.target.value)}
                      placeholder="650"
                      className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] bg-white text-xs font-mono tabular-nums text-[#0F2942]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#486581] mb-1">
                      Taxes
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={qTaxes}
                      onChange={(e) => setQTaxes(e.target.value)}
                      placeholder="110"
                      className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] bg-white text-xs font-mono tabular-nums text-[#0F2942]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#486581] mb-1">
                      Service Charges
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={qServiceCharges}
                      onChange={(e) => setQServiceCharges(e.target.value)}
                      placeholder="35"
                      className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] bg-white text-xs font-mono tabular-nums text-[#0F2942]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#486581] mb-1">
                      Total Price (Auto: {formatMoney(computedTotal, qCurrency)})
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={qTotalOverride}
                      onChange={(e) => setQTotalOverride(e.target.value)}
                      placeholder={String(computedTotal || 795)}
                      className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] bg-white text-xs font-mono font-bold tabular-nums text-[#0F2942]"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 w-full">
                    <label className="block text-[11px] font-semibold text-[#486581] mb-1">
                      Refund &amp; Cancellation Rules
                    </label>
                    <input
                      type="text"
                      value={qRules}
                      onChange={(e) => setQRules(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] bg-white text-xs text-[#0F2942]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddQuotationOption}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0F2942] hover:bg-[#193B5C] text-white text-xs font-bold whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Option to List
                  </button>
                </div>
              </div>
            </div>

            {/* Section B: Payment Verification & Supplier Ticketing */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Payment Verification */}
              <div className="border border-[#D9E2EC] rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-[#0F2942] inline-flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#FD8F1C]" />
                  2. Customer Selection &amp; Payment Verification
                </h3>

                <div className="bg-[#F9F9FA] border border-[#E6ECF2] rounded-lg p-3.5 text-xs space-y-1">
                  <p>
                    <strong>Selected Option:</strong>{' '}
                    {selected.selectedQuotation
                      ? `${selected.selectedQuotation.airlineName} (${selected.selectedQuotation.flightNumber}) · ${formatMoney(selected.selectedQuotation.totalPrice, selected.selectedQuotation.currency)}`
                      : 'Customer has not selected an option yet'}
                  </p>
                  <p>
                    <strong>Method / Ref:</strong> {selected.paymentMethod || 'N/A'} ·{' '}
                    <span className="font-mono">{selected.transactionReference || 'N/A'}</span>
                  </p>
                  <p className="capitalize">
                    <strong>Payment Status:</strong> {editPaymentStatus.replace(/_/g, ' ')}
                  </p>
                  {selected.paymentReceiptUrl && (
                    <a
                      href={selected.paymentReceiptUrl}
                      download={selected.paymentReceiptFileName || `${selected.requestReference}_Receipt`}
                      className="inline-block mt-1 font-semibold text-[#168AAD] underline"
                    >
                      Download Submitted Payment Receipt ({selected.paymentReceiptFileName || 'file'})
                    </a>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setEditPaymentStatus('verified');
                      setEditStatus('Payment Verified');
                      persistRequestUpdate({
                        status: 'Payment Verified',
                        paymentStatus: 'verified',
                        eventType: 'Payment Verified',
                        subject: 'Payment Verified',
                        message:
                          'Your payment has been verified by our accounts desk. We are now confirming your reservation with the authorized airline supplier.',
                      });
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verify Payment
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setEditPaymentStatus('rejected');
                      setEditStatus('Awaiting Payment');
                      persistRequestUpdate({
                        status: 'Awaiting Payment',
                        paymentStatus: 'rejected',
                        subject: 'Payment Receipt Needs Attention',
                        message:
                          'We could not verify the uploaded payment receipt. Please re-upload a clear receipt or updated transaction reference in your portal.',
                      });
                    }}
                    className="px-3.5 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-semibold"
                  >
                    Reject Receipt
                  </button>
                </div>
              </div>

              {/* Supplier Confirmation & E-Ticket Upload */}
              <div className="border border-[#D9E2EC] rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-[#0F2942] inline-flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-emerald-700" />
                  3. Supplier Confirmation &amp; Genuine E-Ticket
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#486581] mb-1">
                      Authorized Supplier
                    </label>
                    <input
                      type="text"
                      value={editSupplierProvider}
                      onChange={(e) => setEditSupplierProvider(e.target.value)}
                      placeholder="e.g. Amadeus GDS / Consolidator"
                      className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-xs text-[#0F2942]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#486581] mb-1">
                      Supplier Booking Ref / Airline PNR
                    </label>
                    <input
                      type="text"
                      value={editSupplierRef}
                      onChange={(e) => setEditSupplierRef(e.target.value.toUpperCase())}
                      placeholder="e.g. X8K9PL"
                      className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-xs font-mono text-[#0F2942]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#486581] mb-1">
                    Upload Genuine Airline E-Ticket PDF (&le; 500 KB)
                  </label>
                  <label className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-dashed border-[#829AB1] bg-[#F7F9FC] cursor-pointer text-xs font-semibold text-[#0F2942]">
                    <Upload className="w-4 h-4 text-[#168AAD]" />
                    <span className="truncate">{editTicketName || 'Attach Airline E-Ticket PDF'}</span>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleTicketPdfUpload}
                      className="sr-only"
                    />
                  </label>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      persistRequestUpdate({
                        status: 'Booking Confirmed',
                        eventType: 'Booking Confirmed',
                        subject: `Booking Confirmed (PNR: ${editSupplierRef.trim().toUpperCase()})`,
                        message: `Your reservation is confirmed with ${editSupplierProvider || 'our authorized supplier'} (PNR: ${editSupplierRef.trim().toUpperCase()}). Airline e-ticket issuance is underway.`,
                      })
                    }
                    className="px-3.5 py-2 rounded-lg bg-[#0F2942] hover:bg-[#193B5C] text-white text-xs font-bold"
                  >
                    Confirm with Supplier
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      persistRequestUpdate({
                        status: 'Ticket Issued',
                        eventType: 'Ticket Issued',
                        subject: `Airline E-Ticket Issued (PNR: ${editSupplierRef.trim().toUpperCase()})`,
                        message: `Your genuine airline e-ticket (PNR: ${editSupplierRef.trim().toUpperCase()}) has been issued and uploaded. Log in to My Bookings -> Flight Requests to download your PDF ticket.`,
                      })
                    }
                    className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold"
                  >
                    Issue Genuine E-Ticket
                  </button>
                </div>
              </div>
            </div>

            {/* Section C: Status Override & Admin Notes */}
            <div className="border-t border-[#E6ECF2] pt-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-[#486581] mb-1">
                  Request Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as FlightRequestStatus)}
                  className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-xs font-semibold text-[#0F2942]"
                >
                  {ALL_REQUEST_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-[#486581] mb-1">
                  Payment Status
                </label>
                <select
                  value={editPaymentStatus}
                  onChange={(e) => setEditPaymentStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-xs font-semibold text-[#0F2942]"
                >
                  <option value="unpaid">Unpaid</option>
                  <option value="pending_verification">Pending Verification</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="md:col-span-6">
                <label className="block text-xs font-semibold text-[#486581] mb-1">
                  Internal Admin Notes
                </label>
                <input
                  type="text"
                  value={editAdminNotes}
                  onChange={(e) => setEditAdminNotes(e.target.value)}
                  placeholder="Supplier quote notes, fare hold deadline, customer follow-up..."
                  className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-xs text-[#0F2942]"
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-between items-center gap-3 pt-3 border-t border-[#E6ECF2]">
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  persistRequestUpdate({
                    status: 'Under Review',
                    eventType: 'Request Under Review',
                    subject: 'Flight Request Under Review',
                    message: `Our ticketing specialists are now checking live airline supplier availability for ${selected.departureCity} -> ${selected.destinationCity}.`,
                  })
                }
                className="px-4 py-2 rounded-lg border border-[#D9E2EC] text-xs font-semibold text-[#0F2942] hover:bg-[#F9F9FA]"
              >
                Mark Under Review &amp; Notify
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="px-4 py-2 rounded-lg border border-[#D9E2EC] text-xs font-semibold text-[#486581]"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => persistRequestUpdate()}
                  className="px-5 py-2 rounded-lg bg-[#0F2942] hover:bg-[#193B5C] text-white text-xs font-bold"
                >
                  {saving ? 'Saving...' : 'Save All Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
