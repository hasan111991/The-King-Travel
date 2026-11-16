import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Footer } from './components/Footer';
import { Navbar } from './components/Navbar';
import { WhatsAppButton } from './components/WhatsAppButton';
import { AgencyProvider, useAgency } from './context/AgencyContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AboutPage } from './pages/AboutPage';
import { AuthPage } from './pages/AuthPage';
import { ContactPage } from './pages/ContactPage';
import { DestinationDetailPage } from './pages/DestinationDetailPage';
import { DestinationsPage } from './pages/DestinationsPage';
import { FlightRequestPage } from './pages/FlightRequestPage';
import { FlightsPage } from './pages/FlightsPage';
import { HajjUmrahPage } from './pages/HajjUmrahPage';
import { HomePage } from './pages/HomePage';
import { HotelsPage } from './pages/HotelsPage';
import { LegalPage } from './pages/LegalPage';
import { PackagesPage } from './pages/PackagesPage';
import { ServicesPage } from './pages/ServicesPage';

const AdminDashboardPage = lazy(() =>
  import('./pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage }))
);
const BookingDetailPage = lazy(() =>
  import('./pages/BookingDetailPage').then((m) => ({ default: m.BookingDetailPage }))
);
const BookingFlowPage = lazy(() =>
  import('./pages/BookingFlowPage').then((m) => ({ default: m.BookingFlowPage }))
);
const CustomerDashboardPage = lazy(() =>
  import('./pages/CustomerDashboardPage').then((m) => ({ default: m.CustomerDashboardPage }))
);

function RouteLoadingFallback() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4 text-sm text-[#627D98]">
      Loading The King Travel...
    </div>
  );
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message || 'An unexpected error occurred.' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F7F9FC] p-6">
          <div className="max-w-md w-full bg-white border border-[#D9E2EC] rounded-2xl p-8 text-center space-y-4">
            <h1 className="font-display text-2xl font-bold text-[#102A43]">Something went wrong</h1>
            <p className="text-xs text-[#627D98] break-words">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.assign(import.meta.env.BASE_URL || './')}
              className="px-5 py-2.5 rounded-lg bg-[#102A43] text-white text-xs font-semibold"
            >
              Return Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const ROUTE_LABELS: Record<string, string> = {
  '/flights': 'Search Flights',
  '/flight-request': 'Flight Booking Request',
  '/hotels': 'Hotel Reservations',
  '/hajj-umrah': 'Hajj & Umrah Packages',
  '/packages': 'Holiday, Tour & Honeymoon Packages',
  '/destinations': 'International & Domestic Destinations',
  '/services': 'Travel Services',
  '/about': 'About Us',
  '/contact': 'Contact Support',
  '/login': 'Sign In',
  '/register': 'Create Account',
  '/my-bookings': 'My Bookings',
  '/book': 'Complete Your Booking',
  '/terms': 'Terms & Conditions',
  '/privacy': 'Privacy Policy',
  '/refund-policy': 'Refund Policy',
  '/cancellation-policy': 'Cancellation Policy',
  '/booking-conditions': 'Booking Conditions',
  '/admin': 'Admin Operations Console',
};

function updateMetaContent(selector: string, content: string) {
  const el = document.querySelector<HTMLMetaElement>(selector);
  if (el && content) {
    el.setAttribute('content', content);
  }
}

function PageMetadataSync() {
  const { pathname } = useLocation();
  const { settings } = useAgency();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    const brandName = settings.agencyName?.trim() || 'The King Travel';
    const homeSeoTitle =
      settings.seoTitle?.trim() || `${brandName} – ${settings.tagline || 'Your Ultimate Travel Partner!'}`;

    let resolvedTitle = homeSeoTitle;
    if (pathname.startsWith('/destinations/')) {
      const slug = pathname.replace('/destinations/', '').replace(/-/g, ' ');
      const titleSlug = slug.replace(/\b\w/g, (c) => c.toUpperCase());
      resolvedTitle = `${titleSlug} Flights & Packages | ${brandName}`;
    } else if (ROUTE_LABELS[pathname]) {
      resolvedTitle = `${ROUTE_LABELS[pathname]} | ${brandName}`;
    }

    document.title = resolvedTitle;
    updateMetaContent('meta[property="og:title"]', resolvedTitle);
    updateMetaContent('meta[name="twitter:title"]', resolvedTitle);

    const seoDesc = settings.seoDescription?.trim();
    if (seoDesc) {
      updateMetaContent('meta[name="description"]', seoDesc);
      updateMetaContent('meta[property="og:description"]', seoDesc);
      updateMetaContent('meta[name="twitter:description"]', seoDesc);
    }
  }, [pathname, settings.agencyName, settings.tagline, settings.seoTitle, settings.seoDescription]);

  return null;
}

function AppLayout() {
  const { pathname } = useLocation();
  const isAdminRoute = pathname.startsWith('/admin');

  if (isAdminRoute) {
    return (
      <>
        <PageMetadataSync />
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </Suspense>
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F9F9FA] text-[#243B53]">
      <PageMetadataSync />
      <Navbar />
      <main className="flex-1">
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/flights" element={<FlightsPage />} />
            <Route path="/flight-request" element={<FlightRequestPage />} />
            <Route path="/hotels" element={<HotelsPage />} />
            <Route path="/hajj-umrah" element={<HajjUmrahPage />} />
            <Route path="/packages" element={<PackagesPage />} />
            <Route path="/book" element={<BookingFlowPage />} />
            <Route path="/destinations" element={<DestinationsPage />} />
            <Route path="/destinations/:slug" element={<DestinationDetailPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/register" element={<AuthPage mode="register" />} />
            <Route path="/my-bookings" element={<CustomerDashboardPage />} />
            <Route path="/booking/:bookingId" element={<BookingDetailPage />} />
            <Route path="/terms" element={<LegalPage docKey="terms" />} />
            <Route path="/privacy" element={<LegalPage docKey="privacy" />} />
            <Route path="/refund-policy" element={<LegalPage docKey="refundPolicy" />} />
            <Route path="/cancellation-policy" element={<LegalPage docKey="cancellationPolicy" />} />
            <Route path="/booking-conditions" element={<LegalPage docKey="bookingConditions" />} />
            {/* Legacy thekingtravel.com URL redirects */}
            <Route path="/about-us" element={<Navigate to="/about" replace />} />
            <Route path="/contactus" element={<Navigate to="/contact" replace />} />
            <Route path="/hajj/umrah" element={<Navigate to="/hajj-umrah" replace />} />
            <Route path="/honeymoon-packages" element={<Navigate to="/packages?category=honeymoon" replace />} />
            <Route path="/cc-form" element={<Navigate to="/flights" replace />} />
            <Route path="/gallery" element={<Navigate to="/destinations" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}

const useHashRouting =
  typeof window !== 'undefined' &&
  (window.location.hostname.endsWith('.github.io') ||
    window.location.protocol === 'file:' ||
    import.meta.env.VITE_HASH_ROUTER === 'true');

export default function App() {
  const Router = useHashRouting ? HashRouter : BrowserRouter;

  return (
    <AppErrorBoundary>
      <Router>
        <ToastProvider>
          <AuthProvider>
            <AgencyProvider>
              <AppLayout />
            </AgencyProvider>
          </AuthProvider>
        </ToastProvider>
      </Router>
    </AppErrorBoundary>
  );
}
