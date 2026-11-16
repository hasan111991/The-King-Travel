import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Check, CheckCircle2, Search } from 'lucide-react';
import { SafeImage } from '../components/SafeImage';
import { useAgency } from '../context/AgencyContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { convertMoney, formatMoney } from '../lib/defaultData';
import { db, generateId, handleFirestoreError, OperationType } from '../lib/firebase';
import type { TravelPackageItem } from '../types/travel';

type CategoryFilter = 'all' | 'tour' | 'honeymoon' | 'holiday' | 'hajj_umrah';

export function PackagesPage() {
  const [searchParams] = useSearchParams();
  const { travelPackages, currency } = useAgency();
  const { user, profile } = useAuth();
  const { showToast } = useToast();

  const initialCategory = (searchParams.get('category') as CategoryFilter) || 'all';
  const [category, setCategory] = useState<CategoryFilter>(initialCategory);
  const [queryText, setQueryText] = useState(searchParams.get('q') || '');

  // Quick booking inquiry modal
  const [selectedPkg, setSelectedPkg] = useState<TravelPackageItem | null>(null);
  const [name, setName] = useState(profile?.name || user?.displayName || '');
  const [email, setEmail] = useState(profile?.email || user?.email || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [travelDate, setTravelDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filteredPackages = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    return travelPackages.filter((p) => {
      if (p.status !== 'active') return false;
      if (category !== 'all' && p.category !== category) return false;
      if (
        q &&
        !p.title.toLowerCase().includes(q) &&
        !p.destination.toLowerCase().includes(q) &&
        !p.description.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [travelPackages, category, queryText]);

  const handlePackageInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg) return;
    setSubmitting(true);
    const inquiryId = generateId('inq');
    try {
      await setDoc(doc(db, 'inquiries', inquiryId), {
        inquiryId,
        userId: user?.uid || null,
        bookingId: null,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        subject: `Package Booking Inquiry: ${selectedPkg.title}`,
        message: `Destination: ${selectedPkg.destination} | Duration: ${selectedPkg.duration} | Preferred Date: ${travelDate || 'Flexible'} | Notes: ${notes || 'Requesting itinerary & confirmation.'}`,
        status: 'new',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      showToast('Inquiry Submitted', `Request for ${selectedPkg.title} sent to our travel desk.`, 'success');
      setSelectedPkg(null);
      setNotes('');
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.CREATE, `inquiries/${inquiryId}`);
      } catch {
        showToast('Error', 'Unable to submit package inquiry.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold text-[#FD8F1C] mb-2">Holiday & Tour Packages</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#0F2942]">
            Custom Tour, Holiday & Honeymoon Packages
          </h1>
          <p className="text-sm text-[#486581] mt-3 leading-relaxed">
            Explore curated itineraries across Malaysia, Singapore, Bali, Saudi Arabia, Dubai, Istanbul, Maldives, Switzerland, and Northern Pakistan.
          </p>
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-[#627D98] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Filter by destination..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#D9E2EC] bg-white text-sm text-[#0F2942]"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: 'all', label: 'All Packages' },
            { id: 'tour', label: 'Tour Packages' },
            { id: 'honeymoon', label: 'Honeymoon Packages' },
            { id: 'holiday', label: 'Holiday Escapes' },
            { id: 'hajj_umrah', label: 'Hajj & Umrah' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setCategory(tab.id)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              category === tab.id
                ? 'bg-[#0F2942] text-white'
                : 'bg-white border border-[#D9E2EC] text-[#486581] hover:border-[#FD8F1C]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredPackages.length === 0 ? (
        <div className="bg-white border border-[#D9E2EC] rounded-xl p-10 text-center text-sm text-[#627D98]">
          No travel packages matched your filter. Try clearing your search or contact us for a custom itinerary.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPackages.map((pkg) => (
            <article
              key={pkg.packageId}
              className="bg-white border border-[#D9E2EC] rounded-xl overflow-hidden flex flex-col"
            >
              <div className="aspect-[16/10] w-full bg-[#0F2942] overflow-hidden">
                <SafeImage
                  src={pkg.imageUrl}
                  alt={pkg.title}
                  code={pkg.destination.slice(0, 3).toUpperCase()}
                  city={pkg.destination}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-[#627D98] mb-2">
                    <span className="font-semibold text-[#FD8F1C] capitalize">
                      {pkg.category.replace('_', ' & ')}
                    </span>
                    <span className="font-mono">{pkg.duration}</span>
                  </div>
                  <h2 className="text-lg font-bold text-[#0F2942]">{pkg.title}</h2>
                  <p className="text-sm text-[#486581] mt-2 leading-relaxed">{pkg.description}</p>
                  {pkg.includedServices && pkg.includedServices.length > 0 && (
                    <ul className="mt-4 space-y-1">
                      {pkg.includedServices.slice(0, 4).map((svc) => (
                        <li key={svc} className="text-xs text-[#243B53] flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-[#FD8F1C] shrink-0" /> {svc}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-[#E6ECF2] flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-bold text-[#0F2942] tabular-nums">
                    {pkg.price
                      ? `From ${formatMoney(convertMoney(pkg.price, pkg.currency || 'USD', currency), currency)}`
                      : 'Custom Quote'}
                  </span>
                  <div className="flex items-center gap-2">
                    {pkg.destinationSlug && (
                      <Link
                        to={`/destinations/${pkg.destinationSlug}`}
                        className="px-3 py-2 rounded-lg border border-[#D9E2EC] text-xs font-semibold text-[#0F2942] hover:border-[#FD8F1C]"
                      >
                        Guide
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedPkg(pkg)}
                      className="px-4 py-2 rounded-lg bg-[#FD8F1C] hover:bg-[#E07A0E] text-white text-xs font-bold"
                    >
                      Book / Inquire
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Quick Package Inquiry Modal */}
      {selectedPkg && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#D9E2EC] rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[#FD8F1C]">{selectedPkg.duration}</p>
                <h3 className="text-lg font-bold text-[#0F2942]">{selectedPkg.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPkg(null)}
                className="text-xs text-[#627D98] hover:text-[#0F2942]"
              >
                Close
              </button>
            </div>
            <form onSubmit={handlePackageInquiry} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm"
                />
                <input
                  type="email"
                  required
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="tel"
                  required
                  placeholder="Phone / WhatsApp"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm"
                />
                <input
                  type="date"
                  value={travelDate}
                  onChange={(e) => setTravelDate(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm"
                />
              </div>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Number of travelers, departure city, hotel preferences..."
                className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm"
              />
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPkg(null)}
                  className="px-4 py-2 rounded-lg border border-[#D9E2EC] text-xs font-semibold text-[#486581]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#FD8F1C] hover:bg-[#E07A0E] text-white text-xs font-bold"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {submitting ? 'Sending...' : 'Send Package Inquiry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
