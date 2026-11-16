import React, { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BrandLogo } from './BrandLogo';

const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/flights', label: 'Flights' },
  { to: '/hotels', label: 'Hotels' },
  { to: '/hajj-umrah', label: 'Hajj & Umrah' },
  { to: '/packages', label: 'Holiday Packages' },
  { to: '/about', label: 'About Us' },
  { to: '/contact', label: 'Contact Us' },
  { to: '/my-bookings', label: 'My Bookings' },
];

export function Navbar() {
  const { user, profile } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-200 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md border-b border-[#D9E2EC] shadow-sm'
          : 'bg-white border-b border-[#E6ECF2]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Official Brand Wordmark */}
        <Link
          to="/"
          className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FD8F1C] rounded-lg"
        >
          <BrandLogo variant="dark" size="sm" />
        </Link>

        {/* Zone 2: Clean Single-Line Navigation Links */}
        <nav className="hidden xl:flex items-center gap-5" aria-label="Main Navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `text-[13px] font-medium whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 ${
                  isActive
                    ? 'text-[#0F2942] border-[#FD8F1C]'
                    : 'text-[#486581] border-transparent hover:text-[#0F2942] hover:border-[#D9E2EC]'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Zone 3: Login / Account + Primary Book Now CTA */}
        <div className="hidden xl:flex items-center gap-3.5 shrink-0">
          {user ? (
            <Link
              to="/my-bookings"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#243B53] hover:text-[#0F2942] whitespace-nowrap shrink-0"
            >
              <User className="w-4 h-4 text-[#FD8F1C]" aria-hidden="true" />
              <span className="max-w-[110px] truncate">
                {profile?.name || user.displayName || 'Account'}
              </span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="text-[13px] font-medium text-[#486581] hover:text-[#0F2942] whitespace-nowrap shrink-0"
            >
              Login
            </Link>
          )}
          <Link
            to="/flight-request"
            className="px-4 py-2 text-[13px] font-semibold text-white bg-[#FD8F1C] hover:bg-[#E07A0E] rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs"
          >
            Book Now
          </Link>
        </div>

        {/* Mobile / Tablet Menu Toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="xl:hidden p-2 rounded-lg text-[#0F2942] hover:bg-[#F0F4F8] min-w-[44px] min-h-[44px] inline-flex items-center justify-center"
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile / Tablet Drawer */}
      {mobileOpen && (
        <div className="xl:hidden bg-white border-t border-[#E6ECF2] px-4 py-4 space-y-1.5">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm font-medium text-[#243B53] hover:bg-[#F9F9FA]"
            >
              {item.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-[#E6ECF2] flex flex-col gap-2">
            <Link
              to={user ? '/my-bookings' : '/login'}
              onClick={() => setMobileOpen(false)}
              className="w-full text-center px-4 py-2.5 rounded-lg border border-[#D9E2EC] text-sm font-medium text-[#0F2942]"
            >
              {user ? `Account (${profile?.name || 'Traveler'})` : 'Login / Register'}
            </Link>
            <Link
              to="/flight-request"
              onClick={() => setMobileOpen(false)}
              className="w-full text-center px-4 py-2.5 rounded-lg bg-[#FD8F1C] hover:bg-[#E07A0E] text-white text-sm font-semibold"
            >
              Book Now
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
