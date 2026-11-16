import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Mail, MapPin, Phone, Send } from 'lucide-react';
import { useAgency } from '../context/AgencyContext';
import { useToast } from '../context/ToastContext';
import { TRAVEL_SERVICES } from '../lib/defaultData';
import { db, generateId, handleFirestoreError, OperationType } from '../lib/firebase';
import { BrandLogo } from './BrandLogo';

export function Footer() {
  const { settings } = useAgency();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
      showToast('Invalid Email', 'Please enter a valid email address.', 'error');
      return;
    }
    setSubmitting(true);
    const subId = generateId('sub');
    try {
      await setDoc(doc(db, 'newsletter', subId), {
        email: cleaned,
        createdAt: serverTimestamp(),
      });
      setEmail('');
      showToast('Subscribed', 'You have been added to The King Travel fare updates.', 'success');
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.CREATE, `newsletter/${subId}`);
      } catch {
        showToast('Subscription Failed', 'Unable to save newsletter subscription right now.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="bg-[#0F2942] text-[#D9E2EC] border-t border-[#1C3D5A]">
      {/* Newsletter Strip */}
      <div className="border-b border-[#1C3D5A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-xl">
            <h3 className="font-display text-2xl font-semibold text-white">
              Seasonal Fare Deals & Travel Updates
            </h3>
            <p className="text-sm text-[#BCCCDC] mt-1">
              Subscribe for discounted airline tickets, 3 Check Bags deals, Umrah Season departures, and custom tour packages.
            </p>
          </div>
          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <label htmlFor="footer-newsletter" className="sr-only">
              Email address
            </label>
            <input
              id="footer-newsletter"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="px-4 py-2.5 rounded-lg bg-[#1C3D5A] border border-[#334E68] text-white placeholder-[#9FB3C8] text-sm min-w-[260px] focus:outline-none focus:border-[#FD8F1C]"
            />
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#FD8F1C] hover:bg-[#E07A0E] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
            >
              <Send className="w-4 h-4" aria-hidden="true" />
              {submitting ? 'Subscribing...' : 'Subscribe'}
            </button>
          </form>
        </div>
      </div>

      {/* Main Footer Columns */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        <div>
          <BrandLogo variant="light" size="sm" />
          <p className="text-sm text-[#BCCCDC] mt-4 leading-relaxed">
            <strong className="text-white">{settings.tagline}</strong> At The King Travel, we believe that travel is not just about reaching a destination – it’s about creating unforgettable memories, experiencing new cultures, and exploring the world with comfort and confidence.
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-[#9FB3C8]">
            {settings.socialLinks?.facebook && (
              <a
                href={settings.socialLinks.facebook}
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#FD8F1C] transition-colors"
              >
                Facebook
              </a>
            )}
            {settings.socialLinks?.youtube && (
              <a
                href={settings.socialLinks.youtube}
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#FD8F1C] transition-colors"
              >
                YouTube
              </a>
            )}
            {settings.socialLinks?.instagram && (
              <a
                href={settings.socialLinks.instagram}
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#FD8F1C] transition-colors"
              >
                Instagram
              </a>
            )}
            {settings.socialLinks?.tiktok && (
              <a
                href={settings.socialLinks.tiktok}
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#FD8F1C] transition-colors"
              >
                TikTok
              </a>
            )}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white tracking-wide mb-4">Quick Links</h4>
          <ul className="space-y-2.5 text-sm text-[#BCCCDC]">
            <li><Link to="/" className="hover:text-[#FD8F1C] transition-colors">Home</Link></li>
            <li><Link to="/flights" className="hover:text-[#FD8F1C] transition-colors">Flights</Link></li>
            <li><Link to="/hotels" className="hover:text-[#FD8F1C] transition-colors">Hotels</Link></li>
            <li><Link to="/hajj-umrah" className="hover:text-[#FD8F1C] transition-colors">Hajj & Umrah</Link></li>
            <li><Link to="/packages" className="hover:text-[#FD8F1C] transition-colors">Holiday Packages</Link></li>
            <li><Link to="/destinations" className="hover:text-[#FD8F1C] transition-colors">Destinations</Link></li>
            <li><Link to="/my-bookings" className="hover:text-[#FD8F1C] transition-colors">My Bookings</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white tracking-wide mb-4">Travel Services</h4>
          <ul className="space-y-2.5 text-sm text-[#BCCCDC]">
            {TRAVEL_SERVICES.slice(0, 6).map((svc) => (
              <li key={svc.id}>
                <Link to="/services" className="hover:text-[#FD8F1C] transition-colors">
                  {svc.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white tracking-wide mb-4">Dallas Office & Contact</h4>
          <ul className="space-y-3 text-sm text-[#BCCCDC]">
            <li className="flex items-start gap-2.5">
              <Phone className="w-4 h-4 text-[#FD8F1C] shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-0.5">
                <a href={`tel:${settings.contactPhone.replace(/\s+/g, '')}`} className="block hover:text-white">
                  {settings.contactPhone}
                </a>
                {settings.secondaryPhone && (
                  <a href={`tel:${settings.secondaryPhone.replace(/\s+/g, '')}`} className="block hover:text-white">
                    {settings.secondaryPhone}
                  </a>
                )}
              </div>
            </li>
            <li className="flex items-start gap-2.5">
              <Mail className="w-4 h-4 text-[#FD8F1C] shrink-0 mt-0.5" aria-hidden="true" />
              <a href={`mailto:${settings.contactEmail}`} className="break-all hover:text-white">
                {settings.contactEmail}
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-[#FD8F1C] shrink-0 mt-0.5" aria-hidden="true" />
              <span>{settings.officeAddress}</span>
            </li>
            {settings.whatsappNumber && (
              <li>
                <a
                  href={`https://wa.me/${settings.whatsappNumber.replace(/[^\d]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-[#FD8F1C] hover:underline font-medium"
                >
                  WhatsApp Desk: {settings.whatsappNumber}
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Bottom Legal Bar */}
      <div className="border-t border-[#1C3D5A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#9FB3C8]">
          <p>&copy; {new Date().getFullYear()} {settings.agencyName}. Dallas, Texas, USA. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-5">
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-white transition-colors">Terms & Conditions</Link>
            <Link to="/refund-policy" className="hover:text-white transition-colors">Refund Policy</Link>
            <Link to="/cancellation-policy" className="hover:text-white transition-colors">Cancellation Policy</Link>
            <Link to="/booking-conditions" className="hover:text-white transition-colors">Booking Conditions</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
