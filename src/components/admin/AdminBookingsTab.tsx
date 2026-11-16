import React, { useMemo, useState } from 'react';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { Download, Eye, Search, Upload } from 'lucide-react';
import { formatMoney } from '../../lib/defaultData';
import { db, generateId, handleFirestoreError, OperationType } from '../../lib/firebase';
import { downloadBookingConfirmationPdf } from '../../lib/pdfGenerator';
import type { BookingRecord, BookingStatus, PaymentStatus } from '../../types/travel';

const ALL_BOOKING_STATUSES: BookingStatus[] = [
  'New Request',
  'Pending Payment',
  'Payment Verification',
  'Payment Confirmed',
  'Supplier Confirmation Pending',
  'Ticket Issued',
  'Cancelled',
  'Refund Requested',
  'Refunded',
];

const ALL_PAYMENT_STATUSES: PaymentStatus[] = [
  'unpaid',
  'pending_verification',
  'confirmed',
  'rejected',
  'refund_pending',
  'refunded',
];

interface AdminBookingsTabProps {
  bookings: BookingRecord[];
  agencyName: string;
  onLogAudit: (action: string, targetCollection: string, targetId: string, details: string) => Promise<void>;
  onToast: (title: string, msg?: string, variant?: 'success' | 'error' | 'info') => void;
}

