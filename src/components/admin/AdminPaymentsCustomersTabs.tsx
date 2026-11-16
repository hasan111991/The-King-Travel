import React, { useMemo, useState } from 'react';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { CheckCircle2, Download, Search, XCircle } from 'lucide-react';
import { formatMoney } from '../../lib/defaultData';
import { db, generateId, handleFirestoreError, OperationType } from '../../lib/firebase';
import { downloadCsvReport } from '../../lib/pdfGenerator';
import type { BookingRecord, PaymentRecord, UserProfile } from '../../types/travel';

interface AdminPaymentsTabProps {
  payments: PaymentRecord[];
  bookings: BookingRecord[];
  onLogAudit: (action: string, targetCollection: string, targetId: string, details: string) => Promise<void>;
  onToast: (title: string, msg?: string, variant?: 'success' | 'error' | 'info') => void;
}

export function AdminPaymentsTab({
  payments,
  bookings,
  onLogAudit,
  onToast,
}: AdminPaymentsTabProps) {
  const [inspecting, setInspecting] = useState<PaymentRecord | null>(null);
  const [remarks, setRemarks] = useState('');

  const handleDecision = async (
    payment: PaymentRecord,
    decision: 'verified' | 'rejected' | 'refunded'
  ) => {
    try {
      await updateDoc(doc(db, 'payments', payment.paymentId), {
        verificationStatus: decision,
        adminRemarks: remarks.trim() || `Marked ${decision} by admin`,
        updatedAt: serverTimestamp(),
      });

      const booking = bookings.find((b) => b.bookingId === payment.bookingId);
      if (booking) {
        await updateDoc(doc(db, 'bookings', booking.bookingId), {
          paymentStatus:
            decision === 'verified'
              ? 'confirmed'
              : decision === 'rejected'
              ? 'rejected'
              : 'refunded',
          bookingStatus:
            decision === 'verified'
              ? 'Payment Confirmed'
              : decision === 'rejected'
              ? 'Pending Payment'
              : 'Refunded',
          updatedAt: serverTimestamp(),
        });

        const notifId = generateId('ntf');
        await setDoc(doc(db, 'notifications', notifId), {
          notificationId: notifId,
          userId: payment.userId,
          bookingId: payment.bookingId,
          type: 'Payment Verification Update',
          title: `Payment ${decision.toUpperCase()} · ${booking.bookingReference}`,
          message:
            decision === 'verified'
              ? 'Your payment has been verified by our accounts desk. Ticketing is in progress.'
              : `Payment status updated to ${decision}. ${remarks.trim()}`,
          read: false,
          createdAt: serverTimestamp(),
        });
      }

      await onLogAudit(
        `Payment ${decision}`,
        'payments',
        payment.paymentId,
        `Booking=${payment.bookingId}, Amount=${payment.currency} ${payment.amount}`
      );
      onToast('Payment Updated', `Marked as ${decision}.`, 'success');
      setInspecting(null);
      setRemarks('');
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, `payments/${payment.paymentId}`);
      } catch {
        onToast('Error', 'Unable to update payment status.', 'error');
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-[#102A43]">Payment & Receipt Verification</h2>
        <button
          type="button"
          onClick={() =>
            downloadCsvReport(
              'king-travel-payments.csv',
              ['Payment ID', 'Booking ID', 'Method', 'Reference', 'Amount', 'Currency', 'Status'],
              payments.map((p) => [
                p.paymentId,
                p.bookingId,
                p.paymentMethod,
                p.transactionReference || '',
                p.amount,
                p.currency,
                p.verificationStatus,
              ])
            )
          }
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#D9E2EC] bg-white text-xs font-semibold text-[#102A43]"
        >
          <Download className="w-3.5 h-3.5" /> Export Payments CSV
        </button>
      </div>

      <div className="bg-white border border-[#D9E2EC] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F9FC] text-[#486581] border-b border-[#D9E2EC]">
              <tr>
                <th className="py-3 px-4 font-semibold">Payment ID</th>
                <th className="py-3 px-4 font-semibold">Booking ID</th>
                <th className="py-3 px-4 font-semibold">Method</th>
                <th className="py-3 px-4 font-semibold">Reference</th>
                <th className="py-3 px-4 font-semibold text-right">Amount</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6ECF2]">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[#627D98]">
                    No payment records found.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.paymentId} className="hover:bg-[#F7F9FC]">
                    <td className="py-3 px-4 font-mono">{p.paymentId}</td>
                    <td className="py-3 px-4 font-mono text-[#627D98]">{p.bookingId}</td>
                    <td className="py-3 px-4">{p.paymentMethod}</td>
                    <td className="py-3 px-4 font-mono">{p.transactionReference || '-'}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums">
                      {formatMoney(p.amount, p.currency)}
                    </td>
                    <td className="py-3 px-4 font-semibold capitalize">{p.verificationStatus}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setInspecting(p);
                          setRemarks(p.adminRemarks || '');
                        }}
                        className="px-3 py-1.5 rounded-md bg-[#102A43] text-white text-[11px] font-semibold"
                      >
                        Verify / Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {inspecting && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#D9E2EC] max-w-lg w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-[#102A43]">
              Inspect Receipt · {inspecting.paymentId}
            </h3>
            <p className="text-xs text-[#486581]">
              {inspecting.paymentMethod} · Ref: {inspecting.transactionReference} ·{' '}
              <strong>{formatMoney(inspecting.amount, inspecting.currency)}</strong>
            </p>
            {inspecting.receiptUrl ? (
              <div className="border border-[#D9E2EC] rounded-xl p-2 bg-[#F7F9FC] max-h-64 overflow-auto text-center">
                {inspecting.receiptUrl.startsWith('data:application/pdf') ? (
                  <a
                    href={inspecting.receiptUrl}
                    download={inspecting.receiptFileName || 'receipt.pdf'}
                    className="inline-flex items-center gap-2 py-4 text-xs font-bold text-[#168AAD]"
                  >
                    <Download className="w-4 h-4" /> Download Uploaded PDF Receipt
                  </a>
                ) : (
                  <img
                    src={inspecting.receiptUrl}
                    alt="Uploaded payment receipt"
                    className="max-h-56 mx-auto rounded"
                  />
                )}
              </div>
            ) : (
              <p className="text-xs text-[#627D98]">No receipt attachment provided.</p>
            )}
            <div>
              <label className="block text-xs font-semibold text-[#486581] mb-1">Admin Remarks</label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Verification note or rejection reason"
                className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-xs"
              />
            </div>
            <div className="flex flex-wrap justify-between gap-2 pt-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleDecision(inspecting, 'verified')}
                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approve Payment
                </button>
                <button
                  type="button"
                  onClick={() => handleDecision(inspecting, 'rejected')}
                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold"
                >
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </button>
                <button
                  type="button"
                  onClick={() => handleDecision(inspecting, 'refunded')}
                  className="px-3 py-2 rounded-lg border border-[#D9E2EC] text-xs font-semibold text-[#102A43]"
                >
                  Mark Refunded
                </button>
              </div>
              <button
                type="button"
                onClick={() => setInspecting(null)}
                className="px-3 py-2 text-xs text-[#627D98]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface AdminCustomersTabProps {
  customers: UserProfile[];
  bookings: BookingRecord[];
  onLogAudit: (action: string, targetCollection: string, targetId: string, details: string) => Promise<void>;
  onToast: (title: string, msg?: string, variant?: 'success' | 'error' | 'info') => void;
}

