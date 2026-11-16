import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  BarChart3,
  CreditCard,
  FileSpreadsheet,
  Globe,
  LogOut,
  MessageSquare,
  Plane,
  Send,
  ShieldAlert,
  Tag,
  Users,
} from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { AdminBookingsTab } from '../components/admin/AdminBookingsTab';
import {
  AdminCmsAndSettingsTab,
  AdminFlightOffersTab,
  buildSanitizedSettingsPayload,
} from '../components/admin/AdminCmsAndOffersTabs';
import { AdminFlightRequestsTab } from '../components/admin/AdminFlightRequestsTab';
import { AdminOverviewTab } from '../components/admin/AdminOverviewTab';
import {
  AdminCustomersTab,
  AdminPaymentsTab,
} from '../components/admin/AdminPaymentsCustomersTabs';
import {
  AdminInquiriesTab,
  AdminReportsAndSecurityTab,
} from '../components/admin/AdminReportsAuditTabs';
import { useAgency } from '../context/AgencyContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { db, generateId } from '../lib/firebase';
import type {
  AdminRoleRecord,
  AuditLogItem,
  BookingRecord,
  FlightRequestRecord,
  InquiryItem,
  PaymentRecord,
  UserProfile,
} from '../types/travel';

type AdminTab =
  | 'overview'
  | 'requests'
  | 'bookings'
  | 'payments'
  | 'customers'
  | 'offers'
  | 'cms'
  | 'inquiries'
  | 'reports';

