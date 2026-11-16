import React, { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Database, RefreshCw } from 'lucide-react';
import { formatMoney } from '../../lib/defaultData';
import type { AgencySettings, BookingRecord, PaymentRecord, UserProfile } from '../../types/travel';

interface AdminOverviewTabProps {
  bookings: BookingRecord[];
  payments: PaymentRecord[];
  customers: UserProfile[];
  settings: AgencySettings;
  hasFirestoreCatalog: boolean;
  supplierStatus: Array<{ provider: string; name: string; configured: boolean; environment: string }>;
  onToggleMode: (mode: 'demo' | 'live') => Promise<void>;
  onSeedCatalog: () => Promise<void>;
}

const CHART_COLORS = ['#102A43', '#168AAD', '#D4AF37', '#486581', '#059669', '#DC2626'];

export function AdminOverviewTab({
  bookings,
  payments,
  customers,
  settings,
  hasFirestoreCatalog,
  supplierStatus,
  onToggleMode,
  onSeedCatalog,
}: AdminOverviewTabProps) {
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    let todays = 0;
    let pending = 0;
    let confirmed = 0;
    let cancelled = 0;
    let revenuePkr = 0;

    bookings.forEach((b) => {
      const dateStr = b.createdAt?.toDate ? b.createdAt.toDate().toISOString().slice(0, 10) : '';
      if (dateStr === todayStr) todays += 1;
      if (['New Request', 'Pending Payment', 'Payment Verification', 'Supplier Confirmation Pending'].includes(b.bookingStatus)) {
        pending += 1;
      }
      if (['Payment Confirmed', 'Ticket Issued'].includes(b.bookingStatus)) {
        confirmed += 1;
      }
      if (['Cancelled', 'Refund Requested', 'Refunded'].includes(b.bookingStatus)) {
        cancelled += 1;
      }
      if (b.paymentStatus === 'confirmed') {
        revenuePkr += Number(b.totalAmount || 0);
      }
    });

    const pendingPayments = payments.filter((p) => p.verificationStatus === 'pending').length;

    return {
      total: bookings.length,
      todays,
      pending,
      confirmed,
      cancelled,
      revenuePkr,
      pendingPayments,
      totalCustomers: customers.length,
    };
  }, [bookings, payments, customers]);

  const monthlyData = useMemo(() => {
    const map = new Map<string, { month: string; bookings: number; revenue: number }>();
    bookings.forEach((b) => {
      const dt = b.createdAt?.toDate ? b.createdAt.toDate() : new Date();
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const existing = map.get(key) || { month: key, bookings: 0, revenue: 0 };
      existing.bookings += 1;
      if (b.paymentStatus === 'confirmed') {
        existing.revenue += Number(b.totalAmount || 0);
      }
      map.set(key, existing);
    });
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [bookings]);

  const destinationData = useMemo(() => {
    const counts = new Map<string, number>();
    bookings.forEach((b) => {
      const dest = b.flightDetails?.destinationCode || b.flightDetails?.destination || 'Other';
      counts.set(dest, (counts.get(dest) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [bookings]);

  const statusDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    bookings.forEach((b) => {
      counts.set(b.bookingStatus, (counts.get(b.bookingStatus) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
  }, [bookings]);

  return (
    <div className="space-y-6">
      {/* Operating Mode & Firestore Seed Controls */}
      <div className="bg-white border border-[#D9E2EC] rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-[#102A43]">Platform Operating Mode & Supplier APIs</h2>
          <p className="text-xs text-[#486581] mt-1">
            Suppliers:{' '}
            {supplierStatus.map((s) => `${s.name} (${s.configured ? 'Configured' : 'Keys Missing'})`).join(' · ')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!hasFirestoreCatalog && (
            <button
              type="button"
              onClick={onSeedCatalog}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#D4AF37] text-[#102A43] text-xs font-bold"
            >
              <Database className="w-3.5 h-3.5" /> Initialize Firestore Catalog
            </button>
          )}
          <div className="inline-flex p-1 bg-[#F0F4F8] rounded-lg">
            <button
              type="button"
              onClick={() => onToggleMode('demo')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                settings.operatingMode === 'demo'
                  ? 'bg-[#102A43] text-white'
                  : 'text-[#486581]'
              }`}
            >
              Demo Mode
            </button>
            <button
              type="button"
              onClick={() => onToggleMode('live')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                settings.operatingMode === 'live'
                  ? 'bg-emerald-700 text-white'
                  : 'text-[#486581]'
              }`}
            >
              Live Mode
            </button>
          </div>
        </div>
      </div>

      {/* 8 Real KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Bookings', value: stats.total },
          { label: "Today's Bookings", value: stats.todays },
          { label: 'Pending Bookings', value: stats.pending },
          { label: 'Confirmed Bookings', value: stats.confirmed },
          { label: 'Cancelled / Refunds', value: stats.cancelled },
          { label: 'Confirmed Revenue', value: formatMoney(stats.revenuePkr, settings.defaultCurrency) },
          { label: 'Pending Receipt Verifications', value: stats.pendingPayments },
          { label: 'Registered Customers', value: stats.totalCustomers },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white border border-[#D9E2EC] rounded-xl p-4">
            <p className="text-xs font-medium text-[#627D98]">{kpi.label}</p>
            <p className="font-mono text-2xl font-bold text-[#102A43] mt-1.5 tabular-nums">
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* 4 Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#D9E2EC] rounded-xl p-5">
          <h3 className="text-sm font-bold text-[#102A43] mb-4">Monthly Bookings</h3>
          <div className="h-64">
            {monthlyData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#627D98]">
                No booking records yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E6ECF2" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="bookings" fill="#102A43" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white border border-[#D9E2EC] rounded-xl p-5">
          <h3 className="text-sm font-bold text-[#102A43] mb-4">Revenue Trends</h3>
          <div className="h-64">
            {monthlyData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#627D98]">
                Confirmed revenue will appear here once payments are verified.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E6ECF2" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="revenue" stroke="#168AAD" fill="#168AAD" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white border border-[#D9E2EC] rounded-xl p-5">
          <h3 className="text-sm font-bold text-[#102A43] mb-4">Popular Destinations</h3>
          <div className="h-64">
            {destinationData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#627D98]">
                No destination data recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={destinationData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E6ECF2" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={56} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#D4AF37" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white border border-[#D9E2EC] rounded-xl p-5">
          <h3 className="text-sm font-bold text-[#102A43] mb-4">Booking Status Distribution</h3>
          <div className="h-64">
            {statusDistribution.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#627D98]">
                No bookings recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name} (${value})`}
                  >
                    {statusDistribution.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {hasFirestoreCatalog && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onSeedCatalog}
            className="inline-flex items-center gap-1.5 text-xs text-[#627D98] hover:text-[#102A43]"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Re-sync Default Seed Catalog
          </button>
        </div>
      )}
    </div>
  );
}