export function AdminCustomersTab({
  customers,
  bookings,
  onLogAudit,
  onToast,
}: AdminCustomersTabProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q)
    );
  }, [customers, search]);

  const toggleStatus = async (c: UserProfile) => {
    const nextStatus = c.status === 'active' ? 'blocked' : 'active';
    try {
      await updateDoc(doc(db, 'users', c.uid), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      await onLogAudit(`Set customer status=${nextStatus}`, 'users', c.uid, c.email);
      onToast('Customer Updated', `${c.name} is now ${nextStatus}.`, 'info');
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, `users/${c.uid}`);
      } catch {
        onToast('Error', 'Unable to update customer status.', 'error');
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#D9E2EC] rounded-xl p-4 flex items-center gap-3">
        <Search className="w-4 h-4 text-[#627D98]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers by name, email, or phone..."
          className="flex-1 text-xs text-[#102A43] focus:outline-none"
        />
      </div>

      <div className="bg-white border border-[#D9E2EC] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F9FC] text-[#486581] border-b border-[#D9E2EC]">
              <tr>
                <th className="py-3 px-4 font-semibold">Customer</th>
                <th className="py-3 px-4 font-semibold">Contact</th>
                <th className="py-3 px-4 font-semibold text-right">Bookings</th>
                <th className="py-3 px-4 font-semibold">Role</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Account</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6ECF2]">
              {filtered.map((c) => {
                const count = bookings.filter((b) => b.userId === c.uid).length;
                return (
                  <tr key={c.uid} className="hover:bg-[#F7F9FC]">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-[#102A43]">{c.name}</p>
                      <p className="text-[11px] text-[#627D98]">{c.email}</p>
                    </td>
                    <td className="py-3 px-4 text-[#486581]">{c.phone || 'Not provided'}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">{count}</td>
                    <td className="py-3 px-4 capitalize">{c.role}</td>
                    <td className="py-3 px-4 font-semibold capitalize">{c.status}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => toggleStatus(c)}
                        className={`px-3 py-1.5 rounded-md text-[11px] font-semibold ${
                          c.status === 'active'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {c.status === 'active' ? 'Block Account' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