export function AdminBookingsTab({
  bookings,
  agencyName,
  onLogAudit,
  onToast,
}: AdminBookingsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [selected, setSelected] = useState<BookingRecord | null>(null);

  // Edit drawer state
  const [editStatus, setEditStatus] = useState<BookingStatus>('New Request');
  const [editPayStatus, setEditPayStatus] = useState<PaymentStatus>('unpaid');
  const [editPnr, setEditPnr] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [ticketFileUrl, setTicketFileUrl] = useState('');
  const [ticketFileName, setTicketFileName] = useState('');
  const [saving, setSaving] = useState(false);

  const openDetail = (b: BookingRecord) => {
    setSelected(b);
    setEditStatus(b.bookingStatus);
    setEditPayStatus(b.paymentStatus);
    setEditPnr(b.supplierReference || '');
    setEditNotes(b.internalNotes || '');
    setTicketFileUrl(b.ticketFileUrl || '');
    setTicketFileName(b.ticketFileName || '');
  };

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return bookings.filter((b) => {
      if (statusFilter !== 'all' && b.bookingStatus !== statusFilter) return false;
      if (dateFilter) {
        const dt = b.createdAt?.toDate ? b.createdAt.toDate().toISOString().slice(0, 10) : '';
        if (dt !== dateFilter) return false;
      }
      if (!q) return true;
      const paxMatch = (b.passengers || []).some((p) =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q)
      );
      return (
        b.bookingReference.toLowerCase().includes(q) ||
        b.bookingId.toLowerCase().includes(q) ||
        (b.contactDetails?.email || '').toLowerCase().includes(q) ||
        paxMatch
      );
    });
  }, [bookings, searchTerm, statusFilter, dateFilter]);

  const handleTicketUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      onToast('Invalid Ticket File', 'Confirmed e-tickets must be PDF files.', 'error');
      return;
    }
    if (file.size > 500 * 1024) {
      onToast('File Too Large', 'PDF must be 500 KB or smaller.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setTicketFileUrl(String(reader.result || ''));
      setTicketFileName(file.name);
      setEditStatus('Ticket Issued');
      onToast('E-Ticket Attached', `${file.name} attached. Save changes to issue ticket to customer.`, 'info');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveChanges = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'bookings', selected.bookingId), {
        bookingStatus: editStatus,
        paymentStatus: editPayStatus,
        supplierReference: editPnr.trim(),
        internalNotes: editNotes.trim(),
        ticketFileUrl: ticketFileUrl || '',
        ticketFileName: ticketFileName || '',
        updatedAt: serverTimestamp(),
      });

      // Notify customer in portal + trigger email/WhatsApp webhook
      const notifId = generateId('ntf');
      const eventLabel =
        editStatus === 'Ticket Issued'
          ? 'Ticket Issued'
          : editStatus === 'Cancelled'
          ? 'Booking Cancelled'
          : editStatus === 'Refunded'
          ? 'Refund Update'
          : 'Booking Confirmed';

      await setDoc(doc(db, 'notifications', notifId), {
        notificationId: notifId,
        userId: selected.userId,
        bookingId: selected.bookingId,
        type: eventLabel,
        title: `${selected.bookingReference}: ${editStatus}`,
        message:
          editStatus === 'Ticket Issued'
            ? `Your airline e-ticket (${editPnr || 'PNR confirmed'}) is now available for download in My Bookings.`
            : `Your booking status has been updated to ${editStatus}. Payment status: ${editPayStatus.replace(/_/g, ' ')}.`,
        read: false,
        createdAt: serverTimestamp(),
      });

      fetch('/api/notifications/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: eventLabel,
          bookingReference: selected.bookingReference,
          recipientEmail: selected.contactDetails?.email || '',
          recipientPhone: selected.contactDetails?.whatsapp || '',
          customerName: `${selected.passengers?.[0]?.firstName || 'Traveler'}`,
          subject: `Booking Update: ${editStatus}`,
          message: `Status: ${editStatus}. ${editPnr ? `Supplier PNR: ${editPnr}.` : ''}`,
        }),
      }).catch(() => {});

      await onLogAudit(
        `Updated booking ${selected.bookingReference}`,
        'bookings',
        selected.bookingId,
        `Status=${editStatus}, Payment=${editPayStatus}, PNR=${editPnr || 'none'}`
      );

      onToast('Booking Updated', `${selected.bookingReference} saved.`, 'success');
      setSelected(null);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, `bookings/${selected.bookingId}`);
      } catch {
        onToast('Update Failed', 'Could not update booking.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="bg-white border border-[#D9E2EC] rounded-xl p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-[#627D98] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Booking Ref, ID, Passenger Name, Email..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#D9E2EC] text-xs text-[#102A43]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#D9E2EC] text-xs text-[#102A43]"
        >
          <option value="all">All Statuses</option>
          {ALL_BOOKING_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#D9E2EC] text-xs text-[#102A43] tabular-nums"
        />
      </div>

      {/* Bookings Table */}
      <div className="bg-white border border-[#D9E2EC] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F9FC] text-[#486581] border-b border-[#D9E2EC]">
              <tr>
                <th className="py-3 px-4 font-semibold">Reference</th>
                <th className="py-3 px-4 font-semibold">Lead Passenger</th>
                <th className="py-3 px-4 font-semibold">Route</th>
                <th className="py-3 px-4 font-semibold">Mode</th>
                <th className="py-3 px-4 font-semibold text-right">Amount</th>
                <th className="py-3 px-4 font-semibold">Payment</th>
                <th className="py-3 px-4 font-semibold">Booking Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6ECF2]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[#627D98]">
                    No bookings match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b.bookingId} className="hover:bg-[#F7F9FC]">
                    <td className="py-3 px-4 font-mono font-bold text-[#102A43]">{b.bookingReference}</td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-[#102A43]">
                        {b.passengers?.[0]?.firstName} {b.passengers?.[0]?.lastName}
                      </p>
                      <p className="text-[11px] text-[#627D98]">{b.contactDetails?.email}</p>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {b.flightDetails?.originCode} → {b.flightDetails?.destinationCode}
                    </td>
                    <td className="py-3 px-4 uppercase">{b.mode}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums">
                      {formatMoney(b.totalAmount, b.currency)}
                    </td>
                    <td className="py-3 px-4 capitalize">{b.paymentStatus.replace(/_/g, ' ')}</td>
                    <td className="py-3 px-4 font-semibold text-[#102A43]">{b.bookingStatus}</td>
                    <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                      <button
                        type="button"
                        onClick={() => openDetail(b)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#102A43] text-white text-[11px] font-semibold"
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

      {/* Booking Management Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#D9E2EC] max-w-3xl w-full p-6 sm:p-8 space-y-6 my-8">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E6ECF2] pb-4">
              <div>
                <p className="font-mono text-lg font-bold text-[#102A43]">{selected.bookingReference}</p>
                <p className="text-xs text-[#627D98]">
                  {selected.flightDetails?.originCode} → {selected.flightDetails?.destinationCode} · {selected.flightDetails?.airline} ({selected.flightDetails?.flightNumber}) · {selected.flightDetails?.departureDate}
                </p>
              </div>
              <button
                type="button"
                onClick={() => downloadBookingConfirmationPdf(selected, agencyName)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D9E2EC] text-xs font-semibold text-[#102A43]"
              >
                <Download className="w-3.5 h-3.5" /> Download Info PDF
              </button>
            </div>

            {/* Passengers */}
            <div className="bg-[#F7F9FC] border border-[#E6ECF2] rounded-xl p-4 space-y-2 text-xs">
              <p className="font-bold text-[#102A43]">Passengers ({selected.passengers?.length || 0})</p>
              {(selected.passengers || []).map((p, i) => (
                <p key={i} className="text-[#243B53]">
                  {i + 1}. <strong>{p.firstName} {p.lastName}</strong> ({p.type}) · DOB: {p.dateOfBirth} · {p.nationality} · Passport: {p.passportNumber || 'N/A'} (Exp: {p.passportExpiry || 'N/A'})
                </p>
              ))}
              <p className="text-[#486581] pt-1 border-t border-[#D9E2EC]">
                Contact: {selected.contactDetails?.email} · Phone: {selected.contactDetails?.phone} · WhatsApp: {selected.contactDetails?.whatsapp}
              </p>
            </div>

            {/* Admin Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#486581] mb-1">Booking Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as BookingStatus)}
                  className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#102A43]"
                >
                  {ALL_BOOKING_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#486581] mb-1">Payment Status</label>
                <select
                  value={editPayStatus}
                  onChange={(e) => setEditPayStatus(e.target.value as PaymentStatus)}
                  className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#102A43]"
                >
                  {ALL_PAYMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#486581] mb-1">
                  Supplier Reference / Airline PNR
                </label>
                <input
                  type="text"
                  value={editPnr}
                  onChange={(e) => setEditPnr(e.target.value.toUpperCase())}
                  placeholder="e.g. X8K9PL"
                  className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm font-mono text-[#102A43]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#486581] mb-1">
                  Upload Confirmed E-Ticket (PDF &le; 500 KB)
                </label>
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[#829AB1] bg-[#F7F9FC] cursor-pointer text-xs font-semibold text-[#102A43]">
                  <Upload className="w-4 h-4 text-[#168AAD]" />
                  <span className="truncate">{ticketFileName || 'Attach E-Ticket PDF'}</span>
                  <input type="file" accept="application/pdf" onChange={handleTicketUpload} className="sr-only" />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#486581] mb-1">Internal Admin Notes</label>
              <textarea
                rows={3}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Supplier communication, fare remarks, refund calculation..."
                className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#102A43]"
              />
            </div>

            <div className="flex flex-wrap justify-between items-center gap-3 pt-4 border-t border-[#E6ECF2]">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditStatus('Supplier Confirmation Pending');
                    setEditPayStatus('confirmed');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold"
                >
                  Quick Approve
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditStatus('Cancelled');
                    setEditPayStatus('rejected');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs font-semibold"
                >
                  Reject
                </button>
              </div>
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
                  onClick={handleSaveChanges}
                  className="px-5 py-2 rounded-lg bg-[#102A43] text-white text-xs font-semibold"
                >
                  {saving ? 'Saving...' : 'Save & Notify Customer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
