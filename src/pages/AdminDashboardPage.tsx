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
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Globe,
  KeyRound,
  Lock,
  LogOut,
  Mail,
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
import {
  createInitialDemoAdminState,
  DEMO_ADMIN_EMAIL,
  DEMO_ADMIN_PASSWORD,
  DEMO_ADMIN_UID,
} from '../lib/demoAdminData';
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
  const {
    user,
    isAdmin,
    isSuperAdmin,
    isDemoAdmin,
    authReady,
    loginWithGoogle,
    loginWithEmail,
    loginDemoAdmin,
    resendVerificationEmail,
    refreshProfile,
    logout,
  } = useAuth();
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

  // Admin gate login form state
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

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

  const isLiveAdmin = Boolean(user && isAdmin);
  const isDemoSandbox = Boolean(isDemoAdmin && !isLiveAdmin);
  const hasAdminAccess = isLiveAdmin || isDemoSandbox;

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

  // Load either Live Firestore streams OR Demo Sandbox state
  useEffect(() => {
    if (!authReady) return;

    if (isDemoSandbox) {
      const demo = createInitialDemoAdminState();
      setFlightRequests(demo.flightRequests);
      setBookings(demo.bookings);
      setPayments(demo.payments);
      setCustomers(demo.customers);
      setInquiries(demo.inquiries);
      setAuditLogs(demo.auditLogs);
      setAdmins(demo.admins);
      return;
    }

    if (!user || !isAdmin) return;

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
  }, [authReady, user, isAdmin, isDemoSandbox]);

  const logAudit = useCallback(
    async (action: string, targetCollection: string, targetId: string, details: string) => {
      const logId = generateId('log');
      if (isDemoSandbox) {
        setAuditLogs((prev) => [
          {
            logId,
            actorUid: DEMO_ADMIN_UID,
            actorEmail: DEMO_ADMIN_EMAIL,
            action,
            targetCollection,
            targetId,
            details,
            createdAt: { seconds: Math.floor(Date.now() / 1000), toDate: () => new Date() },
          },
          ...prev,
        ]);
        return;
      }
      if (!user) return;
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
    [user, isDemoSandbox]
  );

  const handleToggleMode = async (mode: 'demo' | 'live') => {
    if (isDemoSandbox) {
      showToast(
        'Demo Admin Sandbox',
        'Global operating mode in Firestore can only be toggled when signed in with Live Firebase Super Admin.',
        'info'
      );
      return;
    }
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

  const handleEmailAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const trimmedEmail = adminEmailInput.trim();

    if (trimmedEmail.toLowerCase() === DEMO_ADMIN_EMAIL.toLowerCase()) {
      const ok = loginDemoAdmin(trimmedEmail, adminPasswordInput);
      if (ok) {
        showToast(
          'Demo Admin Signed In',
          'You are viewing the interactive Demo Admin Operations Console.',
          'success'
        );
      } else {
        setLoginError(
          `Incorrect password for ${DEMO_ADMIN_EMAIL}. Use password "${DEMO_ADMIN_PASSWORD}" or click "Quick Demo Admin Login" below.`
        );
      }
      return;
    }

    setLoginBusy(true);
    try {
      await loginWithEmail(trimmedEmail, adminPasswordInput);
      showToast('Admin Sign-In Verified', 'Checking administrator permissions...', 'info');
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/operation-not-allowed') {
        setLoginError(
          'Email/Password provider is not enabled yet in Firebase Authentication Console. Use "Admin Sign In with Google" or sign in with the Demo Admin credentials below.'
        );
      } else if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setLoginError(
          'Invalid Firebase Admin email or password. For demo evaluation, use the Demo Admin credentials below.'
        );
      } else {
        setLoginError(err instanceof Error ? err.message : 'Unable to sign in.');
      }
    } finally {
      setLoginBusy(false);
    }
  };

  const handleQuickDemoLogin = () => {
    setLoginError(null);
    setAdminEmailInput(DEMO_ADMIN_EMAIL);
    setAdminPasswordInput(DEMO_ADMIN_PASSWORD);
    const ok = loginDemoAdmin(DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD);
    if (ok) {
      showToast(
        'Demo Admin Signed In',
        'Interactive Demo Operations Console unlocked.',
        'success'
      );
    }
  };

  const handleGoogleAdmin = async () => {
    setLoginError(null);
    setLoginBusy(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/unauthorized-domain') {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
        setLoginError(
          `Domain "${host}" is not authorized in Firebase Console > Authentication > Settings > Authorized domains yet. Add "${host}" there or use the Demo Admin Login below.`
        );
      } else {
        setLoginError(err instanceof Error ? err.message : 'Google sign-in was cancelled or blocked.');
      }
    } finally {
      setLoginBusy(false);
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
  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen bg-[#102A43] flex items-center justify-center px-4 py-10">
        <div className="max-w-md w-full bg-white rounded-2xl p-6 sm:p-8 space-y-5 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="inline-flex justify-center">
              <BrandLogo variant="dark" size="md" />
            </div>
            <ShieldAlert className="w-9 h-9 text-[#D4AF37] mx-auto" />
            <h1 className="font-display text-2xl font-bold text-[#102A43]">
              Admin Operations Portal
            </h1>
            <p className="text-xs text-[#486581] leading-relaxed">
              {!user
                ? 'Sign in with an authorized administrator account or launch the Demo Admin Console.'
                : !user.emailVerified
                ? `Signed in as ${user.email}, but your email is not verified yet.`
                : `Signed in as ${user.email}, which does not have live Firestore administrator privileges.`}
            </p>
          </div>

          {user && !user.emailVerified && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
              <p>Verify your email inbox link, then click Refresh Status to unlock live access.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    resendVerificationEmail()
                      .then(() => showToast('Email Sent', 'Check your inbox.', 'success'))
                      .catch(() => {})
                  }
                  className="px-3 py-1.5 rounded-lg bg-[#102A43] text-white font-semibold"
                >
                  Resend Verification
                </button>
                <button
                  type="button"
                  onClick={() => refreshProfile().catch(() => {})}
                  className="px-3 py-1.5 rounded-lg border border-[#D9E2EC] bg-white font-semibold text-[#102A43]"
                >
                  Refresh Status
                </button>
              </div>
            </div>
          )}

          {/* Email & Password Admin Form */}
          <form onSubmit={handleEmailAdminSubmit} className="space-y-3 text-left">
            <div>
              <label className="block text-xs font-semibold text-[#486581] mb-1">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#627D98] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={adminEmailInput}
                  onChange={(e) => setAdminEmailInput(e.target.value)}
                  placeholder="admin@thekingtravel.com"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#102A43]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#486581] mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#627D98] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full pl-9 pr-10 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#102A43]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#627D98] hover:text-[#102A43]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {loginError && (
              <div role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 leading-relaxed">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loginBusy}
              className="w-full py-2.5 rounded-lg bg-[#102A43] hover:bg-[#193B5C] text-white text-sm font-semibold disabled:opacity-60"
            >
              {loginBusy ? 'Signing In...' : 'Sign In with Email'}
            </button>
          </form>

          {/* Demo Admin Credentials Box */}
          <div className="rounded-xl border border-[#D4AF37]/40 bg-[#FFFDF7] p-4 space-y-2.5 text-left">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#102A43]">
                <KeyRound className="w-3.5 h-3.5 text-[#D4AF37]" />
                Demo Admin Credentials
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard
                    ?.writeText(`${DEMO_ADMIN_EMAIL} / ${DEMO_ADMIN_PASSWORD}`)
                    .then(() => showToast('Copied', 'Demo credentials copied to clipboard.', 'info'))
                    .catch(() => {});
                }}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#486581] hover:text-[#102A43]"
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
            </div>
            <div className="text-xs font-mono text-[#243B53] bg-white border border-[#E6ECF2] rounded-lg px-3 py-2 space-y-1">
              <p>
                <span className="text-[#627D98]">Email:</span> {DEMO_ADMIN_EMAIL}
              </p>
              <p>
                <span className="text-[#627D98]">Password:</span> {DEMO_ADMIN_PASSWORD}
              </p>
            </div>
            <button
              type="button"
              onClick={handleQuickDemoLogin}
              className="w-full py-2 rounded-lg bg-[#D4AF37] hover:bg-[#C39B28] text-[#102A43] text-xs font-bold transition-colors"
            >
              Auto-Fill &amp; Sign In as Demo Admin
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E6ECF2]" />
            </div>
            <div className="relative flex justify-center text-[11px]">
              <span className="bg-white px-2.5 text-[#627D98]">live production admin</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {!user ? (
              <button
                type="button"
                disabled={loginBusy}
                onClick={handleGoogleAdmin}
                className="w-full py-2.5 rounded-lg border border-[#D9E2EC] bg-white hover:bg-[#F7F9FC] text-[#102A43] text-xs font-semibold"
              >
                Live Super Admin Sign In with Google
              </button>
            ) : (
              <button
                type="button"
                onClick={() => logout()}
                className="w-full py-2.5 rounded-lg border border-[#D9E2EC] bg-white hover:bg-[#F7F9FC] text-[#102A43] text-xs font-semibold"
              >
                Sign Out ({user.email})
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full py-2 rounded-lg text-xs font-semibold text-[#627D98] hover:text-[#102A43]"
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

  const activeEmail = isLiveAdmin ? user?.email || '' : DEMO_ADMIN_EMAIL;
  const activeUid = isLiveAdmin ? user?.uid || '' : DEMO_ADMIN_UID;
  const roleLabel = isLiveAdmin ? (isSuperAdmin ? 'Super Admin' : 'Admin') : 'Demo Sandbox';

  return (
    <div className="min-h-screen bg-[#F9F9FA] flex flex-col lg:flex-row">
      {/* Admin Left Sidebar */}
      <aside className="w-full lg:w-64 bg-[#0F2942] text-white shrink-0 flex flex-col justify-between">
        <div>
          <div className="px-5 py-5 border-b border-[#193B5C]">
            <BrandLogo variant="light" size="sm" />
            <p className="text-[11px] text-[#9FB3C8] mt-1.5">
              Operations Console · {roleLabel}
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
          <p className="text-[11px] text-[#9FB3C8] truncate">{activeEmail}</p>
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
              onClick={() => logout()}
              className="lg:hidden px-3 py-1.5 rounded-lg border border-[#D9E2EC] text-xs font-semibold text-[#102A43]"
            >
              Sign Out
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-3.5 py-1.5 rounded-lg border border-[#D9E2EC] text-xs font-semibold text-[#102A43] hover:bg-[#F7F9FC]"
            >
              View Public Site
            </button>
          </div>
        </header>

        {isDemoSandbox && (
          <div className="bg-[#FFFBEB] border-b border-[#FDE68A] px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-[#92400E]">
            <span>
              <strong>Demo Admin Sandbox Active ({DEMO_ADMIN_EMAIL})</strong> — Viewing sample operations data. Actions update this browser session only without modifying live Firestore.
            </span>
            <button
              type="button"
              onClick={() => logout()}
              className="px-3 py-1 rounded-md bg-[#102A43] text-white font-semibold text-[11px]"
            >
              Switch to Live Firebase Admin
            </button>
          </div>
        )}

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
                if (isDemoSandbox) {
                  showToast(
                    'Demo Sandbox Mode',
                    'Seeding Firestore catalog requires signing in with Live Firebase Super Admin.',
                    'info'
                  );
                  return;
                }
                await seedDefaultCatalog();
                await logAudit('Seeded default catalog', 'settings', 'public', 'Initialized destinations, offers, testimonials');
                showToast('Catalog Initialized', 'Default agency catalog written to Firestore.', 'success');
              }}
            />
          )}

          {tab === 'requests' && (
            <AdminFlightRequestsTab
              requests={flightRequests}
              isDemoSandbox={isDemoSandbox}
              onDemoUpdateRequest={(updated) =>
                setFlightRequests((prev) =>
                  prev.map((item) => (item.requestId === updated.requestId ? updated : item))
                )
              }
              onLogAudit={logAudit}
              onToast={showToast}
            />
          )}

          {tab === 'bookings' && (
            <AdminBookingsTab
              bookings={bookings}
              agencyName={settings.agencyName}
              isDemoSandbox={isDemoSandbox}
              onDemoUpdateBooking={(updated) =>
                setBookings((prev) =>
                  prev.map((item) => (item.bookingId === updated.bookingId ? updated : item))
                )
              }
              onLogAudit={logAudit}
              onToast={showToast}
            />
          )}

          {tab === 'payments' && (
            <AdminPaymentsTab
              payments={payments}
              bookings={bookings}
              isDemoSandbox={isDemoSandbox}
              onDemoUpdatePayment={(paymentId, decision, remarks) => {
                const target = payments.find((p) => p.paymentId === paymentId);
                setPayments((prev) =>
                  prev.map((p) =>
                    p.paymentId === paymentId
                      ? { ...p, verificationStatus: decision, adminRemarks: remarks }
                      : p
                  )
                );
                if (target) {
                  setBookings((prev) =>
                    prev.map((b) =>
                      b.bookingId === target.bookingId
                        ? {
                            ...b,
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
                          }
                        : b
                    )
                  );
                }
              }}
              onLogAudit={logAudit}
              onToast={showToast}
            />
          )}

          {tab === 'customers' && (
            <AdminCustomersTab
              customers={customers}
              bookings={bookings}
              isDemoSandbox={isDemoSandbox}
              onDemoToggleCustomer={(uid, nextStatus) =>
                setCustomers((prev) =>
                  prev.map((c) => (c.uid === uid ? { ...c, status: nextStatus } : c))
                )
              }
              onLogAudit={logAudit}
              onToast={showToast}
            />
          )}

          {tab === 'offers' && (
            <AdminFlightOffersTab
              offers={manualFlightOffers}
              isDemoSandbox={isDemoSandbox}
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
              isDemoSandbox={isDemoSandbox}
              onLogAudit={logAudit}
              onToast={showToast}
            />
          )}

          {tab === 'inquiries' && (
            <AdminInquiriesTab
              inquiries={inquiries}
              isDemoSandbox={isDemoSandbox}
              onDemoReplyInquiry={(inquiryId, status, reply) =>
                setInquiries((prev) =>
                  prev.map((i) =>
                    i.inquiryId === inquiryId ? { ...i, status, adminReply: reply } : i
                  )
                )
              }
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
              isSuperAdmin={isSuperAdmin || isDemoSandbox}
              isDemoSandbox={isDemoSandbox}
              currentUid={activeUid}
              onLogAudit={logAudit}
              onToast={showToast}
            />
          )}
        </main>
      </div>
    </div>
  );
}