export function AdminDashboardPage() {
  const { user, isAdmin, isSuperAdmin, authReady, loginWithGoogle, logout } = useAuth();
  const {
    settings,
    destinations,
    travelPackages,
    specialOffers,
    testimonials,
    manualFlightOffers,
    hasFirestoreCatalog,
    seedDefaultCatalog,
  } = useAgency();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState<AdminTab>('overview');
  const [flightRequests, setFlightRequests] = useState<FlightRequestRecord[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [admins, setAdmins] = useState<AdminRoleRecord[]>([]);
  const [supplierStatus, setSupplierStatus] = useState<
    Array<{ provider: string; name: string; configured: boolean; environment: string }>
  >([]);

  useEffect(() => {
    fetch('/api/integrations/status')
      .then((r) => {
        if (!r.ok || !r.headers.get('content-type')?.includes('application/json')) return null;
        return r.json();
      })
      .then((d) => {
        if (d?.suppliers) setSupplierStatus(d.suppliers);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!authReady || !user || !isAdmin) return;

    const unsubs = [
      onSnapshot(
        collection(db, 'flightRequests'),
        (snap) => {
          const list = snap.docs.map((d) => d.data() as FlightRequestRecord);
          list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
          setFlightRequests(list);
        },
        (e) => console.error('Admin flightRequests stream:', e)
      ),
      onSnapshot(
        collection(db, 'bookings'),
        (snap) => {
          const list = snap.docs.map((d) => d.data() as BookingRecord);
          list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
          setBookings(list);
        },
        (e) => console.error('Admin bookings stream:', e)
      ),
      onSnapshot(
        collection(db, 'payments'),
        (snap) => {
          const list = snap.docs.map((d) => d.data() as PaymentRecord);
          list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
          setPayments(list);
        },
        (e) => console.error('Admin payments stream:', e)
      ),
      onSnapshot(
        collection(db, 'users'),
        (snap) => setCustomers(snap.docs.map((d) => d.data() as UserProfile)),
        (e) => console.error('Admin users stream:', e)
      ),
      onSnapshot(
        collection(db, 'inquiries'),
        (snap) => {
          const list = snap.docs.map((d) => d.data() as InquiryItem);
          list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
          setInquiries(list);
        },
        (e) => console.error('Admin inquiries stream:', e)
      ),
      onSnapshot(
        collection(db, 'auditLogs'),
        (snap) => {
          const list = snap.docs.map((d) => d.data() as AuditLogItem);
          list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
          setAuditLogs(list);
        },
        (e) => console.error('Admin audit stream:', e)
      ),
      onSnapshot(
        collection(db, 'admins'),
        (snap) => setAdmins(snap.docs.map((d) => d.data() as AdminRoleRecord)),
        () => {}
      ),
    ];

    return () => unsubs.forEach((u) => u());
  }, [authReady, user, isAdmin]);

  const logAudit = useCallback(
    async (action: string, targetCollection: string, targetId: string, details: string) => {
      if (!user) return;
      const logId = generateId('log');
      await setDoc(doc(db, 'auditLogs', logId), {
        logId,
        actorUid: user.uid,
        actorEmail: user.email || '',
        action,
        targetCollection,
        targetId,
        details,
        createdAt: serverTimestamp(),
      });
    },
    [user]
  );

  const handleToggleMode = async (mode: 'demo' | 'live') => {
    try {
      const payload = buildSanitizedSettingsPayload({
        ...settings,
        operatingMode: mode,
      });
      const batch = writeBatch(db);
      batch.set(doc(db, 'settings', 'public'), payload);
      batch.set(doc(db, 'websiteSettings', 'public'), payload);
      await batch.commit();
      await logAudit(`Switched operating mode to ${mode}`, 'settings', 'public', mode);
      showToast('Operating Mode Updated', `Platform is now in ${mode.toUpperCase()} mode.`, 'success');
    } catch (err) {
      showToast(
        'Update Failed',
        err instanceof Error ? err.message : 'Unable to switch operating mode.',
        'error'
      );
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F9FC] text-sm text-[#627D98]">
        Verifying administrator session...
      </div>
    );
  }

  // Protected Admin Gate
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#102A43] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 space-y-5 text-center shadow-2xl">
          <div className="inline-flex justify-center">
            <BrandLogo variant="dark" size="md" />
          </div>
          <ShieldAlert className="w-10 h-10 text-[#D4AF37] mx-auto" />
          <h1 className="font-display text-2xl font-bold text-[#102A43]">
            Restricted Admin Portal
          </h1>
          <p className="text-xs text-[#486581] leading-relaxed">
            {!user
              ? 'Sign in with an authorized administrator account to access The King Travel Operations Console.'
              : `Signed in as ${user.email}, which does not have administrator privileges.`}
          </p>
          <div className="flex flex-col gap-2.5 pt-2">
            {!user ? (
              <button
                type="button"
                onClick={() => loginWithGoogle().catch(() => {})}
                className="w-full py-2.5 rounded-lg bg-[#102A43] text-white text-sm font-semibold"
              >
                Admin Sign In with Google
              </button>
            ) : (
              <button
                type="button"
                onClick={() => logout()}
                className="w-full py-2.5 rounded-lg bg-[#102A43] text-white text-sm font-semibold"
              >
                Switch Account
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full py-2 rounded-lg border border-[#D9E2EC] text-xs font-semibold text-[#486581]"
            >
              Return to Public Website
            </button>
          </div>
        </div>
      </div>
    );
  }

  const navItems: Array<{ id: AdminTab; label: string; icon: React.ComponentType<any>; count?: number }> = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    {
      id: 'requests',
      label: 'Flight Requests',
      icon: Send,
      count: flightRequests.filter(
        (r) => r.status === 'New Request' || r.paymentStatus === 'pending_verification'
      ).length,
    },
    { id: 'bookings', label: 'Bookings', icon: Plane, count: bookings.length },
    { id: 'payments', label: 'Payments', icon: CreditCard, count: payments.filter((p) => p.verificationStatus === 'pending').length },
    { id: 'customers', label: 'Customers', icon: Users, count: customers.length },
    { id: 'offers', label: 'Flight Offers', icon: Tag },
    { id: 'cms', label: 'Website CMS', icon: Globe },
    { id: 'inquiries', label: 'Inquiries', icon: MessageSquare, count: inquiries.filter((i) => i.status === 'new').length },
    { id: 'reports', label: 'Reports & Audit', icon: FileSpreadsheet },
  ];

  return (
    <div className="min-h-screen bg-[#F9F9FA] flex flex-col lg:flex-row">
      {/* Admin Left Sidebar */}
      <aside className="w-full lg:w-64 bg-[#0F2942] text-white shrink-0 flex flex-col justify-between">
        <div>
          <div className="px-5 py-5 border-b border-[#193B5C]">
            <BrandLogo variant="light" size="sm" />
            <p className="text-[11px] text-[#9FB3C8] mt-1.5">
              Operations Console · {isSuperAdmin ? 'Super Admin' : 'Admin'}
            </p>
          </div>
          <nav className="p-3 space-y-1 flex lg:flex-col overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                    active ? 'bg-[#FD8F1C] text-white' : 'text-[#BCCCDC] hover:bg-[#193B5C] hover:text-white'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </span>
                  {typeof item.count === 'number' && item.count > 0 && (
                    <span className={`font-mono text-[11px] ${active ? 'text-white' : 'text-[#FD8F1C]'}`}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-[#1C3D5A] hidden lg:block space-y-2">
          <p className="text-[11px] text-[#9FB3C8] truncate">{user.email}</p>
          <button
            type="button"
            onClick={() => logout().then(() => navigate('/'))}
            className="w-full inline-flex items-center justify-center gap-2 py-2 rounded-lg bg-[#1C3D5A] hover:bg-[#243B53] text-xs font-semibold text-white"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-white border-b border-[#D9E2EC] px-6 py-4 flex items-center justify-between gap-4">
          <div className="text-sm font-semibold text-[#102A43]">
            Admin <span className="text-[#9FB3C8] mx-1.5">/</span>{' '}
            <span className="capitalize">{navItems.find((n) => n.id === tab)?.label}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-3.5 py-1.5 rounded-lg border border-[#D9E2EC] text-xs font-semibold text-[#102A43] hover:bg-[#F7F9FC]"
            >
              View Public Site
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 flex-1">
          {tab === 'overview' && (
            <AdminOverviewTab
              bookings={bookings}
              payments={payments}
              customers={customers}
              settings={settings}
              hasFirestoreCatalog={hasFirestoreCatalog}
              supplierStatus={supplierStatus}
              onToggleMode={handleToggleMode}
              onSeedCatalog={async () => {
                await seedDefaultCatalog();
                await logAudit('Seeded default catalog', 'settings', 'public', 'Initialized destinations, offers, testimonials');
                showToast('Catalog Initialized', 'Default agency catalog written to Firestore.', 'success');
              }}
            />
          )}

          {tab === 'requests' && (
            <AdminFlightRequestsTab
              requests={flightRequests}
              onLogAudit={logAudit}
              onToast={showToast}
            />
          )}

          {tab === 'bookings' && (
            <AdminBookingsTab
              bookings={bookings}
              agencyName={settings.agencyName}
              onLogAudit={logAudit}
              onToast={showToast}
            />
          )}

          {tab === 'payments' && (
            <AdminPaymentsTab
              payments={payments}
              bookings={bookings}
              onLogAudit={logAudit}
              onToast={showToast}
            />
          )}

          {tab === 'customers' && (
            <AdminCustomersTab
              customers={customers}
              bookings={bookings}
              onLogAudit={logAudit}
              onToast={showToast}
            />
          )}

          {tab === 'offers' && (
            <AdminFlightOffersTab
              offers={manualFlightOffers}
              onLogAudit={logAudit}
              onToast={showToast}
            />
          )}

          {tab === 'cms' && (
            <AdminCmsAndSettingsTab
              settings={settings}
              destinations={destinations}
              travelPackages={travelPackages}
              specialOffers={specialOffers}
              testimonials={testimonials}
              onLogAudit={logAudit}
              onToast={showToast}
            />
          )}

          {tab === 'inquiries' && (
            <AdminInquiriesTab
              inquiries={inquiries}
              onLogAudit={logAudit}
              onToast={showToast}
            />
          )}

          {tab === 'reports' && (
            <AdminReportsAndSecurityTab
              bookings={bookings}
              payments={payments}
              customers={customers}
              auditLogs={auditLogs}
              admins={admins}
              isSuperAdmin={isSuperAdmin}
              currentUid={user.uid}
              onLogAudit={logAudit}
              onToast={showToast}
            />
          )}
        </main>
      </div>
    </div>
  );
}
