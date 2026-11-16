import React, { useState } from 'react';
import { deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { Download, Shield, Trash2 } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { buildReportData, downloadAdminPdfReport, downloadCsvReport } from '../../lib/pdfGenerator';
import type {
  AdminRoleRecord,
  AuditLogItem,
  BookingRecord,
  InquiryItem,
  PaymentRecord,
  UserProfile,
} from '../../types/travel';

interface InquiriesTabProps {
  inquiries: InquiryItem[];
  onLogAudit: (action: string, targetCollection: string, targetId: string, details: string) => Promise<void>;
  onToast: (title: string, msg?: string, variant?: 'success' | 'error' | 'info') => void;
}

export function AdminInquiriesTab({ inquiries, onLogAudit, onToast }: InquiriesTabProps) {
  const [replyTarget, setReplyTarget] = useState<InquiryItem | null>(null);
  const [replyText, setReplyText] = useState('');
  const [status, setStatus] = useState<'new' | 'in_progress' | 'resolved'>('resolved');

  const submitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyTarget) return;
    try {
      await updateDoc(doc(db, 'inquiries', replyTarget.inquiryId), {
        status,
        adminReply: replyText.trim(),
        updatedAt: serverTimestamp(),
      });
      await onLogAudit('Replied to inquiry', 'inquiries', replyTarget.inquiryId, status);
      onToast('Reply Saved', 'Inquiry status updated.', 'success');
      setReplyTarget(null);
      setReplyText('');
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, `inquiries/${replyTarget.inquiryId}`);
      } catch {
        onToast('Error', 'Could not update inquiry.', 'error');
      }
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-base font-bold text-[#102A43]">Customer Inquiries & Booking Support</h2>
      <div className="space-y-3">
        {inquiries.length === 0 ? (
          <div className="bg-white border border-[#D9E2EC] rounded-xl p-8 text-center text-sm text-[#627D98]">
            No customer inquiries recorded yet.
          </div>
        ) : (
          inquiries.map((inq) => (
            <div key={inq.inquiryId} className="bg-white border border-[#D9E2EC] rounded-xl p-5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-bold text-[#102A43]">{inq.subject}</span>
                  {inq.bookingId && <span className="ml-2 font-mono text-[#168AAD]">({inq.bookingId})</span>}
                </div>
                <span className="font-semibold capitalize text-[#168AAD]">{inq.status.replace('_', ' ')}</span>
              </div>
              <p className="text-xs text-[#627D98]">
                {inq.name} · {inq.email} · {inq.phone}
              </p>
              <p className="text-sm text-[#243B53]">{inq.message}</p>
              {inq.adminReply && (
                <p className="text-xs text-[#102A43] bg-[#F7F9FC] p-2.5 rounded-lg border border-[#E6ECF2]">
                  <strong>Admin Reply:</strong> {inq.adminReply}
                </p>
              )}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setReplyTarget(inq);
                    setReplyText(inq.adminReply || '');
                    setStatus(inq.status);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-[#102A43] text-white text-xs font-semibold"
                >
                  Respond / Update Status
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {replyTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={submitReply} className="bg-white rounded-2xl border border-[#D9E2EC] max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-[#102A43]">Respond to {replyTarget.name}</h3>
            <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-xs">
              <option value="new">New</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
            <textarea required rows={4} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Type response visible in customer support portal..." className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-xs" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setReplyTarget(null)} className="px-4 py-2 text-xs text-[#627D98]">Cancel</button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-[#102A43] text-white text-xs font-semibold">Save Reply</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

interface ReportsAuditTabProps {
  bookings: BookingRecord[];
  payments: PaymentRecord[];
  customers: UserProfile[];
  auditLogs: AuditLogItem[];
  admins: AdminRoleRecord[];
  isSuperAdmin: boolean;
  currentUid: string;
  onLogAudit: (action: string, targetCollection: string, targetId: string, details: string) => Promise<void>;
  onToast: (title: string, msg?: string, variant?: 'success' | 'error' | 'info') => void;
}

export function AdminReportsAndSecurityTab({
  bookings,
  payments,
  customers,
  auditLogs,
  admins,
  isSuperAdmin,
  currentUid,
  onLogAudit,
  onToast,
}: ReportsAuditTabProps) {
  const [adminUid, setAdminUid] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminRole, setAdminRole] = useState<'admin' | 'super_admin'>('admin');

  const exportReport = (
    type: 'daily' | 'monthly' | 'customers' | 'revenue' | 'payments' | 'cancellations',
    format: 'csv' | 'pdf'
  ) => {
    const data = buildReportData(type, bookings, payments, customers);
    if (format === 'csv') {
      downloadCsvReport(`king-travel-${type}-report.csv`, data.headers, data.rows);
    } else {
      downloadAdminPdfReport(
        data.title,
        `${data.rows.length} records`,
        data.headers,
        data.rows,
        `king-travel-${type}-report.pdf`
      );
    }
    onToast('Report Generated', `${data.title} (${format.toUpperCase()}) downloaded.`, 'success');
  };

  const assignAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    try {
      await setDoc(doc(db, 'admins', adminUid.trim()), {
        uid: adminUid.trim(),
        email: adminEmail.trim(),
        name: adminName.trim(),
        role: adminRole,
        assignedBy: currentUid,
        createdAt: serverTimestamp(),
      });
      await onLogAudit('Assigned admin role', 'admins', adminUid.trim(), `${adminEmail} (${adminRole})`);
      setAdminUid('');
      setAdminEmail('');
      setAdminName('');
      onToast('Admin Assigned', 'Role permissions updated.', 'success');
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.CREATE, `admins/${adminUid}`);
      } catch {
        onToast('Permission Denied', 'Only Super Admins can assign admin roles.', 'error');
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Downloadable Reports */}
      <div className="bg-white border border-[#D9E2EC] rounded-xl p-6 space-y-4">
        <h2 className="text-base font-bold text-[#102A43]">Downloadable Agency Reports (CSV & PDF)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(
            [
              { id: 'daily', label: 'Daily Booking Report' },
              { id: 'monthly', label: 'Monthly Booking Report' },
              { id: 'customers', label: 'Customer Report' },
              { id: 'revenue', label: 'Revenue Report' },
              { id: 'payments', label: 'Payment Report' },
              { id: 'cancellations', label: 'Cancellation Report' },
            ] as const
          ).map((r) => (
            <div key={r.id} className="border border-[#E6ECF2] rounded-xl p-4 flex flex-col justify-between gap-3 bg-[#F7F9FC]">
              <p className="text-sm font-bold text-[#102A43]">{r.label}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => exportReport(r.id, 'csv')}
                  className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-lg border border-[#D9E2EC] bg-white text-xs font-semibold text-[#102A43]"
                >
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
                <button
                  type="button"
                  onClick={() => exportReport(r.id, 'pdf')}
                  className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#102A43] text-white text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" /> PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Super Admin RBAC Management */}
      {isSuperAdmin && (
        <div className="bg-white border border-[#D9E2EC] rounded-xl p-6 space-y-4">
          <h2 className="text-base font-bold text-[#102A43] inline-flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#D4AF37]" /> Super Admin — Role Management
          </h2>
          <form onSubmit={assignAdmin} className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
            <input required placeholder="Firebase User UID" value={adminUid} onChange={(e) => setAdminUid(e.target.value)} className="px-3 py-2 rounded-lg border border-[#D9E2EC] font-mono" />
            <input required type="email" placeholder="Admin Email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} className="px-3 py-2 rounded-lg border border-[#D9E2EC]" />
            <input required placeholder="Full Name" value={adminName} onChange={(e) => setAdminName(e.target.value)} className="px-3 py-2 rounded-lg border border-[#D9E2EC]" />
            <select value={adminRole} onChange={(e) => setAdminRole(e.target.value as any)} className="px-3 py-2 rounded-lg border border-[#D9E2EC]">
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
            <button type="submit" className="px-4 py-2 rounded-lg bg-[#102A43] text-white font-semibold">Assign Role</button>
          </form>
          {admins.length > 0 && (
            <div className="divide-y divide-[#E6ECF2] text-xs">
              {admins.map((a) => (
                <div key={a.uid} className="py-2 flex items-center justify-between">
                  <span><strong>{a.name}</strong> ({a.email}) · <span className="font-mono">{a.role}</span></span>
                  {a.uid !== currentUid && (
                    <button type="button" onClick={() => deleteDoc(doc(db, 'admins', a.uid))} className="text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Immutable Audit Logs */}
      <div className="bg-white border border-[#D9E2EC] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E6ECF2]">
          <h2 className="text-base font-bold text-[#102A43]">Immutable Admin Audit Logs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F9FC] text-[#486581] border-b border-[#D9E2EC]">
              <tr>
                <th className="py-3 px-4 font-semibold">Actor</th>
                <th className="py-3 px-4 font-semibold">Action</th>
                <th className="py-3 px-4 font-semibold">Target</th>
                <th className="py-3 px-4 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6ECF2]">
              {auditLogs.slice(0, 40).map((log) => (
                <tr key={log.logId}>
                  <td className="py-2.5 px-4">{log.actorEmail}</td>
                  <td className="py-2.5 px-4 font-semibold text-[#102A43]">{log.action}</td>
                  <td className="py-2.5 px-4 font-mono">{log.targetCollection}/{log.targetId}</td>
                  <td className="py-2.5 px-4 text-[#627D98]">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
